package config

import (
	"os"
	"strconv"
	"time"
)

// 本文件集中 Redis 与 MySQL 数据库相关的环境变量读取函数。

// 从环境变量获取数据库主机地址，如果未设置则使用默认值
func getDBHost() string {
	host := os.Getenv("DB_HOST")
	if host == "" {
		return "localhost" // 默认本地主机
	}
	return host
}

// 从环境变量获取数据库端口，如果未设置则使用默认值
func getDBPort() string {
	port := os.Getenv("DB_PORT")
	if port == "" {
		return "3306" // MySQL 默认端口
	}
	return port
}

// 从环境变量获取数据库用户名，如果未设置则使用默认值
func getDBUser() string {
	user := os.Getenv("DB_USER")
	if user == "" {
		return "root" // 默认用户
	}
	return user
}

// 从环境变量获取数据库密码，如果未设置则使用默认值
func getDBPassword() string {
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		if getAppEnv() == "production" {
			return ""
		}
		return "root" // 默认密码（开发环境）
	}
	return password
}

// 从环境变量获取数据库名称，如果未设置则返回空字符串并打印警告
func getDBName() string {
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		println("警告: DB_NAME 环境变量未设置，数据库功能将不可用")
		println("提示: 请在 .env 文件中设置 DB_NAME 环境变量")
	}
	return dbName
}

// 从环境变量获取 Redis 主机地址，如果未设置则使用默认值
func getRedisHost() string {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		return "localhost" // 默认本地主机
	}
	return host
}

// 从环境变量获取 Redis 端口，如果未设置则使用默认值
func getRedisPort() string {
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		return "6379" // Redis 默认端口
	}
	return port
}

// 从环境变量获取 Redis 密码，如果未设置则返回空字符串（无密码）
func getRedisPassword() string {
	return os.Getenv("REDIS_PASSWORD")
}

// 从环境变量获取 Redis 数据库编号，如果未设置则使用默认值
func getRedisDB() int {
	dbEnv := os.Getenv("REDIS_DB")
	if dbEnv == "" {
		return 0 // 默认使用 DB 0
	}
	db, err := strconv.Atoi(dbEnv)
	if err != nil || db < 0 {
		println("警告: REDIS_DB 值无效，使用默认值 0")
		return 0
	}
	return db
}

// 从环境变量获取 Redis 缓存过期时间（秒），如果未设置则使用默认值
func getRedisTTL() time.Duration {
	ttlEnv := os.Getenv("REDIS_TTL")
	if ttlEnv == "" {
		return 3600 * time.Second // 默认 1 小时（3600 秒）
	}
	ttl, err := strconv.Atoi(ttlEnv)
	if err != nil || ttl <= 0 {
		println("警告: REDIS_TTL 值无效，使用默认值 3600 秒")
		return 3600 * time.Second
	}
	return time.Duration(ttl) * time.Second
}
