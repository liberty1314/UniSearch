package service

import (
	"errors"
	"fmt"
	"log"
	"pansou/config"
	"pansou/database"
	"pansou/model"
	"pansou/util"
	"strings"
	"time"

	"gorm.io/gorm"
)

// AuthService 用户认证服务
// 提供用户注册、登录、Token验证等功能
type AuthService struct {
	db *gorm.DB
}

// NewAuthService 创建认证服务实例
func NewAuthService() *AuthService {
	return &AuthService{
		db: database.GetDB(),
	}
}

// Register 用户注册
// 参数：
//   - username: 用户名（3-32字符）
//   - password: 密码（6-64字符）
// 返回：
//   - *model.User: 创建的用户对象（不包含密码哈希）
//   - error: 错误信息
// 验证需求：4.1-4.6
func (s *AuthService) Register(username, password string) (*model.User, error) {
	// 验证参数非空
	username = strings.TrimSpace(username)
	password = strings.TrimSpace(password)

	if username == "" {
		return nil, errors.New("用户名不能为空")
	}
	if password == "" {
		return nil, errors.New("密码不能为空")
	}

	// 验证用户名长度
	if len(username) < 3 || len(username) > 32 {
		return nil, errors.New("用户名长度必须在3-32字符之间")
	}

	// 验证密码长度
	if len(password) < 6 || len(password) > 64 {
		return nil, errors.New("密码长度必须在6-64字符之间")
	}

	// 检查用户名是否已存在
	var existingUser model.User
	result := s.db.Where("username = ?", username).First(&existingUser)
	if result.Error == nil {
		// 用户已存在
		return nil, errors.New("用户名已存在")
	} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 数据库查询错误
		return nil, fmt.Errorf("查询用户失败: %w", result.Error)
	}

	// 使用 bcrypt 加密密码（cost=10）
	passwordHash, err := util.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("密码加密失败: %w", err)
	}

	// 创建用户对象
	user := &model.User{
		Username:     username,
		PasswordHash: passwordHash,
		Role:         "user", // 默认角色为普通用户
	}

	// 保存到数据库
	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}

	log.Printf("✓ 用户注册成功: %s (ID: %d)", user.Username, user.ID)
	return user, nil
}

// Login 用户登录
// 参数：
//   - username: 用户名
//   - password: 密码
// 返回：
//   - token: JWT Token 字符串
//   - user: 用户对象（不包含密码哈希）
//   - err: 错误信息
// 验证需求：5.1-5.7
func (s *AuthService) Login(username, password string) (token string, user *model.User, err error) {
	// 验证参数非空
	username = strings.TrimSpace(username)
	password = strings.TrimSpace(password)

	if username == "" {
		return "", nil, errors.New("用户名不能为空")
	}
	if password == "" {
		return "", nil, errors.New("密码不能为空")
	}

	// 查询用户
	var dbUser model.User
	result := s.db.Where("username = ?", username).First(&dbUser)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// 用户不存在，返回通用错误消息（安全考虑）
			return "", nil, errors.New("用户名或密码错误")
		}
		// 数据库查询错误
		return "", nil, fmt.Errorf("查询用户失败: %w", result.Error)
	}

	// 验证密码
	if !util.ComparePassword(dbUser.PasswordHash, password) {
		// 密码错误，返回通用错误消息（安全考虑）
		return "", nil, errors.New("用户名或密码错误")
	}

	// 生成 JWT Token
	// Token 包含 user_id, username, role 字段，有效期 24 小时
	jwtSecret := config.AppConfig.AuthJWTSecret
	tokenExpiry := config.AppConfig.AuthTokenExpiry
	if tokenExpiry == 0 {
		tokenExpiry = 24 * time.Hour // 默认 24 小时
	}

	token, err = util.GenerateJWTToken(dbUser.ID, dbUser.Username, dbUser.Role, jwtSecret, tokenExpiry)
	if err != nil {
		return "", nil, fmt.Errorf("生成Token失败: %w", err)
	}

	log.Printf("✓ 用户登录成功: %s (ID: %d, Role: %s)", dbUser.Username, dbUser.ID, dbUser.Role)
	return token, &dbUser, nil
}

// ValidateToken 验证 JWT Token
// 参数：
//   - tokenString: JWT Token 字符串
// 返回：
//   - *util.JWTClaims: 解析后的 JWT Claims（包含 UserID, Username, Role）
//   - error: 错误信息
// 验证需求：5.5, 5.6, 13.6
func (s *AuthService) ValidateToken(tokenString string) (*util.JWTClaims, error) {
	if tokenString == "" {
		return nil, errors.New("Token不能为空")
	}

	// 使用 JWT 工具验证 Token
	jwtSecret := config.AppConfig.AuthJWTSecret
	claims, err := util.ValidateJWTToken(tokenString, jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("Token验证失败: %w", err)
	}

	return claims, nil
}

// CreateDefaultAdmin 创建默认管理员账户
// 检查是否存在 role='admin' 的用户，如果不存在则创建默认管理员
// 默认管理员：username='admin', password='admin'
// 验证需求：2.3, 2.4, 2.5
func (s *AuthService) CreateDefaultAdmin() error {
	// 检查是否存在管理员账户
	var adminCount int64
	if err := s.db.Model(&model.User{}).Where("role = ?", "admin").Count(&adminCount).Error; err != nil {
		return fmt.Errorf("查询管理员账户失败: %w", err)
	}

	// 如果已存在管理员，跳过创建
	if adminCount > 0 {
		log.Printf("✓ 管理员账户已存在，跳过创建")
		return nil
	}

	// 创建默认管理员
	defaultUsername := "admin"
	defaultPassword := "admin"

	// 使用 bcrypt 加密密码（cost=10）
	passwordHash, err := util.HashPassword(defaultPassword)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}

	// 创建管理员用户对象
	admin := &model.User{
		Username:     defaultUsername,
		PasswordHash: passwordHash,
		Role:         "admin",
	}

	// 保存到数据库
	if err := s.db.Create(admin).Error; err != nil {
		return fmt.Errorf("创建管理员账户失败: %w", err)
	}

	// 在控制台输出提示信息
	log.Printf("✓ 默认管理员账户已创建")
	log.Printf("  用户名: %s", defaultUsername)
	log.Printf("  密码: %s", defaultPassword)
	log.Printf("  ⚠️  请尽快修改默认密码！")

	return nil
}

// GetUserByID 根据用户ID获取用户信息
// 参数：
//   - userID: 用户ID
// 返回：
//   - *model.User: 用户对象（不包含密码哈希）
//   - error: 错误信息
func (s *AuthService) GetUserByID(userID uint) (*model.User, error) {
	var user model.User
	result := s.db.First(&user, userID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, fmt.Errorf("查询用户失败: %w", result.Error)
	}

	return &user, nil
}

// GetUserByUsername 根据用户名获取用户信息
// 参数：
//   - username: 用户名
// 返回：
//   - *model.User: 用户对象（不包含密码哈希）
//   - error: 错误信息
func (s *AuthService) GetUserByUsername(username string) (*model.User, error) {
	var user model.User
	result := s.db.Where("username = ?", username).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, fmt.Errorf("查询用户失败: %w", result.Error)
	}

	return &user, nil
}

// IsAdmin 检查用户是否为管理员
// 参数：
//   - userID: 用户ID
// 返回：
//   - bool: 是否为管理员
//   - error: 错误信息
func (s *AuthService) IsAdmin(userID uint) (bool, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return false, err
	}

	return user.IsAdmin(), nil
}
