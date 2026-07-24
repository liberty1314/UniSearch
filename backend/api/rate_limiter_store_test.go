package api

import (
	"context"
	"testing"
	"time"
)

func TestMemoryRateLimiterStoreAllowWithinLimit(t *testing.T) {
	store := newMemoryRateLimiterStore()
	ctx := context.Background()

	// limit=3，同一 key 前 3 次放行，第 4 次拒绝。
	for i := 0; i < 3; i++ {
		allowed, _ := store.Allow(ctx, "ip:1.1.1.1", 3, time.Minute)
		if !allowed {
			t.Fatalf("第 %d 次请求应放行", i+1)
		}
	}
	allowed, retryAfter := store.Allow(ctx, "ip:1.1.1.1", 3, time.Minute)
	if allowed {
		t.Fatal("超过 limit 后应拒绝")
	}
	if retryAfter <= 0 {
		t.Fatal("被限流时应返回正的 retryAfter")
	}
}

func TestMemoryRateLimiterStoreIsolatesKeys(t *testing.T) {
	store := newMemoryRateLimiterStore()
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		store.Allow(ctx, "ip:1.1.1.1", 3, time.Minute)
	}
	// 不同 key 独立计数，不受前一个 key 超限影响。
	if allowed, _ := store.Allow(ctx, "ip:2.2.2.2", 3, time.Minute); !allowed {
		t.Fatal("不同 key 应独立计数")
	}
}

func TestMemoryRateLimiterStoreSeparateWindows(t *testing.T) {
	store := newMemoryRateLimiterStore()
	ctx := context.Background()

	// 相同 key、相同 limit 但不同 window 应使用各自独立的计数桶。
	store.Allow(ctx, "ip:1.1.1.1", 1, time.Minute)
	if allowed, _ := store.Allow(ctx, "ip:1.1.1.1", 1, time.Hour); !allowed {
		t.Fatal("不同 window 应使用独立计数桶")
	}
}

func TestMemoryRateLimiterStoreZeroLimitAllows(t *testing.T) {
	store := newMemoryRateLimiterStore()
	// limit<=0 表示不限流，恒放行。
	if allowed, _ := store.Allow(context.Background(), "ip:1.1.1.1", 0, time.Minute); !allowed {
		t.Fatal("limit<=0 应恒放行")
	}
}
