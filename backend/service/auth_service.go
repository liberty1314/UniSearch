package service

import (
	"errors"
	"fmt"
	"log"
	"strings"
	"time"
	"unisearch/config"
	"unisearch/database"
	"unisearch/model"
	"unisearch/util"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// AuthService 用户认证服务
// 提供用户注册、登录、Token验证等功能
type AuthService struct {
	db                    *gorm.DB
	systemSettingsService *SystemSettingsService
}

func isAuthDuplicateEntryError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "duplicate entry") || strings.Contains(errMsg, "error 1062")
}

// NewAuthService 创建认证服务实例
func NewAuthService() *AuthService {
	return &AuthService{
		db: database.GetDB(),
	}
}

// SetSystemSettingsService 注入系统设置服务，用于在注册时校验开关状态
func (s *AuthService) SetSystemSettingsService(systemSettingsService *SystemSettingsService) {
	s.systemSettingsService = systemSettingsService
}

// SignupCaptchaConfig 返回注册人机验证的开关与提供方。
// 当系统设置服务未注入或查询失败时，默认视为关闭。
func (s *AuthService) SignupCaptchaConfig() (enabled bool, provider string, err error) {
	if s.systemSettingsService == nil {
		return false, "", nil
	}
	settings, err := s.systemSettingsService.GetSettings()
	if err != nil {
		return false, "", err
	}
	enabled = settings.EnableSignupCaptcha
	provider = settings.SignupCaptchaProvider
	// Turnstile 缺少服务端密钥时无法校验，视为未启用，避免"开关开着但密钥缺失"
	// 导致前端不渲染验证组件、后端却强制要求 token 的死锁。
	if enabled && provider == "turnstile" && config.GetTurnstileSecretKey() == "" {
		return false, provider, nil
	}
	return enabled, provider, nil
}

func (s *AuthService) recordDailyLogin(userID uint, now time.Time) error {
	if userID == 0 {
		return errors.New("用户ID不能为空")
	}

	stat := model.UserLoginDailyStat{
		UserID:     userID,
		LoginDate:  now.Format("2006-01-02"),
		LoginCount: 1,
	}

	return s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "user_id"},
			{Name: "login_date"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"login_count": gorm.Expr("login_count + ?", 1),
			"updated_at":  now,
		}),
	}).Create(&stat).Error
}

func (s *AuthService) ensureDailyActivity(userID uint, now time.Time) error {
	if userID == 0 {
		return errors.New("用户ID不能为空")
	}

	stat := model.UserLoginDailyStat{
		UserID:     userID,
		LoginDate:  now.Format("2006-01-02"),
		LoginCount: 1,
	}

	return s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "user_id"},
			{Name: "login_date"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"updated_at": now,
		}),
	}).Create(&stat).Error
}

// Register 用户注册
// 参数：
//   - username: 用户名（以后端认证策略为准，默认 3-32 字符）
//   - password: 密码（以后端认证策略为准，默认 6-64 字符）
//
// 返回：
//   - *model.User: 创建的用户对象（不包含密码哈希）
//   - error: 错误信息
//
// 验证需求：4.1-4.6
func (s *AuthService) Register(username, password string) (*model.User, error) {
	if s.systemSettingsService != nil {
		settings, err := s.systemSettingsService.GetSettings()
		if err != nil {
			return nil, fmt.Errorf("查询系统设置失败: %w", err)
		}
		if !settings.EnableUserAuth || !settings.EnableUserSignup {
			return nil, ErrSignupDisabled
		}
	}

	// 验证参数非空
	username = strings.TrimSpace(username)

	if username == "" {
		return nil, newAuthValidationError("用户名不能为空")
	}
	minU := config.AppConfig.AuthUsernameMinLength
	maxU := config.AppConfig.AuthUsernameMaxLength

	// 验证用户名长度
	if len(username) < minU || len(username) > maxU {
		return nil, newAuthValidationError(fmt.Sprintf("用户名长度必须在%d-%d字符之间", minU, maxU))
	}

	if err := ValidateNewPassword(password); err != nil {
		return nil, err
	}

	// 检查用户名是否已存在。
	// 注册流程不自动恢复软删除用户，避免历史账号被新的注册请求接管。
	var existingUser model.User
	result := s.db.Unscoped().Where("username = ?", username).First(&existingUser)
	if result.Error == nil {
		// 用户已存在
		return nil, ErrUsernameExists
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
		if isAuthDuplicateEntryError(err) {
			return nil, ErrUsernameExists
		}
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}

	log.Printf("✓ 用户注册成功: %s (ID: %d)", user.Username, user.ID)
	return user, nil
}

// CheckUsernameExist 检查用户名是否已存在
func (s *AuthService) CheckUsernameExist(username string) (bool, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return false, newAuthValidationError("用户名不能为空")
	}

	var existingUser model.User
	result := s.db.Unscoped().Where("username = ?", username).First(&existingUser)
	if result.Error == nil {
		// 用户已存在
		return true, nil
	} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 数据库查询错误
		return false, fmt.Errorf("查询用户失败: %w", result.Error)
	}
	// 不存在
	return false, nil
}

// Login 用户登录
// 参数：
//   - username: 用户名
//   - password: 密码
//
// 返回：
//   - token: JWT Token 字符串
//   - user: 用户对象（不包含密码哈希）
//   - apiKey: 保留兼容返回值，当前始终为空字符串
//   - err: 错误信息
//
// 验证需求：5.1-5.7
func (s *AuthService) Login(username, password string) (token string, user *model.User, apiKey string, err error) {
	// 验证参数非空
	username = strings.TrimSpace(username)

	if username == "" {
		return "", nil, "", newAuthValidationError("用户名不能为空")
	}
	if strings.TrimSpace(password) == "" {
		return "", nil, "", newAuthValidationError("密码不能为空")
	}

	// 查询用户
	var dbUser model.User
	result := s.db.Where("username = ?", username).First(&dbUser)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// 用户不存在：执行一次等价耗时的 dummy bcrypt 比对，拉平与"密码错误"路径的响应时间，
			// 消除用户枚举的时序侧信道。返回通用错误消息（安全考虑）。
			util.DummyComparePassword(password)
			return "", nil, "", ErrInvalidCredentials
		}
		// 数据库查询错误
		return "", nil, "", fmt.Errorf("查询用户失败: %w", result.Error)
	}

	// 验证密码
	if !util.ComparePassword(dbUser.PasswordHash, password) {
		// 密码错误，返回通用错误消息（安全考虑）
		return "", nil, "", ErrInvalidCredentials
	}

	// 检查账户是否被禁用
	if !dbUser.IsEnabled {
		return "", nil, "", ErrAccountDisabled
	}

	// 生成 JWT Token
	// Token 包含 user_id, username, role 字段，有效期 24 小时
	jwtSecret := config.AppConfig.AuthJWTSecret
	tokenExpiry := config.AppConfig.AuthTokenExpiry
	if tokenExpiry == 0 {
		tokenExpiry = 24 * time.Hour // 默认 24 小时
	}

	token, err = util.GenerateJWTToken(dbUser.ID, dbUser.Username, dbUser.Role, dbUser.TokenVersion, jwtSecret, tokenExpiry)
	if err != nil {
		return "", nil, "", fmt.Errorf("生成Token失败: %w", err)
	}

	// 更新最后登录时间
	now := time.Now()
	dbUser.LastLoginAt = &now
	if err := s.db.Model(&dbUser).Update("last_login_at", now).Error; err != nil {
		log.Printf("⚠️  更新最后登录时间失败: %v", err)
		// 不影响登录流程，继续执行
	}
	if err := s.recordDailyLogin(dbUser.ID, now); err != nil {
		log.Printf("⚠️  记录用户日登录统计失败: %v", err)
		// 不影响登录流程，继续执行
	}

	log.Printf("✓ 用户登录成功: %s (ID: %d, Role: %s)", dbUser.Username, dbUser.ID, dbUser.Role)
	return token, &dbUser, "", nil
}

// UpdateLastLoginAtByUserID 根据用户ID更新最后登录时间
func (s *AuthService) UpdateLastLoginAtByUserID(userID uint) error {
	if userID == 0 {
		return errors.New("用户ID不能为空")
	}

	now := time.Now()
	result := s.db.Model(&model.User{}).
		Where("id = ?", userID).
		Update("last_login_at", now)
	if result.Error != nil {
		return fmt.Errorf("更新最后登录时间失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	if err := s.recordDailyLogin(userID, now); err != nil {
		return fmt.Errorf("记录用户日登录统计失败: %w", err)
	}

	return nil
}

// MarkUserActiveByUserID 根据用户ID刷新最后活跃时间，并确保当天存在活跃记录。
// 与真实登录不同，该方法不会重复增加当天 login_count，避免高频访问放大统计值。
func (s *AuthService) MarkUserActiveByUserID(userID uint) error {
	if userID == 0 {
		return errors.New("用户ID不能为空")
	}

	now := time.Now()
	result := s.db.Model(&model.User{}).
		Where("id = ?", userID).
		Update("last_login_at", now)
	if result.Error != nil {
		return fmt.Errorf("更新最后登录时间失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	if err := s.ensureDailyActivity(userID, now); err != nil {
		return fmt.Errorf("记录用户日活跃统计失败: %w", err)
	}

	return nil
}

// GetCurrentMonthLoginDays 查询单个用户本月登录日期摘要。
func (s *AuthService) GetCurrentMonthLoginDays(userID uint) ([]string, int, error) {
	if userID == 0 {
		return nil, 0, errors.New("用户ID不能为空")
	}

	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	nextMonthStart := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")

	var stats []model.UserLoginDailyStat
	if err := s.db.
		Where("user_id = ? AND login_date >= ? AND login_date < ?", userID, monthStart, nextMonthStart).
		Order("login_date ASC").
		Find(&stats).Error; err != nil {
		return nil, 0, fmt.Errorf("查询当前用户月登录统计失败: %w", err)
	}

	loginDays := make([]string, 0, len(stats))
	for _, stat := range stats {
		loginDays = append(loginDays, stat.LoginDate)
	}

	return loginDays, len(loginDays), nil
}

// ValidateToken 验证 JWT Token
// 参数：
//   - tokenString: JWT Token 字符串
//
// 返回：
//   - *util.JWTClaims: 解析后的 JWT Claims（包含 UserID, Username, Role）
//   - error: 错误信息
//
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

// CreateDefaultAdmin 创建首次管理员账户。
// 生产环境必须显式配置初始管理员凭据；开发环境允许本地默认值但不输出明文密码。
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

	credentials, err := config.ResolveInitialAdminCredentials()
	if err != nil {
		return fmt.Errorf("初始管理员配置无效: %w", err)
	}

	// 使用 bcrypt 加密密码（cost=10）
	passwordHash, err := util.HashPassword(credentials.Password)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}

	// 创建管理员用户对象
	admin := &model.User{
		Username:     credentials.Username,
		PasswordHash: passwordHash,
		Role:         "admin",
	}

	// 保存到数据库
	if err := s.db.Create(admin).Error; err != nil {
		return fmt.Errorf("创建管理员账户失败: %w", err)
	}

	// 在控制台输出提示信息
	log.Printf("✓ 默认管理员账户已创建")
	log.Printf("  用户名: %s", credentials.Username)
	if credentials.UsingDevelopmentDefault {
		log.Printf("  提示: 当前使用开发环境默认管理员，请勿用于生产环境")
	}

	return nil
}

// GetUserByID 根据用户ID获取用户信息
// 参数：
//   - userID: 用户ID
//
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

// GetTokenVersion 返回用户当前的令牌版本。中间件用它比对 JWT 中的 TokenVersion，
// 不一致即视为失效（改密/封禁后旧 Token 立即作废）。
func (s *AuthService) GetTokenVersion(userID uint) (int, error) {
	if userID == 0 {
		return 0, errors.New("用户ID不能为空")
	}
	var user model.User
	result := s.db.Select("token_version").First(&user, userID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return 0, errors.New("用户不存在")
		}
		return 0, fmt.Errorf("查询令牌版本失败: %w", result.Error)
	}
	return user.TokenVersion, nil
}

// BumpTokenVersion 递增用户令牌版本，使该用户此前签发的所有 access token 立即失效。
// 在改密、封禁、禁用账户等需要强制下线的场景调用。
func (s *AuthService) BumpTokenVersion(userID uint) error {
	if userID == 0 {
		return errors.New("用户ID不能为空")
	}
	result := s.db.Model(&model.User{}).
		Where("id = ?", userID).
		UpdateColumn("token_version", gorm.Expr("token_version + ?", 1))
	if result.Error != nil {
		return fmt.Errorf("递增令牌版本失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetUserByUsername 根据用户名获取用户信息
// 参数：
//   - username: 用户名
//
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
//
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
