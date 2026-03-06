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

	mu       sync.Mutex
	setCalls int
}

func (f *fakeCacheBackend) Get(_ context.Context, _ string, _ interface{}) error {
	return f.getErr
}

func (f *fakeCacheBackend) Set(_ context.Context, _ string, _ interface{}) error {
	f.mu.Lock()
	f.setCalls++
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

func TestRedisSearchCacheStoreUsesAsyncWorkers(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{CacheEnabled: true}
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
	go searchCache.storeWorker()

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
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("expected one cache write, got %d", backend.Calls())
}

func TestRedisSearchCacheStoreDropsWhenQueueFull(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{CacheEnabled: true}
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
	go searchCache.storeWorker()

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
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("expected exactly two cache writes after dropping overflow item, got %d", backend.Calls())
}
