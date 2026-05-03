package database

import (
	"fmt"
	"log"
	"time"

	"unisearch/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB 全局数据库连接实例
var DB *gorm.DB

// InitDB 初始化数据库连接
// 从环境变量读取数据库配置，构建 MySQL DSN 连接字符串，使用 GORM 连接数据库
// 如果目标数据库不存在则自动创建
func InitDB() error {
	// 从配置中读取数据库参数
	dbHost := config.AppConfig.DBHost
	dbPort := config.AppConfig.DBPort
	dbUser := config.AppConfig.DBUser
	dbPassword := config.AppConfig.DBPassword
	dbName := config.AppConfig.DBName

	// 验证必需的配置参数
	if dbName == "" {
		return fmt.Errorf("数据库名称 (DB_NAME) 未设置，请在 .env 文件中配置")
	}

	// 第一步：先连接 MySQL（不指定数据库名），确保目标数据库存在
	rootDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort,
	)

	rootDB, err := gorm.Open(mysql.Open(rootDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return fmt.Errorf("连接 MySQL 服务器失败: %w", err)
	}

	// 自动创建数据库（如果不存在）
	createSQL := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		dbName,
	)
	if err := rootDB.Exec(createSQL).Error; err != nil {
		return fmt.Errorf("创建数据库 '%s' 失败: %w", dbName, err)
	}
	log.Printf("✓ 数据库 '%s' 已就绪", dbName)

	// 关闭临时连接
	if sqlDB, err := rootDB.DB(); err == nil {
		sqlDB.Close()
	}

	// 第二步：连接到目标数据库
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName,
	)

	// 配置 GORM 日志
	// 说明：系统设置等服务会使用“查不到则创建默认记录”的正常初始化模式，
	// 这类 ErrRecordNotFound 不应在运行日志中表现为错误。
	gormLogger := logger.New(
		log.New(log.Writer(), "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	// 使用 GORM 连接数据库
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		// 禁用外键约束（在迁移时手动创建）
		DisableForeignKeyConstraintWhenMigrating: false,
		// 跳过默认事务（提高性能）
		SkipDefaultTransaction: true,
		// 预编译语句（提高性能）
		PrepareStmt: true,
	})

	if err != nil {
		return fmt.Errorf("连接数据库失败: %w", err)
	}

	// 获取底层的 sql.DB 对象以配置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("获取数据库连接池失败: %w", err)
	}

	// 配置连接池参数
	// SetMaxIdleConns 设置空闲连接池中连接的最大数量
	sqlDB.SetMaxIdleConns(10)

	// SetMaxOpenConns 设置打开数据库连接的最大数量
	sqlDB.SetMaxOpenConns(100)

	// SetConnMaxLifetime 设置连接可复用的最大时间
	sqlDB.SetConnMaxLifetime(time.Hour)

	// SetConnMaxIdleTime 设置连接空闲的最大时间
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	// 测试数据库连接
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("数据库连接测试失败: %w", err)
	}

	// 保存全局数据库连接实例
	DB = db

	log.Printf("✓ 数据库连接成功: %s@%s:%s/%s", dbUser, dbHost, dbPort, dbName)
	return nil
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	if DB == nil {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("获取数据库连接失败: %w", err)
	}

	if err := sqlDB.Close(); err != nil {
		return fmt.Errorf("关闭数据库连接失败: %w", err)
	}

	log.Println("✓ 数据库连接已关闭")
	return nil
}

// GetDB 获取数据库连接实例
func GetDB() *gorm.DB {
	return DB
}

// SetDB 设置数据库连接实例（用于测试）
func SetDB(db *gorm.DB) {
	DB = db
}
