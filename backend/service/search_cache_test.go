package service

import (
	"context"
	"sync"
	"testing"
	"time"

	"unisearch/config"
)

type fakeCacheBackend struct {
	getErr     error
	setStarted chan struct{}
	releaseSet chan struct{}
	lastTTL    time.Duration

	mu       sync.Mutex
	setCalls int
}

func (f *fakeCacheBackend) Get(_ context.Context, _ string, _ interface{}) error {
	return f.getErr
}

func (f *fakeCacheBackend) SetWithTTL(_ context.Context, _ string, _ interface{}, ttl time.Duration) error {
	f.mu.Lock()
	f.setCalls++
	f.lastTTL = ttl
	f.mu.Unlock()

	if f.setStarted != nil {
		select {
		case <-f.setStarted:
		default:
			close(f.setStarted)
		}
	}

	if f.releaseSet != nil {
		<-f.releaseSet
	}
	return nil
}

func (f *fakeCacheBackend) Calls() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.setCalls
}

func (f *fakeCacheBackend) TTL() time.Duration {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.lastTTL
}

func TestRedisSearchCacheStoreUsesAsyncWorkers(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{CacheEnabled: true}
	SetGlobalCacheSettingsService(nil)
	defer func() {
		config.AppConfig = oldConfig
	}()

	backend := &fakeCacheBackend{
		setStarted: make(chan struct{}),
		releaseSet: make(chan struct{}),
	}
	searchCache := &redisSearchCache{
		cache:      backend,
		metrics:    newSearchMetricsRecorder(),
		storeQueue: make(chan cacheStoreRequest, 2),
	}
	searchCache.startStoreWorkers(1)

	searchCache.Store("plugin", "k1", "仙逆", []string{"value"})

	select {
	case <-backend.setStarted:
	case <-time.After(time.Second):
		t.Fatal("expected async store worker to process queued write")
	}

	close(backend.releaseSet)
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if backend.Calls() == 1 {
			closeSearchCacheForTest(t, searchCache)
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("expected one cache write, got %d", backend.Calls())
}

func TestRedisSearchCacheStoreDropsWhenQueueFull(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{CacheEnabled: true}
	SetGlobalCacheSettingsService(nil)
	defer func() {
		config.AppConfig = oldConfig
	}()

	backend := &fakeCacheBackend{
		setStarted: make(chan struct{}),
		releaseSet: make(chan struct{}),
	}
	searchCache := &redisSearchCache{
		cache:      backend,
		metrics:    newSearchMetricsRecorder(),
		storeQueue: make(chan cacheStoreRequest, 1),
	}
	searchCache.startStoreWorkers(1)

	searchCache.Store("plugin", "k1", "仙逆", []string{"v1"})
	select {
	case <-backend.setStarted:
	case <-time.After(time.Second):
		t.Fatal("expected first cache write to start")
	}

	searchCache.Store("plugin", "k2", "仙逆", []string{"v2"})
	searchCache.Store("plugin", "k3", "仙逆", []string{"v3"})

	if dropped := searchCache.droppedWriteLogs.Load(); dropped == 0 {
		t.Fatal("expected queue overflow to be recorded")
	}

	close(backend.releaseSet)
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if backend.Calls() == 2 {
			closeSearchCacheForTest(t, searchCache)
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("expected exactly two cache writes after dropping overflow item, got %d", backend.Calls())
}

func TestRedisSearchCacheCloseDrainsQueuedWrites(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{CacheEnabled: true}
	SetGlobalCacheSettingsService(nil)
	defer func() {
		config.AppConfig = oldConfig
	}()

	backend := &fakeCacheBackend{
		setStarted: make(chan struct{}),
		releaseSet: make(chan struct{}),
	}
	searchCache := &redisSearchCache{
		cache:      backend,
		metrics:    newSearchMetricsRecorder(),
		storeQueue: make(chan cacheStoreRequest, 2),
	}
	searchCache.startStoreWorkers(1)

	searchCache.Store("plugin", "k1", "仙逆", []string{"v1"})
	select {
	case <-backend.setStarted:
	case <-time.After(time.Second):
		t.Fatal("期望第一个缓存写入已开始")
	}
	searchCache.Store("plugin", "k2", "仙逆", []string{"v2"})

	closeErr := make(chan error, 1)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		closeErr <- searchCache.Close(ctx)
	}()

	select {
	case err := <-closeErr:
		t.Fatalf("释放写入前不应完成关闭，实际错误：%v", err)
	case <-time.After(50 * time.Millisecond):
	}

	close(backend.releaseSet)

	select {
	case err := <-closeErr:
		if err != nil {
			t.Fatalf("关闭缓存失败：%v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("期望缓存关闭等待队列 drain 后完成")
	}

	if backend.Calls() != 2 {
		t.Fatalf("期望 drain 两次缓存写入，实际为 %d", backend.Calls())
	}
}

func closeSearchCacheForTest(t *testing.T, searchCache *redisSearchCache) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := searchCache.Close(ctx); err != nil {
		t.Fatalf("关闭测试缓存失败：%v", err)
	}
}

func TestRedisSearchCacheStoreUsesRuntimeTTL(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
		SetGlobalCacheSettingsService(nil)
	}()

	config.AppConfig = &config.Config{CacheEnabled: true}
	settingsService := NewSystemSettingsService(newSystemSettingsTestDB(t))
	searchTTL := 5400
	if _, err := settingsService.UpdateCacheSettings(CacheSettingsUpdateInput{
		SearchCacheTTLSeconds: &searchTTL,
	}); err != nil {
		t.Fatalf("update cache settings: %v", err)
	}
	SetGlobalCacheSettingsService(settingsService)

	backend := &fakeCacheBackend{}
	searchCache := &redisSearchCache{
		cache:   backend,
		metrics: newSearchMetricsRecorder(),
	}

	searchCache.Store("plugin", "k1", "仙逆", []string{"value"})

	if backend.TTL() != 90*time.Minute {
		t.Fatalf("expected runtime ttl 90m, got %v", backend.TTL())
	}
}
