package cache

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

type fakeRedisClient struct {
	values      map[string]string
	pingCalls   int
	getCalls    int
	setCalls    int
	delCalls    int
	scanCalls   int
	keysCalls   int
	existsCalls int
	expireCalls int
}

func (f *fakeRedisClient) Ping(context.Context) *redis.StatusCmd {
	f.pingCalls++
	return redis.NewStatusResult("PONG", nil)
}

func (f *fakeRedisClient) Set(_ context.Context, key string, value interface{}, _ time.Duration) *redis.StatusCmd {
	f.setCalls++
	if f.values == nil {
		f.values = make(map[string]string)
	}
	switch typed := value.(type) {
	case []byte:
		f.values[key] = string(typed)
	case string:
		f.values[key] = typed
	default:
		return redis.NewStatusResult("", errors.New("unexpected value type"))
	}
	return redis.NewStatusResult("OK", nil)
}

func (f *fakeRedisClient) Get(_ context.Context, key string) *redis.StringCmd {
	f.getCalls++
	if value, exists := f.values[key]; exists {
		return redis.NewStringResult(value, nil)
	}
	return redis.NewStringResult("", redis.Nil)
}

func (f *fakeRedisClient) Del(_ context.Context, keys ...string) *redis.IntCmd {
	f.delCalls++
	for _, key := range keys {
		delete(f.values, key)
	}
	return redis.NewIntResult(int64(len(keys)), nil)
}

func (f *fakeRedisClient) Keys(_ context.Context, pattern string) *redis.StringSliceCmd {
	f.keysCalls++
	var matched []string
	if pattern == "*" {
		for key := range f.values {
			matched = append(matched, key)
		}
		return redis.NewStringSliceResult(matched, nil)
	}

	for key := range f.values {
		if key == pattern {
			matched = append(matched, key)
		}
	}
	return redis.NewStringSliceResult(matched, nil)
}

func (f *fakeRedisClient) Scan(_ context.Context, _ uint64, pattern string, _ int64) *redis.ScanCmd {
	f.scanCalls++
	var matched []string
	for key := range f.values {
		if redisPatternMatches(pattern, key) {
			matched = append(matched, key)
		}
	}
	return redis.NewScanCmdResult(matched, 0, nil)
}

func (f *fakeRedisClient) Exists(_ context.Context, keys ...string) *redis.IntCmd {
	f.existsCalls++
	var count int64
	for _, key := range keys {
		if _, exists := f.values[key]; exists {
			count++
		}
	}
	return redis.NewIntResult(count, nil)
}

func (f *fakeRedisClient) Expire(_ context.Context, key string, _ time.Duration) *redis.BoolCmd {
	f.expireCalls++
	_, exists := f.values[key]
	return redis.NewBoolResult(exists, nil)
}

func (f *fakeRedisClient) Close() error {
	return nil
}

func TestRedisCacheGetDoesNotRefreshTTL(t *testing.T) {
	client := &fakeRedisClient{
		values: map[string]string{
			"k1": `{"value":"cached"}`,
		},
	}
	cache := &RedisCache{
		client: client,
		ttl:    time.Minute,
	}

	var payload struct {
		Value string `json:"value"`
	}
	if err := cache.Get(context.Background(), "k1", &payload); err != nil {
		t.Fatalf("unexpected get error: %v", err)
	}
	if payload.Value != "cached" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
	if client.getCalls != 1 {
		t.Fatalf("expected exactly one get call, got %d", client.getCalls)
	}
	if client.delCalls != 0 || client.setCalls != 0 {
		t.Fatalf("expected no extra redis commands on cache hit, set=%d del=%d", client.setCalls, client.delCalls)
	}
}

func TestRedisCacheDeleteRemovesKey(t *testing.T) {
	client := &fakeRedisClient{
		values: map[string]string{
			"k1": `{"value":"cached"}`,
		},
	}
	cache := &RedisCache{
		client: client,
		ttl:    time.Minute,
	}

	if err := cache.Delete(context.Background(), "k1"); err != nil {
		t.Fatalf("unexpected delete error: %v", err)
	}
	if client.delCalls != 1 {
		t.Fatalf("expected one delete call, got %d", client.delCalls)
	}
	if _, exists := client.values["k1"]; exists {
		t.Fatal("expected key to be removed")
	}
}

func TestRedisCacheDeleteByPatternUsesScan(t *testing.T) {
	client := &fakeRedisClient{
		values: map[string]string{
			"search:a": `{"value":"a"}`,
			"search:b": `{"value":"b"}`,
			"other":    `{"value":"other"}`,
		},
	}
	cache := &RedisCache{
		client: client,
		ttl:    time.Minute,
	}

	if err := cache.DeleteByPattern(context.Background(), "search:*"); err != nil {
		t.Fatalf("按模式删除缓存失败：%v", err)
	}
	if client.scanCalls == 0 {
		t.Fatal("期望按模式删除使用 SCAN")
	}
	if client.keysCalls != 0 {
		t.Fatalf("按模式删除不应使用 KEYS，实际调用 %d 次", client.keysCalls)
	}
	if _, exists := client.values["search:a"]; exists {
		t.Fatal("期望删除 search:a")
	}
	if _, exists := client.values["search:b"]; exists {
		t.Fatal("期望删除 search:b")
	}
	if _, exists := client.values["other"]; !exists {
		t.Fatal("不应删除不匹配的 key")
	}
}

func redisPatternMatches(pattern string, key string) bool {
	if pattern == "*" {
		return true
	}
	if strings.HasSuffix(pattern, "*") {
		return strings.HasPrefix(key, strings.TrimSuffix(pattern, "*"))
	}
	return pattern == key
}
