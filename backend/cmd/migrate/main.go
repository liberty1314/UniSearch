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
	if err := database.InitDB(); err != nil {
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

	log.Println("正在检查默认管理员账户...")
	if err := database.SeedDefaultAdmin(); err != nil {
		log.Fatalf("创建默认管理员失败: %v", err)
	}

	if *dropDeprecated {
		log.Println("正在显式清理废弃表...")
		if err := database.DropDeprecatedTables(); err != nil {
			log.Fatalf("清理废弃表失败: %v", err)
		}
	} else {
		log.Println("跳过废弃表清理；如确认需要删除旧表，请追加 -drop-deprecated")
	}

	fmt.Println("数据库迁移完成")
}
