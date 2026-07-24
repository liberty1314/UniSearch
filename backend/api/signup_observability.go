package api

import (
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// 注册防刷可观测性（M6）：在无外部 metrics 体系时，用进程内原子计数器
// 累计各维度的拦截情况，并按节流频率输出汇总日志，便于阈值调优与攻击发现。

var (
	signupAttemptTotal atomic.Int64            // 进入注册限流中间件的请求总数
	signupSuccessTotal atomic.Int64            // 注册成功总数
	signupBlockedTotal sync.Map                // reason -> *atomic.Int64
	signupBlockedNames = []string{             // 已知拦截维度，便于稳定输出
		"ip_min", "ip_hour", "ip_username", "autoban", "banned", "global", "captcha",
	}
)

func signupBlockedCounter(reason string) *atomic.Int64 {
	if v, ok := signupBlockedTotal.Load(reason); ok {
		return v.(*atomic.Int64)
	}
	counter := &atomic.Int64{}
	actual, _ := signupBlockedTotal.LoadOrStore(reason, counter)
	return actual.(*atomic.Int64)
}

// recordSignupAttempt 记一次注册尝试。
func recordSignupAttempt() {
	signupAttemptTotal.Add(1)
}

// recordSignupSuccess 记一次注册成功。
func recordSignupSuccess() {
	signupSuccessTotal.Add(1)
}

// recordSignupBlocked 记一次被拦截，reason 为拦截维度。
// 同时输出一条即时日志，便于在攻击发生时定位来源与维度。
func recordSignupBlocked(reason string) {
	signupBlockedCounter(reason).Add(1)
}

// SignupMetricsSnapshot 返回当前累计指标，供后台/健康检查读取。
func SignupMetricsSnapshot() map[string]int64 {
	snapshot := map[string]int64{
		"signup_attempt_total": signupAttemptTotal.Load(),
		"signup_success_total": signupSuccessTotal.Load(),
	}
	for _, name := range signupBlockedNames {
		snapshot["signup_blocked_"+name] = signupBlockedCounter(name).Load()
	}
	// 补充动态出现、不在预置清单中的维度。
	signupBlockedTotal.Range(func(key, value any) bool {
		name := key.(string)
		metricKey := "signup_blocked_" + name
		if _, exists := snapshot[metricKey]; !exists {
			snapshot[metricKey] = value.(*atomic.Int64).Load()
		}
		return true
	})
	return snapshot
}

// StartSignupMetricsReporter 启动周期性汇总日志。interval<=0 时用默认 5 分钟。
// 仅在有拦截发生时输出，避免正常时段刷屏。返回停止函数。
func StartSignupMetricsReporter(interval time.Duration) (stop func()) {
	if interval <= 0 {
		interval = 5 * time.Minute
	}
	ticker := time.NewTicker(interval)
	done := make(chan struct{})
	var lastBlockedSum int64

	go func() {
		for {
			select {
			case <-ticker.C:
				snapshot := SignupMetricsSnapshot()
				var blockedSum int64
				for name, v := range snapshot {
					if name == "signup_attempt_total" || name == "signup_success_total" {
						continue
					}
					blockedSum += v
				}
				// 仅在累计拦截数较上次有增长时输出，避免无攻击时段刷屏。
				if blockedSum > lastBlockedSum {
					log.Printf("注册防刷统计: 尝试=%d 成功=%d 拦截明细=%v",
						snapshot["signup_attempt_total"], snapshot["signup_success_total"], blockedDetail(snapshot))
					lastBlockedSum = blockedSum
				}
			case <-done:
				ticker.Stop()
				return
			}
		}
	}()

	return func() { close(done) }
}

func blockedDetail(snapshot map[string]int64) map[string]int64 {
	detail := make(map[string]int64)
	for name, v := range snapshot {
		if v > 0 && name != "signup_attempt_total" && name != "signup_success_total" {
			detail[name] = v
		}
	}
	return detail
}
