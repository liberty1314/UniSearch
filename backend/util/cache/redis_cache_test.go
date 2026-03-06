package cache

import (
	"context"
	"errors"
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
