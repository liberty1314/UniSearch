package database

import (
	"fmt"
	"log"
	"regexp"
	"time"

	"unisearch/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB 全局数据库连接实例
var DB *gorm.DB

var databaseNamePattern = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

// InitRuntimeDB 仅连接已经存在的目标数据库，不执行建库或结构迁移。
func InitRuntimeDB() error {
	if err := validateDatabaseName(config.AppConfig.DBName); err != nil {
		return err
	}
	return openTargetDatabase()
}

// InitMigrationDB 为独立迁移命令创建目标数据库并建立迁移连接。
func InitMigrationDB() error {
	if err := validateDatabaseName(config.AppConfig.DBName); err != nil {
		return err
	}
	if err := ensureTargetDatabase(); err != nil {
		return err
	}
	return openTargetDatabase()
}

func validateDatabaseName(name string) error {
	if !databaseNamePattern.MatchString(name) {
		return fmt.Errorf("数据库名称 (DB_NAME) 只能包含字母、数字和下划线")
	}
	return nil
}

func ensureTargetDatabase() error {
	cfg := config.AppConfig
	serverDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort,
	)
	serverDB, err := gorm.Open(mysql.Open(serverDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return fmt.Errorf("连接 MySQL 服务器失败: %w", err)
	}
	if sqlDB, dbErr := serverDB.DB(); dbErr == nil {
		defer func() { _ = sqlDB.Close() }()
	}

	createSQL := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		cfg.DBName,
	)
	if err := serverDB.Exec(createSQL).Error; err != nil {
		return fmt.Errorf("创建数据库 '%s' 失败: %w", cfg.DBName, err)
	}
	log.Printf("✓ 数据库 '%s' 已就绪", cfg.DBName)
	return nil
}

func openTargetDatabase() error {
	cfg := config.AppConfig
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName,
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
		_ = sqlDB.Close()
		return fmt.Errorf("数据库连接测试失败: %w", err)
	}

	// 保存全局数据库连接实例
	DB = db

	log.Printf("✓ 数据库连接成功: %s@%s:%s/%s", cfg.DBUser, cfg.DBHost, cfg.DBPort, cfg.DBName)
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
