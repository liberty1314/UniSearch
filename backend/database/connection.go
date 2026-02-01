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
// 验证需求：2.1, 12.5
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

	// 构建 MySQL DSN 连接字符串
	// 格式: username:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser,
		dbPassword,
		dbHost,
		dbPort,
		dbName,
	)

	// 配置 GORM 日志
	gormLogger := logger.Default.LogMode(logger.Info)

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
