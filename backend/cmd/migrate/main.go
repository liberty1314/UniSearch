package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/joho/godotenv"

	"unisearch/config"
	"unisearch/database"
)

func main() {
	dropDeprecated := flag.Bool("drop-deprecated", false, "显式删除已经下线的旧表")
	purgeRemovedPlugins := flag.Bool("purge-removed-plugins", false, "显式清理已下线插件的历史数据")
	migrateRefreshTokenSessions := flag.Bool("migrate-refresh-token-sessions", false, "创建摘要刷新会话表并清空旧原文刷新令牌")
	dropLegacyRefreshTokens := flag.Bool("drop-legacy-refresh-tokens", false, "在旧刷新令牌表为空时显式删除该表")
	flag.Parse()

	if err := godotenv.Load(); err != nil {
		log.Println("警告: 未找到 .env 文件，将使用系统环境变量")
	} else {
		log.Println("成功加载 .env 文件")
	}

	if err := config.InitWithError(); err != nil {
		log.Fatalf("配置初始化失败: %v", err)
	}

	log.Println("正在连接数据库...")
	if err := database.InitMigrationDB(); err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer func() {
		if err := database.CloseDB(); err != nil {
			log.Printf("⚠️  关闭数据库连接失败: %v", err)
		}
	}()

	log.Println("正在执行数据库结构迁移...")
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("数据库结构迁移失败: %v", err)
	}
	if *migrateRefreshTokenSessions {
		log.Println("正在执行刷新会话摘要迁移并清空旧原文记录...")
		if err := database.MigrateRefreshTokenSessions(database.GetDB()); err != nil {
			log.Fatalf("刷新会话摘要迁移失败: %v", err)
		}
	} else {
		log.Println("跳过刷新会话摘要迁移；切换新版本前必须显式追加 -migrate-refresh-token-sessions")
	}
	if *dropLegacyRefreshTokens {
		log.Println("正在显式删除已清空的旧刷新令牌表...")
		if err := database.DropLegacyRefreshTokens(database.GetDB()); err != nil {
			log.Fatalf("删除旧刷新令牌表失败: %v", err)
		}
	} else {
		log.Println("保留空的旧刷新令牌表；验证窗口结束后可追加 -drop-legacy-refresh-tokens")
	}

	log.Println("正在检查首次管理员账户...")
	if err := database.SeedDefaultAdmin(); err != nil {
		log.Fatalf("创建首次管理员失败: %v", err)
	}

	if *dropDeprecated {
		log.Println("正在显式清理废弃表...")
		if err := database.DropDeprecatedTables(); err != nil {
			log.Fatalf("清理废弃表失败: %v", err)
		}
	} else {
		log.Println("跳过废弃表清理；如确认需要删除旧表，请追加 -drop-deprecated")
	}

	if *purgeRemovedPlugins {
		log.Printf("正在显式清理已下线插件历史数据: %v", database.RemovedPluginNames())
		result, err := database.PurgeRemovedPluginData(database.GetDB())
		if err != nil {
			log.Fatalf("清理已下线插件历史数据失败: %v", err)
		}
		log.Printf(
			"已下线插件历史数据清理完成: states=%d health=%d runtime_configs=%d metrics=%d error_logs=%d total=%d",
			result.PluginStatesDeleted,
			result.PluginHealthStatusesDeleted,
			result.PluginRuntimeConfigsDeleted,
			result.PluginPerformanceMetricsDeleted,
			result.PluginErrorLogsDeleted,
			result.TotalDeleted(),
		)
	} else {
		log.Println("跳过已下线插件数据清理；如确认需要删除历史数据，请追加 -purge-removed-plugins")
	}

	fmt.Println("数据库迁移完成")
}
