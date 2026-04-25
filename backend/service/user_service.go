package service

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"unisearch/model"
	"unisearch/util"

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
	Users                 []model.User      `json:"users"`
	MonthlyLoginDays      map[uint][]string `json:"monthly_login_days"`
	MonthlyLoginDayCounts map[uint]int      `json:"monthly_login_day_counts"`
	Total                 int64             `json:"total"`
	Page                  int               `json:"page"`
	PageSize              int               `json:"page_size"`
	TotalPages            int               `json:"total_pages"`
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

	// 分页查询：启用用户优先，禁用用户置底；同组内按最近登录和创建时间排序。
	var users []model.User
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("CASE WHEN is_enabled THEN 0 ELSE 1 END ASC, last_login_at IS NULL ASC, last_login_at DESC, created_at DESC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("查询用户列表失败: %w", err)
	}

	monthlyLoginDays, monthlyLoginDayCounts, err := s.listCurrentMonthLoginDays(users)
	if err != nil {
		return nil, err
	}

	return &UserListResult{
		Users:                 users,
		MonthlyLoginDays:      monthlyLoginDays,
		MonthlyLoginDayCounts: monthlyLoginDayCounts,
		Total:                 total,
		Page:                  page,
		PageSize:              pageSize,
		TotalPages:            totalPages,
	}, nil
}

func (s *UserService) listCurrentMonthLoginDays(users []model.User) (map[uint][]string, map[uint]int, error) {
	loginDays := make(map[uint][]string, len(users))
	loginDayCounts := make(map[uint]int, len(users))
	if len(users) == 0 {
		return loginDays, loginDayCounts, nil
	}

	userIDs := make([]uint, 0, len(users))
	for _, user := range users {
		userIDs = append(userIDs, user.ID)
		loginDays[user.ID] = []string{}
		loginDayCounts[user.ID] = 0
	}

	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	nextMonthStart := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")

	var stats []model.UserLoginDailyStat
	if err := s.db.
		Where("user_id IN ? AND login_date >= ? AND login_date < ?", userIDs, monthStart, nextMonthStart).
		Order("login_date ASC").
		Find(&stats).Error; err != nil {
		return nil, nil, fmt.Errorf("查询用户月登录统计失败: %w", err)
	}

	for _, stat := range stats {
		loginDays[stat.UserID] = append(loginDays[stat.UserID], stat.LoginDate)
		loginDayCounts[stat.UserID] = len(loginDays[stat.UserID])
	}

	return loginDays, loginDayCounts, nil
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

func isDuplicateEntryError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "duplicate entry") || strings.Contains(errMsg, "error 1062")
}

func (s *UserService) restoreDeletedUser(user *model.User, passwordHash, role string) error {
	return s.db.Unscoped().Model(&model.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
		"username":      user.Username,
		"password_hash": passwordHash,
		"role":          role,
		"is_enabled":    true,
		"last_login_at": nil,
		"deleted_at":    nil,
	}).Error
}

// CreateUser 创建用户
// 返回 restored=true 表示命中了软删除用户并执行了恢复。
func (s *UserService) CreateUser(username, password, role string, restoreIfDeleted bool) (*model.User, bool, error) {
	username = strings.TrimSpace(username)

	// 验证用户名
	if err := s.validateUsername(username); err != nil {
		return nil, false, err
	}

	// 验证用户名唯一性
	var existingUser model.User
	hasDeletedUser := false
	if err := s.db.Unscoped().Where("username = ?", username).First(&existingUser).Error; err == nil {
		if !existingUser.DeletedAt.Valid {
			return nil, false, errors.New("用户名已存在")
		}
		hasDeletedUser = true
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, fmt.Errorf("检查用户名唯一性失败: %w", err)
	}

	// 验证密码
	if err := s.validatePassword(password); err != nil {
		return nil, false, err
	}

	// 验证角色
	if err := s.validateRole(role); err != nil {
		return nil, false, err
	}

	// 加密密码
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, false, fmt.Errorf("密码加密失败: %w", err)
	}

	if hasDeletedUser {
		if !restoreIfDeleted {
			return nil, false, errors.New("用户名对应的账号已被删除，请确认是否恢复该账号")
		}

		if err := s.restoreDeletedUser(&existingUser, string(passwordHash), role); err != nil {
			if isDuplicateEntryError(err) {
				return nil, false, errors.New("用户名已存在")
			}
			return nil, false, fmt.Errorf("恢复已删除用户失败: %w", err)
		}

		user, err := s.GetUserByID(existingUser.ID)
		if err != nil {
			return nil, false, err
		}
		return user, true, nil
	}

	// 创建用户
	user := &model.User{
		Username:     username,
		PasswordHash: string(passwordHash),
		Role:         role,
		IsEnabled:    true,
	}

	if err := s.db.Create(user).Error; err != nil {
		if isDuplicateEntryError(err) {
			return nil, false, errors.New("用户名已存在")
		}
		return nil, false, fmt.Errorf("创建用户失败: %w", err)
	}

	return user, false, nil
}

// UpdateUser 更新用户信息
func (s *UserService) UpdateUser(userID uint, username, role string, currentUserID uint) (*model.User, error) {
	username = strings.TrimSpace(username)

	// 检查是否尝试修改当前用户的角色
	if userID == currentUserID {
		return nil, errors.New("不能修改自己的角色")
	}

	// 获取用户
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	// 验证用户名
	if err := s.validateUsername(username); err != nil {
		return nil, err
	}

	// 验证用户名唯一性（排除当前用户）
	if username != user.Username {
		var existingUser model.User
		if err := s.db.Unscoped().Where("username = ? AND id != ?", username, userID).First(&existingUser).Error; err == nil {
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
		if isDuplicateEntryError(err) {
			return nil, errors.New("用户名已存在")
		}
		return nil, fmt.Errorf("更新用户失败: %w", err)
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

// ChangePassword 允许用户通过当前密码验证后修改密码。
func (s *UserService) ChangePassword(userID uint, currentPassword, newPassword string) error {
	if strings.TrimSpace(currentPassword) == "" {
		return errors.New("当前密码不能为空")
	}

	if err := s.validatePassword(newPassword); err != nil {
		return err
	}

	user, err := s.GetUserByID(userID)
	if err != nil {
		return err
	}

	if !util.ComparePassword(user.PasswordHash, currentPassword) {
		return errors.New("当前密码错误")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}

	user.PasswordHash = string(passwordHash)
	if err := s.db.Save(user).Error; err != nil {
		return fmt.Errorf("修改密码失败: %w", err)
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

// GetDAU 获取日活跃用户数（今日0点起登录的用户数）
// 统计来源：users 表中的普通用户。
func (s *UserService) GetDAU() (int64, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	return s.countActiveUsers(todayStart)
}

// GetMAU 获取月活跃用户数（本月1号起登录的用户数）
func (s *UserService) GetMAU() (int64, error) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	return s.countActiveUsers(monthStart)
}

// countActiveUsers 统计指定时间段内的活跃用户数
func (s *UserService) countActiveUsers(since time.Time) (int64, error) {
	// 统计 users 表中的活跃用户（排除管理员）
	var userCount int64
	if err := s.db.Model(&model.User{}).Where("last_login_at >= ? AND role != ?", since, "admin").Count(&userCount).Error; err != nil {
		return 0, fmt.Errorf("统计活跃用户数失败: %w", err)
	}

	return userCount, nil
}
