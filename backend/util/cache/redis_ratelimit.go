package cache

import (
	"context"
	"fmt"
	"time"
)

// fixedWindowScript 原子固定窗口计数：INCR 后若为首次则设置过期时间。
// 返回当前计数值与 key 剩余 TTL（毫秒，-1 表示无过期）。
const fixedWindowScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
	redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`

// AllowFixedWindow 基于 Redis 固定窗口的原子计数限流。
// 在窗口内对 key 计数，未超过 limit 返回 allowed=true；超过返回 false 与剩余重试时间。
// INCR + PEXPIRE 通过 Lua 脚本保证原子，避免出现无过期时间的泄漏 key。
func (rc *RedisCache) AllowFixedWindow(ctx context.Context, key string, limit int, window time.Duration) (bool, time.Duration, error) {
	if rc == nil || rc.client == nil {
		return false, 0, fmt.Errorf("Redis 客户端未初始化")
	}
	if key == "" {
		return false, 0, fmt.Errorf("限流键不能为空")
	}
	if limit <= 0 || window <= 0 {
		return true, 0, nil
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	res, err := rc.client.Eval(ctx, fixedWindowScript, []string{key}, window.Milliseconds()).Result()
	if err != nil {
		return false, 0, fmt.Errorf("Redis 限流计数失败: %w", err)
	}

	values, ok := res.([]interface{})
	if !ok || len(values) < 2 {
		return false, 0, fmt.Errorf("Redis 限流返回格式异常")
	}

	current, _ := values[0].(int64)
	ttlMillis, _ := values[1].(int64)

	if current > int64(limit) {
		retryAfter := time.Duration(0)
		if ttlMillis > 0 {
			retryAfter = time.Duration(ttlMillis) * time.Millisecond
		}
		return false, retryAfter, nil
	}
	return true, 0, nil
}

// IncrCounter 原子自增指定 key，首次自增时设置窗口过期时间，返回自增后的当前值。
// 用于全站注册总量统计等场景。
func (rc *RedisCache) IncrCounter(ctx context.Context, key string, window time.Duration) (int64, error) {
	if rc == nil || rc.client == nil {
		return 0, fmt.Errorf("Redis 客户端未初始化")
	}
	if key == "" {
		return 0, fmt.Errorf("计数键不能为空")
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	res, err := rc.client.Eval(ctx, fixedWindowScript, []string{key}, window.Milliseconds()).Result()
	if err != nil {
		return 0, fmt.Errorf("Redis 计数失败: %w", err)
	}
	values, ok := res.([]interface{})
	if !ok || len(values) < 1 {
		return 0, fmt.Errorf("Redis 计数返回格式异常")
	}
	current, _ := values[0].(int64)
	return current, nil
}

// SetRawWithTTL 写入原始字符串值并设置 TTL（ttl<=0 表示永久，不过期）。
func (rc *RedisCache) SetRawWithTTL(ctx context.Context, key, value string, ttl time.Duration) error {
	if rc == nil || rc.client == nil {
		return fmt.Errorf("Redis 客户端未初始化")
	}
	if key == "" {
		return fmt.Errorf("缓存键不能为空")
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if ttl < 0 {
		ttl = 0
	}
	if err := rc.client.Set(ctx, key, value, ttl).Err(); err != nil {
		return fmt.Errorf("Redis 写入失败: %w", err)
	}
	return nil
}

// KeyExists 检查 key 是否存在。
func (rc *RedisCache) KeyExists(ctx context.Context, key string) (bool, error) {
	return rc.Exists(ctx, key)
}

// DeleteKey 删除指定 key。
func (rc *RedisCache) DeleteKey(ctx context.Context, key string) error {
	return rc.Delete(ctx, key)
}

// Healthy 快速探测 Redis 是否可用（用于降级判断）。
func (rc *RedisCache) Healthy(ctx context.Context) bool {
	if rc == nil || rc.client == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return rc.client.Ping(ctx).Err() == nil
}
