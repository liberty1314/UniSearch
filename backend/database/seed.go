package database

import (
	"log"
	"unisearch/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedDefaultAdmin 创建默认管理员账户
// 检查是否存在 role='admin' 的用户
// 如果不存在，创建默认管理员（username='admin', password='admin'）
// 使用 bcrypt 加密密码（cost=10）
// 在控制台输出提示信息
// 验证需求：2.3, 2.4, 2.5
func SeedDefaultAdmin() error {
	log.Println("检查默认管理员账户...")

	// 检查是否存在 role='admin' 的用户
	var adminCount int64
	err := DB.Model(&model.User{}).Where("role = ?", "admin").Count(&adminCount).Error
	if err != nil {
		log.Printf("✗ 查询管理员账户失败: %v", err)
		return err
	}

	// 如果已存在管理员账户，跳过创建
	if adminCount > 0 {
		log.Printf("✓ 管理员账户已存在（共 %d 个），跳过创建", adminCount)
		return nil
	}

	// 不存在管理员账户，创建默认管理员
	log.Println("未找到管理员账户，开始创建默认管理员...")

	// 使用 bcrypt 加密密码（cost=10）
	defaultPassword := "admin"
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), 10)
	if err != nil {
		log.Printf("✗ 密码加密失败: %v", err)
		return err
	}

	// 创建默认管理员用户
	defaultAdmin := &model.User{
		Username:     "admin",
		PasswordHash: string(passwordHash),
		Role:         "admin",
	}

	// 插入数据库
	err = DB.Create(defaultAdmin).Error
	if err != nil {
		// 检查是否是唯一性约束冲突（可能在并发情况下发生）
		if err == gorm.ErrDuplicatedKey {
			log.Println("✓ 管理员账户已存在（并发创建），跳过")
			return nil
		}
		log.Printf("✗ 创建默认管理员失败: %v", err)
		return err
	}

	// 在控制台输出提示信息
	log.Println("✓ 默认管理员账户创建成功")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("  默认管理员账户: admin/admin")
	log.Println("  ⚠️  请在生产环境中立即修改默认密码！")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	return nil
}
