package main

import (
	"bytes"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"

	"unisearch/config"
	"unisearch/database"
	"unisearch/service"
)

const rotateMasterKeyConfirmation = "rotate-database-master-key"

type rotateMasterKeyFunc func(
	ctx context.Context,
	oldMasterKey string,
	newMasterKey string,
) (service.MasterKeyRotationResult, error)

func run(
	args []string,
	getenv func(string) string,
	stdout io.Writer,
	rotate rotateMasterKeyFunc,
) error {
	flags := flag.NewFlagSet("rotate-master-key", flag.ContinueOnError)
	var parseOutput bytes.Buffer
	flags.SetOutput(&parseOutput)
	flags.Usage = func() {
		fmt.Fprintln(&parseOutput, "用法: unisearch-rotate-master-key -confirm=rotate-database-master-key")
		flags.PrintDefaults()
	}
	confirm := flags.String("confirm", "", "显式确认数据库主密钥轮换")
	if err := flags.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			_, _ = io.Copy(stdout, &parseOutput)
			return flag.ErrHelp
		}
		return errors.New("命令参数无效")
	}
	if flags.NArg() != 0 {
		return errors.New("命令参数无效")
	}
	if *confirm != rotateMasterKeyConfirmation {
		return errors.New("必须显式确认数据库主密钥轮换")
	}

	oldMasterKey := getenv("SECRET_MASTER_KEY")
	if oldMasterKey == "" {
		return errors.New("缺少 SECRET_MASTER_KEY")
	}
	newMasterKey := getenv("NEW_SECRET_MASTER_KEY")
	if newMasterKey == "" {
		return errors.New("缺少 NEW_SECRET_MASTER_KEY")
	}

	result, err := rotate(context.Background(), oldMasterKey, newMasterKey)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(stdout, "主密钥重加密完成，已更新 %d 条密钥记录\n", result.Rotated)
	if err != nil {
		return errors.New("写入主密钥轮换结果失败")
	}
	return nil
}

func executeRotation(
	ctx context.Context,
	oldMasterKey string,
	newMasterKey string,
) (service.MasterKeyRotationResult, error) {
	if err := config.InitWithError(); err != nil {
		return service.MasterKeyRotationResult{}, errors.New("配置初始化失败")
	}
	if config.AppConfig.SecretBackend != string(service.SecretBackendDatabase) {
		return service.MasterKeyRotationResult{}, errors.New("主密钥轮换只支持数据库密钥后端")
	}
	if err := database.InitRuntimeDB(); err != nil {
		return service.MasterKeyRotationResult{}, errors.New("数据库连接失败")
	}
	defer func() { _ = database.CloseDB() }()

	return service.ReencryptDatabaseSecrets(
		ctx,
		silentMasterKeyRotationSession(database.GetDB()),
		oldMasterKey,
		newMasterKey,
	)
}

func silentMasterKeyRotationSession(db *gorm.DB) *gorm.DB {
	if db == nil {
		return nil
	}
	return db.Session(&gorm.Session{
		Logger: db.Logger.LogMode(gormLogger.Silent),
	})
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("警告: 未找到 .env 文件，将使用系统环境变量")
	} else {
		log.Println("成功加载 .env 文件")
	}

	err := run(os.Args[1:], os.Getenv, os.Stdout, executeRotation)
	if errors.Is(err, flag.ErrHelp) {
		return
	}
	if err != nil {
		log.Fatalf("主密钥重加密失败: %v", err)
	}
}
