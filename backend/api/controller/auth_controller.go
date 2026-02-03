package controller

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log"
	"unisearch/config"
	"unisearch/model"
	"unisearch/service"
	"unisearch/util"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AuthController 认证控制器
// 处理用户注册、登录等认证相关的 HTTP 请求
type AuthController struct {
	authService *service.AuthService
}

// NewAuthController 创建认证控制器实例
func NewAuthController(authService *service.AuthService) *AuthController {
	return &AuthController{
		authService: authService,
	}
}

// RegisterRequest 用户注册请求结构
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"` // 用户名（3-32字符）
	Password string `json:"password" binding:"required,min=6,max=64"` // 密码（6-64字符）
}

// RegisterResponse 用户注册响应结构
type RegisterResponse struct {
	Code    int         `json:"code"`              // 响应码
	Message string      `json:"message"`           // 响应消息
	Data    interface{} `json:"data,omitempty"`    // 响应数据（成功时包含用户信息）
}

// LoginRequest 用户登录请求结构（支持记住我）
type LoginRequest struct {
	Username          string `json:"username" binding:"required"`          // 用户名
	Password          string `json:"password" binding:"required"`          // 密码或 API Key
	RememberMe        bool   `json:"remember_me"`                          // 是否记住我（可选）
	DeviceFingerprint string `json:"device_fingerprint"`                   // 设备指纹（可选）
}

// LoginResponse 用户登录响应结构（支持刷新令牌）
type LoginResponse struct {
	Code    int         `json:"code"`              // 响应码
	Message string      `json:"message"`           // 响应消息
	Data    interface{} `json:"data,omitempty"`    // 响应数据（成功时包含 Token 和用户信息）
}

// LoginData 登录成功返回的数据（支持刷新令牌）
type LoginData struct {
	AccessToken  string  `json:"access_token"`            // JWT Token
	ExpiresAt    int64   `json:"expires_at"`              // Token 过期时间（Unix 时间戳）
	RefreshToken *string `json:"refresh_token,omitempty"` // 刷新令牌（仅在 remember_me=true 时返回）
	Username     string  `json:"username"`                // 用户名
	User         *model.User `json:"user,omitempty"`      // 用户信息（数据库用户）
}

// Register 处理用户注册请求
// POST /api/auth/register
// 验证需求：4.1-4.6
func (ctrl *AuthController) Register(c *gin.Context) {
	var req RegisterRequest

	// 参数验证（使用 Gin binding 标签）
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("✗ 注册请求参数验证失败: %v", err)
		c.JSON(400, RegisterResponse{
			Code:    400,
			Message: "请求参数无效: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 去除首尾空白字符
	req.Username = strings.TrimSpace(req.Username)
	req.Password = strings.TrimSpace(req.Password)

	// 额外验证：确保去除空白后仍然满足长度要求
	if len(req.Username) < 3 || len(req.Username) > 32 {
		c.JSON(400, RegisterResponse{
			Code:    400,
			Message: "用户名长度必须在3-32字符之间",
			Data:    nil,
		})
		return
	}

	if len(req.Password) < 6 || len(req.Password) > 64 {
		c.JSON(400, RegisterResponse{
			Code:    400,
			Message: "密码长度必须在6-64字符之间",
			Data:    nil,
		})
		return
	}

	// 调用服务层进行注册
	user, err := ctrl.authService.Register(req.Username, req.Password)
	if err != nil {
		// 根据错误类型返回不同的状态码
		if strings.Contains(err.Error(), "用户名已存在") {
			log.Printf("✗ 注册失败: 用户名已存在 - %s", req.Username)
			c.JSON(400, RegisterResponse{
				Code:    400,
				Message: "用户名已存在",
				Data:    nil,
			})
			return
		}

		// 其他错误（数据库错误等）
		log.Printf("✗ 注册失败: %v", err)
		c.JSON(500, RegisterResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 注册成功，返回用户信息（不包含密码）
	log.Printf("✓ 用户注册成功: %s (ID: %d)", user.Username, user.ID)
	c.JSON(200, RegisterResponse{
		Code:    200,
		Message: "注册成功",
		Data:    user,
	})
}

// Login 处理用户登录请求（统一接口）
// POST /api/auth/login
// 支持三种登录方式：
// 1. 数据库用户登录（用户名 + 密码）
// 2. API Key 登录（任意用户名 + API Key）
// 3. 支持"记住我"功能（返回 refresh_token）
func (ctrl *AuthController) Login(c *gin.Context) {
	var req LoginRequest

	// 参数验证（使用 Gin binding 标签）
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("✗ 登录请求参数验证失败: %v", err)
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "请求参数无效: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 去除首尾空白字符
	req.Username = strings.TrimSpace(req.Username)
	req.Password = strings.TrimSpace(req.Password)

	// 验证非空（去除空白后）
	if req.Username == "" {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "用户名不能为空",
			Data:    nil,
		})
		return
	}

	if req.Password == "" {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "密码不能为空",
			Data:    nil,
		})
		return
	}

	// 检查是否为 API Key 登录（密码为 sk- 开头的43位字符）
	if len(req.Password) == 43 && req.Password[:3] == "sk-" {
		ctrl.handleAPIKeyLogin(c, req)
		return
	}

	// 数据库用户登录
	ctrl.handleDatabaseUserLogin(c, req)
}

// handleAPIKeyLogin 处理 API Key 登录
func (ctrl *AuthController) handleAPIKeyLogin(c *gin.Context, req LoginRequest) {
	// 获取 API Key 服务（从路由上下文）
	apiKeyServiceInterface, exists := c.Get("apiKeyService")
	if !exists {
		log.Printf("✗ API Key 服务未初始化")
		c.JSON(500, LoginResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	apiKeyService, ok := apiKeyServiceInterface.(*service.APIKeyService)
	if !ok || apiKeyService == nil {
		log.Printf("✗ API Key 服务类型错误")
		c.JSON(500, LoginResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 验证 API Key
	valid, err := apiKeyService.ValidateKey(req.Password)
	if err != nil {
		log.Printf("✗ API Key 验证失败: %v", err)
		c.JSON(500, LoginResponse{
			Code:    500,
			Message: "验证失败",
			Data:    nil,
		})
		return
	}

	if !valid {
		log.Printf("✗ API Key 无效或已过期: %s", req.Password[:10]+"...")
		c.JSON(401, LoginResponse{
			Code:    401,
			Message: "API Key 无效或已过期",
			Data:    nil,
		})
		return
	}

	// 生成 Access Token（携带 API Key 信息）
	accessToken, err := ctrl.generateAPIKeyToken(req.Password)
	if err != nil {
		log.Printf("✗ 生成 Token 失败: %v", err)
		c.JSON(500, LoginResponse{
			Code:    500,
			Message: "生成令牌失败",
			Data:    nil,
		})
		return
	}

	// 构建响应数据
	loginData := LoginData{
		AccessToken: accessToken,
		ExpiresAt:   ctrl.getTokenExpiryTime(),
		Username:    "user", // API Key 用户统一使用 "user"
	}

	// 如果启用"记住我"，生成刷新令牌
	if req.RememberMe {
		refreshToken := ctrl.generateRefreshToken(c, "apikey_user", false, req.DeviceFingerprint)
		if refreshToken != nil {
			loginData.RefreshToken = refreshToken
		}
	}

	log.Printf("✓ API Key 登录成功: %s", req.Password[:10]+"...")
	c.JSON(200, LoginResponse{
		Code:    200,
		Message: "登录成功",
		Data:    loginData,
	})
}

// handleDatabaseUserLogin 处理数据库用户登录
func (ctrl *AuthController) handleDatabaseUserLogin(c *gin.Context, req LoginRequest) {
	// 调用服务层进行登录
	token, user, _, err := ctrl.authService.Login(req.Username, req.Password)
	if err != nil {
		// 根据错误类型返回不同的状态码
		if strings.Contains(err.Error(), "用户名或密码错误") {
			log.Printf("✗ 登录失败: 用户名或密码错误 - %s", req.Username)
			c.JSON(401, LoginResponse{
				Code:    401,
				Message: "用户名或密码错误",
				Data:    nil,
			})
			return
		}

		// 账户被禁用
		if strings.Contains(err.Error(), "账户已被禁用") || strings.Contains(err.Error(), "禁用") {
			log.Printf("✗ 登录失败: 账户已被禁用 - %s", req.Username)
			c.JSON(403, LoginResponse{
				Code:    403,
				Message: "账户已被禁用，请联系管理员",
				Data:    nil,
			})
			return
		}

		// 其他错误（数据库错误等）
		log.Printf("✗ 登录失败: %v", err)
		c.JSON(500, LoginResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 构建响应数据
	loginData := LoginData{
		AccessToken: token,
		ExpiresAt:   ctrl.getTokenExpiryTime(),
		Username:    user.Username,
		User:        user,
	}

	// 如果启用"记住我"，生成刷新令牌
	if req.RememberMe {
		refreshToken := ctrl.generateRefreshToken(c, user.Username, user.IsAdmin(), req.DeviceFingerprint)
		if refreshToken != nil {
			loginData.RefreshToken = refreshToken
		}
	}

	log.Printf("✓ 用户登录成功: %s (ID: %d, Role: %s)", user.Username, user.ID, user.Role)
	c.JSON(200, LoginResponse{
		Code:    200,
		Message: "登录成功",
		Data:    loginData,
	})
}

// generateAPIKeyToken 生成 API Key 用户的 Token
func (ctrl *AuthController) generateAPIKeyToken(apiKey string) (string, error) {
	// 使用新版 GenerateJWTTokenWithAPIKey 生成 Token
	// API Key 用户使用虚拟 user_id = 0，role = "user"，并携带 API Key 信息
	token, err := util.GenerateJWTTokenWithAPIKey(
		0,      // API Key 用户使用虚拟 user_id = 0
		"user", // 用户名固定为 "user"
		"user", // 角色为普通用户
		apiKey, // 携带 API Key 信息
		config.AppConfig.AuthJWTSecret,
		config.AppConfig.AuthTokenExpiry,
	)
	if err != nil {
		return "", err
	}
	return token, nil
}

// generateRefreshToken 生成刷新令牌
func (ctrl *AuthController) generateRefreshToken(c *gin.Context, username string, isAdmin bool, deviceFingerprint string) *string {
	// 获取刷新令牌服务
	refreshTokenServiceInterface, exists := c.Get("refreshTokenService")
	if !exists {
		log.Printf("⚠ 刷新令牌服务未初始化")
		return nil
	}

	refreshTokenService, ok := refreshTokenServiceInterface.(*service.RefreshTokenService)
	if !ok || refreshTokenService == nil {
		log.Printf("⚠ 刷新令牌服务类型错误")
		return nil
	}

	// 生成设备指纹（如果未提供）
	if deviceFingerprint == "" {
		deviceFingerprint = ctrl.generateDeviceFingerprint(c)
	}

	// 创建刷新令牌
	refreshToken, err := refreshTokenService.CreateToken(
		username,
		isAdmin,
		deviceFingerprint,
		720*time.Hour, // 30 天
	)
	if err != nil {
		log.Printf("⚠ 创建刷新令牌失败: %v", err)
		return nil
	}

	// 加密刷新令牌
	encryptedToken, err := refreshTokenService.EncryptForClient(refreshToken.Token)
	if err != nil {
		log.Printf("⚠ 加密刷新令牌失败: %v", err)
		return nil
	}

	return &encryptedToken
}

// getTokenExpiryTime 获取 Token 过期时间
func (ctrl *AuthController) getTokenExpiryTime() int64 {
	// 从配置读取过期时间
	return time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix()
}

// generateDeviceFingerprint 生成设备指纹
func (ctrl *AuthController) generateDeviceFingerprint(c *gin.Context) string {
	// 使用 IP + User-Agent 生成设备指纹
	data := c.ClientIP() + c.GetHeader("User-Agent")
	
	// 使用 SHA256 哈希
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// ValidateToken 验证 JWT Token 有效性
// GET /api/auth/validate
// 此接口通常用于前端检查 Token 是否仍然有效
func (ctrl *AuthController) ValidateToken(c *gin.Context) {
	// 从 Authorization Header 获取 Token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(401, gin.H{
			"code":    401,
			"message": "未提供认证令牌",
			"data":    nil,
		})
		return
	}

	// 验证 Token 格式（Bearer <token>）
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(401, gin.H{
			"code":    401,
			"message": "认证令牌格式错误",
			"data":    nil,
		})
		return
	}

	tokenString := parts[1]

	// 验证 Token 有效性
	claims, err := ctrl.authService.ValidateToken(tokenString)
	if err != nil {
		log.Printf("✗ Token 验证失败: %v", err)
		c.JSON(401, gin.H{
			"code":    401,
			"message": "认证令牌无效或已过期",
			"data":    nil,
		})
		return
	}

	// Token 有效，返回用户信息
	c.JSON(200, gin.H{
		"code":    200,
		"message": "Token 有效",
		"data": gin.H{
			"user_id":  claims.UserID,
			"username": claims.Username,
			"role":     claims.Role,
		},
	})
}

// GetCurrentUser 获取当前登录用户信息
// GET /api/auth/me
// 需要 JWT 认证中间件
func (ctrl *AuthController) GetCurrentUser(c *gin.Context) {
	// 从 Context 获取用户 ID（由 JWT 中间件设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, gin.H{
			"code":    401,
			"message": "未授权",
			"data":    nil,
		})
		return
	}

	// 转换为 uint 类型
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(500, gin.H{
			"code":    500,
			"message": "服务器内部错误",
			"data":    nil,
		})
		return
	}

	// 查询用户信息
	user, err := ctrl.authService.GetUserByID(uid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(404, gin.H{
				"code":    404,
				"message": "用户不存在",
				"data":    nil,
			})
			return
		}

		log.Printf("✗ 查询用户失败: %v", err)
		c.JSON(500, gin.H{
			"code":    500,
			"message": "服务暂时不可用",
			"data":    nil,
		})
		return
	}

	// 返回用户信息
	c.JSON(200, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    user,
	})
}
