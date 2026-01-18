package database

// 这是一个手动测试文件，用于验证数据库迁移功能
// 使用方法：
// 1. 确保 MySQL 服务正在运行
// 2. 配置 .env 文件中的数据库连接信息
// 3. 在 backend 目录下运行：go run database/migration_test_manual.go
//
// 注意：这个文件仅用于开发测试，完成验证后应该删除

/*
package main

import (
	"log"
	"pansou/config"
	"pansou/database"

	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("警告: 未找到 .env 文件")
	}

	// 初始化配置
	config.Init()

	// 连接数据库
	log.Println("正在连接数据库...")
	if err := database.InitDB(); err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	// 执行迁移
	log.Println("正在执行数据库迁移...")
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	log.Println("✓ 数据库迁移测试完成！")
	log.Println("请检查数据库中是否已创建 users 和 api_keys 表")

	// 关闭数据库连接
	if err := database.CloseDB(); err != nil {
		log.Printf("关闭数据库连接失败: %v", err)
	}
}
*/
