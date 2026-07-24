package api

import (
	"context"
	"testing"
)

// TestSignupCircuitBreakerDisabled 阈值<=0 时熔断关闭，永不打开。
func TestSignupCircuitBreakerDisabled(t *testing.T) {
	InitSignupCircuitBreaker(0, 10, nil)
	ctx := context.Background()

	for i := 0; i < 100; i++ {
		signupBreaker.recordSuccess(ctx)
	}
	if signupBreaker.isOpen(ctx) {
		t.Fatal("熔断关闭时不应进入熔断态")
	}
}

// TestSignupCircuitBreakerOpensAfterThreshold 内存降级路径：累计成功超过阈值后进入熔断态。
func TestSignupCircuitBreakerOpensAfterThreshold(t *testing.T) {
	// redisCache 传 nil，走内存计数分支。
	InitSignupCircuitBreaker(3, 10, nil)
	ctx := context.Background()

	if signupBreaker.isOpen(ctx) {
		t.Fatal("初始不应处于熔断态")
	}

	// 前 3 次成功不触发（count>limit 才触发，即第 4 次）。
	for i := 0; i < 3; i++ {
		signupBreaker.recordSuccess(ctx)
		if signupBreaker.isOpen(ctx) {
			t.Fatalf("第 %d 次成功不应触发熔断（阈值 3）", i+1)
		}
	}

	// 第 4 次成功使计数超过阈值，进入熔断态。
	signupBreaker.recordSuccess(ctx)
	if !signupBreaker.isOpen(ctx) {
		t.Fatal("累计成功超过阈值后应进入熔断态")
	}
}

// TestSignupMetricsSnapshot 校验拦截计数在快照中正确累计。
func TestSignupMetricsSnapshot(t *testing.T) {
	before := SignupMetricsSnapshot()["signup_blocked_global"]
	recordSignupBlocked("global")
	after := SignupMetricsSnapshot()["signup_blocked_global"]
	if after != before+1 {
		t.Fatalf("signup_blocked_global 应从 %d 增到 %d，实际 %d", before, before+1, after)
	}
}
