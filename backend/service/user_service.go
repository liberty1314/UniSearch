package service

import (
	"errors"
	"fmt"
	"regexp"

	"unisearch/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserService 用户服务
type UserService struct {
	db *gorm.DB
}

// NewUserService 创建用户服务实例
func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// UserListResult 用户列表查询结果
type UserListResult struct {
	Users      []model.User `json:"users"`
	Total      int64        `json:"total"`
	Page       int          `json:"page"`
	PageSize   int          `json:"page_size"`
	TotalPages int          `json:"total_pages"`
}

// BatchOperationResult 批量操作结果
type BatchOperationResult struct {
	SuccessCount int                   `json:"success_count"`
	FailedCount  int                   `json:"failed_count"`
	Success      []uint                `json:"success"`
	Failed       []BatchOperationError `json:"failed"`
}

// BatchOperationError 批量操作错误
type BatchOperationError struct {
	ID    uint   `json:"id"`
	Error string `json:"error"`
}

// ListUsers 获取用户列表（支持分页、搜索、筛选）
func (s *UserService) ListUsers(page, pageSize int, keyword, role string) (*UserListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := s.db.Model(&model.User{})

	// 关键词搜索（用户名模糊匹配）
	if keyword != "" {
		query = query.Where("username LIKE ?", "%"+keyword+"%")
	}

	// 角色筛选
	if role != "" && (role == "admin" || role == "user") {
		query = query.Where("role = ?", role)
	}

	// 统计总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("统计用户总数失败: %w", err)
	}

	// 计算总页数
	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

	// 分页查询
	var users []model.User
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("查询用户列表失败: %w", err)
	}

	return &UserListResult{
		Users:      users,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// GetUserByID 根据ID获取用户
func (s *UserService) GetUserByID(userID uint) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, fmt.Errorf("查询用户失败: %w", err)
	}
	return &user, nil
}

// validateUsername 验证用户名
func (s *UserService) validateUsername(username string) error {
	// 验证长度
	if len(username) < 3 || len(username) > 32 {
		return errors.New("用户名长度必须在3-32字符之间")
	}

	// 验证字符（只允许字母、数字、下划线、连字符）
	validPattern := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !validPattern.MatchString(username) {
		return errors.New("用户名只能包含字母、数字、下划线和连字符")
	}

	return nil
}

// validatePassword 验证密码
func (s *UserService) validatePassword(password string) error {
	if len(password) < 6 || len(password) > 64 {
		return errors.New("密码长度必须在6-64字符之间")
	}
	return nil
}

// validateRole 验证角色
func (s *UserService) validateRole(role string) error {
	if role != "admin" && role != "user" {
		return errors.New("角色必须是admin或user")
	}
	return nil
}

// CreateUser 创建用户
func (s *UserService) CreateUser(username, password, role string) (*model.User, error) {
	// 验证用户名
	if err := s.validateUsername(username); err != nil {
		return nil, err
	}

	// 验证用户名唯一性
	var existingUser model.User
	if err := s.db.Where("username = ?", username).First(&existingUser).Error; err == nil {
		return nil, errors.New("用户名已存在")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("检查用户名唯一性失败: %w", err)
	}

	// 验证密码
	if err := s.validatePassword(password); err != nil {
		return nil, err
	}

	// 验证角色
	if err := s.validateRole(role); err != nil {
		return nil, err
	}

	// 加密密码
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("密码加密失败: %w", err)
	}

	// 创建用户
	user := &model.User{
		Username:     username,
		PasswordHash: string(passwordHash),
		Role:         role,
		IsEnabled:    true,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}

	// 如果是管理员，自动创建永久 Key
	if role == "admin" {
		apiKeyService := NewAPIKeyService()
		description := fmt.Sprintf("管理员永久密钥 (User: %s)", username)
		_, err := apiKeyService.CreatePermanentAPIKey(user.ID, description)
		if err != nil {
			// 记录错误但不影响用户创建
			fmt.Printf("⚠️  为管理员创建永久 Key 失败: %v\n", err)
		}
	}

	return user, nil
}

// UpdateUser 更新用户信息
func (s *UserService) UpdateUser(userID uint, username, role string, currentUserID uint) (*model.User, error) {
	// 检查是否尝试修改当前用户的角色
	if userID == currentUserID {
		return nil, errors.New("不能修改自己的角色")
	}

	// 获取用户
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	// 记录原角色
	oldRole := user.Role

	// 验证用户名
	if err := s.validateUsername(username); err != nil {
		return nil, err
	}

	// 验证用户名唯一性（排除当前用户）
	if username != user.Username {
		var existingUser model.User
		if err := s.db.Where("username = ? AND id != ?", username, userID).First(&existingUser).Error; err == nil {
			return nil, errors.New("用户名已存在")
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("检查用户名唯一性失败: %w", err)
		}
	}

	// 验证角色
	if err := s.validateRole(role); err != nil {
		return nil, err
	}

	// 更新用户
	user.Username = username
	user.Role = role

	if err := s.db.Save(user).Error; err != nil {
		return nil, fmt.Errorf("更新用户失败: %w", err)
	}

	// 处理角色变更时的永久 Key 管理
	if oldRole != role {
		apiKeyService := NewAPIKeyService()

		if role == "admin" && oldRole == "user" {
			// user -> admin: 创建永久 Key
			description := fmt.Sprintf("管理员永久密钥 (User: %s)", username)
			_, err := apiKeyService.CreatePermanentAPIKey(user.ID, description)
			if err != nil {
				fmt.Printf("⚠️  为管理员创建永久 Key 失败: %v\n", err)
			}
		} else if role == "user" && oldRole == "admin" {
			// admin -> user: 删除永久 Key
			err := apiKeyService.DeletePermanentAPIKey(user.ID)
			if err != nil {
				fmt.Printf("⚠️  删除管理员永久 Key 失败: %v\n", err)
			}
		}
	}

	return user, nil
}

// ResetPassword 重置用户密码
func (s *UserService) ResetPassword(userID uint, newPassword string) error {
	// 验证密码
	if err := s.validatePassword(newPassword); err != nil {
		return err
	}

	// 获取用户
	user, err := s.GetUserByID(userID)
	if err != nil {
		return err
	}

	// 加密新密码
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}

	// 更新密码
	user.PasswordHash = string(passwordHash)
	if err := s.db.Save(user).Error; err != nil {
		return fmt.Errorf("重置密码失败: %w", err)
	}

	return nil
}

// CountAdmins 统计管理员数量
func (s *UserService) CountAdmins() (int64, error) {
	var count int64
	if err := s.db.Model(&model.User{}).Where("role = ?", "admin").Count(&count).Error; err != nil {
		return 0, fmt.Errorf("统计管理员数量失败: %w", err)
	}
	return count, nil
}

// DeleteUser 删除用户
func (s *UserService) DeleteUser(userID uint, currentUserID uint) error {
	// 检查是否尝试删除当前用户
	if userID == currentUserID {
		return errors.New("不能删除自己")
	}

	// 获取用户
	user, err := s.GetUserByID(userID)
	if err != nil {
		return err
	}

	// 如果是管理员，检查是否为最后一个管理员
	if user.Role == "admin" {
		adminCount, err := s.CountAdmins()
		if err != nil {
			return err
		}
		if adminCount <= 1 {
			return errors.New("不能删除最后一个管理员")
		}
	}

	// 执行软删除
	if err := s.db.Delete(user).Error; err != nil {
		return fmt.Errorf("删除用户失败: %w", err)
	}

	return nil
}

// SetUserStatus 设置用户状态
func (s *UserService) SetUserStatus(userID uint, isEnabled bool, currentUserID uint) error {
	// 检查是否尝试禁用当前用户
	if userID == currentUserID && !isEnabled {
		return errors.New("不能禁用自己的账户")
	}

	// 获取用户
	user, err := s.GetUserByID(userID)
	if err != nil {
		return err
	}

	// 更新状态
	user.IsEnabled = isEnabled
	if err := s.db.Save(user).Error; err != nil {
		return fmt.Errorf("更新用户状态失败: %w", err)
	}

	return nil
}

// BatchDeleteUsers 批量删除用户
func (s *UserService) BatchDeleteUsers(userIDs []uint, currentUserID uint) (*BatchOperationResult, error) {
	result := &BatchOperationResult{
		Success: []uint{},
		Failed:  []BatchOperationError{},
	}

	// 使用事务确保原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, userID := range userIDs {
			// 跳过当前用户
			if userID == currentUserID {
				result.Failed = append(result.Failed, BatchOperationError{
					ID:    userID,
					Error: "不能删除自己",
				})
				result.FailedCount++
				continue
			}

			// 获取用户
			var user model.User
			if err := tx.First(&user, userID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					result.Failed = append(result.Failed, BatchOperationError{
						ID:    userID,
						Error: "用户不存在",
					})
				} else {
					result.Failed = append(result.Failed, BatchOperationError{
						ID:    userID,
						Error: "查询用户失败",
					})
				}
				result.FailedCount++
				continue
			}

			// 如果是管理员，检查是否为最后一个管理员
			if user.Role == "admin" {
				var adminCount int64
				if err := tx.Model(&model.User{}).Where("role = ?", "admin").Count(&adminCount).Error; err != nil {
					result.Failed = append(result.Failed, BatchOperationError{
						ID:    userID,
						Error: "检查管理员数量失败",
					})
					result.FailedCount++
					continue
				}
				if adminCount <= 1 {
					result.Failed = append(result.Failed, BatchOperationError{
						ID:    userID,
						Error: "不能删除最后一个管理员",
					})
					result.FailedCount++
					continue
				}
			}

			// 执行软删除
			if err := tx.Delete(&user).Error; err != nil {
				result.Failed = append(result.Failed, BatchOperationError{
					ID:    userID,
					Error: "删除失败",
				})
				result.FailedCount++
				continue
			}

			result.Success = append(result.Success, userID)
			result.SuccessCount++
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("批量删除用户失败: %w", err)
	}

	return result, nil
}

// BatchUpdateRole 批量修改用户角色
func (s *UserService) BatchUpdateRole(userIDs []uint, role string, currentUserID uint) (*BatchOperationResult, error) {
	// 验证角色
	if err := s.validateRole(role); err != nil {
		return nil, err
	}

	result := &BatchOperationResult{
		Success: []uint{},
		Failed:  []BatchOperationError{},
	}

	apiKeyService := NewAPIKeyService()

	// 使用事务确保原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, userID := range userIDs {
			// 跳过当前用户
			if userID == currentUserID {
				result.Failed = append(result.Failed, BatchOperationError{
					ID:    userID,
					Error: "不能修改自己的角色",
				})
				result.FailedCount++
				continue
			}

			// 获取用户
			var user model.User
			if err := tx.First(&user, userID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					result.Failed = append(result.Failed, BatchOperationError{
						ID:    userID,
						Error: "用户不存在",
					})
				} else {
					result.Failed = append(result.Failed, BatchOperationError{
						ID:    userID,
						Error: "查询用户失败",
					})
				}
				result.FailedCount++
				continue
			}

			// 记录原角色
			oldRole := user.Role

			// 更新角色
			user.Role = role
			if err := tx.Save(&user).Error; err != nil {
				result.Failed = append(result.Failed, BatchOperationError{
					ID:    userID,
					Error: "更新角色失败",
				})
				result.FailedCount++
				continue
			}

			// 处理角色变更时的永久 Key 管理
			if oldRole != role {
				if role == "admin" && oldRole == "user" {
					// user -> admin: 创建永久 Key
					description := fmt.Sprintf("管理员永久密钥 (User: %s)", user.Username)
					_, err := apiKeyService.CreatePermanentAPIKey(user.ID, description)
					if err != nil {
						fmt.Printf("⚠️  为管理员创建永久 Key 失败 (User ID: %d): %v\n", user.ID, err)
					}
				} else if role == "user" && oldRole == "admin" {
					// admin -> user: 删除永久 Key
					err := apiKeyService.DeletePermanentAPIKey(user.ID)
					if err != nil {
						fmt.Printf("⚠️  删除管理员永久 Key 失败 (User ID: %d): %v\n", user.ID, err)
					}
				}
			}

			result.Success = append(result.Success, userID)
			result.SuccessCount++
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("批量修改角色失败: %w", err)
	}

	return result, nil
}
