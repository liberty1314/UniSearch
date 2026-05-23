package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// 错误定义
var (
	// ErrCacheMiss 缓存未命中错误
	ErrCacheMiss = errors.New("缓存未命中")
)

// RedisCache Redis 缓存客户端
type RedisCache struct {
	client redisClient
	ttl    time.Duration
}

type redisClient interface {
	Ping(ctx context.Context) *redis.StatusCmd
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd
	Get(ctx context.Context, key string) *redis.StringCmd
	Del(ctx context.Context, keys ...string) *redis.IntCmd
	Exists(ctx context.Context, keys ...string) *redis.IntCmd
	Expire(ctx context.Context, key string, expiration time.Duration) *redis.BoolCmd
	Close() error
}

// Config Redis 配置
type Config struct {
	Host     string        // Redis 主机地址
	Port     int           // Redis 端口
	Password string        // Redis 密码（可选）
	DB       int           // Redis 数据库编号
	TTL      time.Duration // 缓存过期时间
}

// NewRedisCache 创建 Redis 缓存实例
// 建立到 Redis 的连接，并验证连接是否成功
func NewRedisCache(cfg Config) (*RedisCache, error) {
	// 验证配置参数
	if cfg.Host == "" {
		return nil, fmt.Errorf("Redis 主机地址不能为空")
	}
	if cfg.Port <= 0 || cfg.Port > 65535 {
		return nil, fmt.Errorf("Redis 端口号无效: %d", cfg.Port)
	}
	if cfg.TTL <= 0 {
		return nil, fmt.Errorf("TTL 必须大于 0")
	}

	// 构建 Redis 地址
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)

	// 创建 Redis 客户端
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     cfg.Password,
		DB:           cfg.DB,
		DialTimeout:  5 * time.Second, // 连接超时
		ReadTimeout:  5 * time.Second, // 读取超时
		WriteTimeout: 5 * time.Second, // 写入超时
		PoolSize:     10,              // 连接池大小
		MinIdleConns: 2,               // 最小空闲连接数
	})

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("错误: Redis 连接失败 - 地址: %s, 错误: %v", addr, err)
		return nil, fmt.Errorf("Redis 连接失败: %w", err)
	}

	log.Printf("成功: Redis 连接已建立 - 地址: %s, 数据库: %d", addr, cfg.DB)

	return &RedisCache{
		client: client,
		ttl:    cfg.TTL,
	}, nil
}

// Close 优雅关闭 Redis 连接
// 释放所有连接池资源
func (rc *RedisCache) Close() error {
	if rc.client == nil {
		return nil
	}

	if err := rc.client.Close(); err != nil {
		log.Printf("警告: Redis 连接关闭失败: %v", err)
		return fmt.Errorf("关闭 Redis 连接失败: %w", err)
	}

	log.Println("信息: Redis 连接已关闭")
	return nil
}

// Set 设置缓存
// 将数据序列化为 JSON 并存储到 Redis，设置 TTL 为配置的过期时间
// 参数:
//   - ctx: 上下文，用于超时控制
//   - key: 缓存键
//   - value: 要缓存的数据（将被序列化为 JSON）
//
// 返回:
//   - error: 如果序列化失败或 Redis 操作失败，返回错误
func (rc *RedisCache) Set(ctx context.Context, key string, value interface{}) error {
	return rc.SetWithTTL(ctx, key, value, rc.ttl)
}

// SetWithTTL 设置带自定义 TTL 的缓存内容。
func (rc *RedisCache) SetWithTTL(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	// 验证参数
	if key == "" {
		return fmt.Errorf("缓存键不能为空")
	}
	if value == nil {
		return fmt.Errorf("缓存值不能为 nil")
	}
	if ttl <= 0 {
		ttl = rc.ttl
	}

	// 添加超时控制（5 秒）
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 序列化数据为 JSON
	data, err := json.Marshal(value)
	if err != nil {
		log.Printf("错误: JSON 序列化失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("序列化失败: %w", err)
	}

	// 写入 Redis，设置 TTL
	err = rc.client.Set(ctx, key, data, ttl).Err()
	if err != nil {
		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("警告: Redis 操作超时 - 键: %s", key)
			return fmt.Errorf("Redis 操作超时: %w", ctx.Err())
		}
		log.Printf("错误: Redis 写入失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("Redis 写入失败: %w", err)
	}

	log.Printf("调试: 缓存写入成功 - 键: %s, TTL: %v", key, ttl)
	return nil
}

// Get 获取缓存
// 从 Redis 读取数据并反序列化为目标类型
// 读取成功后自动刷新缓存的 TTL，实现热数据保活机制
// 参数:
//   - ctx: 上下文，用于超时控制
//   - key: 缓存键
//   - dest: 目标对象指针，用于接收反序列化后的数据
//
// 返回:
//   - error: 如果缓存未命中返回 ErrCacheMiss，如果反序列化失败或 Redis 操作失败返回相应错误
func (rc *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	// 验证参数
	if key == "" {
		return fmt.Errorf("缓存键不能为空")
	}
	if dest == nil {
		return fmt.Errorf("目标对象不能为 nil")
	}

	// 添加超时控制（5 秒）
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 从 Redis 读取数据
	data, err := rc.client.Get(ctx, key).Bytes()
	if err != nil {
		// 检查是否是缓存未命中
		if err == redis.Nil {
			log.Printf("调试: 缓存未命中 - 键: %s", key)
			return ErrCacheMiss
		}

		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("警告: Redis 操作超时 - 键: %s", key)
			return fmt.Errorf("Redis 操作超时: %w", ctx.Err())
		}

		log.Printf("错误: Redis 读取失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("Redis 读取失败: %w", err)
	}

	// 反序列化 JSON 数据
	err = json.Unmarshal(data, dest)
	if err != nil {
		log.Printf("错误: JSON 反序列化失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("反序列化失败: %w", err)
	}

	log.Printf("调试: 缓存读取成功 - 键: %s", key)
	return nil
}

// Delete 删除缓存
// 从 Redis 中删除指定的缓存键
// 参数:
//   - ctx: 上下文，用于超时控制
//   - key: 要删除的缓存键
//
// 返回:
//   - error: 如果 Redis 操作失败，返回错误
func (rc *RedisCache) Delete(ctx context.Context, key string) error {
	// 验证参数
	if key == "" {
		return fmt.Errorf("缓存键不能为空")
	}

	// 添加超时控制（5 秒）
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 从 Redis 删除键
	err := rc.client.Del(ctx, key).Err()
	if err != nil {
		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("警告: Redis 操作超时 - 键: %s", key)
			return fmt.Errorf("Redis 操作超时: %w", ctx.Err())
		}

		log.Printf("错误: Redis 删除失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("Redis 删除失败: %w", err)
	}

	log.Printf("调试: 缓存删除成功 - 键: %s", key)
	return nil
}

// Exists 检查缓存是否存在
// 检查指定的缓存键是否存在于 Redis 中
// 参数:
//   - ctx: 上下文，用于超时控制
//   - key: 要检查的缓存键
//
// 返回:
//   - bool: 如果键存在返回 true，否则返回 false
//   - error: 如果 Redis 操作失败，返回错误
func (rc *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
	// 验证参数
	if key == "" {
		return false, fmt.Errorf("缓存键不能为空")
	}

	// 添加超时控制（5 秒）
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 检查键是否存在
	count, err := rc.client.Exists(ctx, key).Result()
	if err != nil {
		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("警告: Redis 操作超时 - 键: %s", key)
			return false, fmt.Errorf("Redis 操作超时: %w", ctx.Err())
		}

		log.Printf("错误: Redis 检查失败 - 键: %s, 错误: %v", key, err)
		return false, fmt.Errorf("Redis 检查失败: %w", err)
	}

	exists := count > 0
	log.Printf("调试: 缓存检查完成 - 键: %s, 存在: %v", key, exists)
	return exists, nil
}

// RefreshTTL 刷新缓存的过期时间
// 将指定缓存键的 TTL 重置为配置的过期时间
// 参数:
//   - ctx: 上下文，用于超时控制
//   - key: 要刷新的缓存键
//
// 返回:
//   - error: 如果 Redis 操作失败，返回错误
func (rc *RedisCache) RefreshTTL(ctx context.Context, key string) error {
	// 验证参数
	if key == "" {
		return fmt.Errorf("缓存键不能为空")
	}

	// 添加超时控制（5 秒）
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 刷新 TTL
	err := rc.client.Expire(ctx, key, rc.ttl).Err()
	if err != nil {
		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("警告: Redis 操作超时 - 键: %s", key)
			return fmt.Errorf("Redis 操作超时: %w", ctx.Err())
		}

		log.Printf("错误: Redis TTL 刷新失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("Redis TTL 刷新失败: %w", err)
	}

	log.Printf("🔄 缓存 TTL 已刷新 - 键: %s, 新TTL: %v", key, rc.ttl)
	return nil
}

// GetAndRefresh 获取缓存并同步刷新 TTL
// 从 Redis 读取数据，反序列化，并同步刷新缓存的 TTL
// 与 Get 方法的区别：此方法会同步等待 TTL 刷新完成
// 参数:
//   - ctx: 上下文，用于超时控制
//   - key: 缓存键
//   - dest: 目标对象指针，用于接收反序列化后的数据
//
// 返回:
//   - error: 如果缓存未命中返回 ErrCacheMiss，如果反序列化失败或 Redis 操作失败返回相应错误
func (rc *RedisCache) GetAndRefresh(ctx context.Context, key string, dest interface{}) error {
	// 验证参数
	if key == "" {
		return fmt.Errorf("缓存键不能为空")
	}
	if dest == nil {
		return fmt.Errorf("目标对象不能为 nil")
	}

	// 添加超时控制（5 秒）
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 从 Redis 读取数据
	data, err := rc.client.Get(ctx, key).Bytes()
	if err != nil {
		// 检查是否是缓存未命中
		if err == redis.Nil {
			log.Printf("调试: 缓存未命中 - 键: %s", key)
			return ErrCacheMiss
		}

		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("警告: Redis 操作超时 - 键: %s", key)
			return fmt.Errorf("Redis 操作超时: %w", ctx.Err())
		}

		log.Printf("错误: Redis 读取失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("Redis 读取失败: %w", err)
	}

	// 反序列化 JSON 数据
	err = json.Unmarshal(data, dest)
	if err != nil {
		log.Printf("错误: JSON 反序列化失败 - 键: %s, 错误: %v", key, err)
		return fmt.Errorf("反序列化失败: %w", err)
	}

	// 同步刷新缓存 TTL
	if err := rc.client.Expire(ctx, key, rc.ttl).Err(); err != nil {
		log.Printf("警告: 缓存 TTL 刷新失败 - 键: %s, 错误: %v", key, err)
		// TTL 刷新失败不影响数据读取，只记录警告
	} else {
		log.Printf("🔄 缓存 TTL 已刷新 - 键: %s, 新TTL: %v", key, rc.ttl)
	}

	log.Printf("调试: 缓存读取成功 - 键: %s", key)
	return nil
}
