package controller

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"
	"unisearch/config"
	"unisearch/service"

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
	Username string `json:"username" binding:"required"` // 用户名
	Password string `json:"password" binding:"required"` // 密码
}


// LoginRequest 用户登录请求结构（支持记住我）
type LoginRequest struct {
	Username          string `json:"username" binding:"required"` // 用户名
	Password          string `json:"password" binding:"required"` // 密码
	RememberMe        bool   `json:"remember_me"`                 // 是否记住我（可选）
	DeviceFingerprint string `json:"device_fingerprint"`          // 设备指纹（可选）
}

// LoginResponse 用户登录响应结构（支持刷新令牌）
type LoginResponse struct {
	Code    int         `json:"code"`           // 响应码
	Message string      `json:"message"`        // 响应消息
	Data    interface{} `json:"data,omitempty"` // 响应数据（成功时包含 Token 和用户信息）
}

// LoginData 登录成功返回的数据（支持刷新令牌）
type LoginData struct {
	AccessToken  string  `json:"access_token"`            // JWT Token
	ExpiresAt    int64   `json:"expires_at"`              // Token 过期时间（Unix 时间戳）
	RefreshToken *string `json:"refresh_token,omitempty"` // 刷新令牌（仅在 remember_me=true 时返回）
	Username     string  `json:"username"`                // 用户名
}

// Register 处理用户注册请求
// POST /api/auth/register
// 验证需求：4.1-4.6
func (ctrl *AuthController) Register(c *gin.Context) {
	var req RegisterRequest

	// 参数验证（使用 Gin binding 标签）
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("✗ 注册请求参数验证失败: %v", err)
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "请求参数无效: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 去除首尾空白字符
	req.Username = strings.TrimSpace(req.Username)

	minU := config.AppConfig.AuthUsernameMinLength
	maxU := config.AppConfig.AuthUsernameMaxLength
	minP := config.AppConfig.AuthPasswordMinLength
	maxP := config.AppConfig.AuthPasswordMaxLength

	if req.Username == "" {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "用户名不能为空",
			Data:    nil,
		})
		return
	}

	if strings.TrimSpace(req.Password) == "" {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "密码不能为空",
			Data:    nil,
		})
		return
	}

	// 额外验证：确保去除空白后仍然满足长度要求
	if len(req.Username) < minU || len(req.Username) > maxU {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: fmt.Sprintf("用户名长度必须在%d-%d字符之间", minU, maxU),
			Data:    nil,
		})
		return
	}

	if len(req.Password) < minP || len(req.Password) > maxP {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: fmt.Sprintf("密码长度必须在%d-%d字符之间", minP, maxP),
			Data:    nil,
		})
		return
	}

	// 调用服务层进行注册
	user, err := ctrl.authService.Register(req.Username, req.Password)
	if err != nil {
		var validationErr *service.AuthValidationError
		if errors.As(err, &validationErr) {
			c.JSON(400, LoginResponse{
				Code:    400,
				Message: validationErr.Error(),
				Data:    nil,
			})
			return
		}

		if errors.Is(err, service.ErrUsernameExists) {
			log.Printf("✗ 注册失败: 用户名已存在 - %s", req.Username)
			c.JSON(400, LoginResponse{
				Code:    400,
				Message: "用户名已存在",
				Data:    nil,
			})
			return
		}

		// 其他错误（数据库错误等）
		log.Printf("✗ 注册失败: %v", err)
		c.JSON(500, LoginResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	log.Printf("✓ 用户注册成功: %s (ID: %d)", user.Username, user.ID)
	// 注册即登录：自动颁发 Token
	ctrl.handleDatabaseUserLogin(c, LoginRequest{
		Username: req.Username,
		Password: req.Password,
	})
}

// CheckUsername 检查用户名是否可用
// GET /api/auth/check-username
func (ctrl *AuthController) CheckUsername(c *gin.Context) {
	username := strings.TrimSpace(c.Query("username"))
	if username == "" {
		c.JSON(400, gin.H{"code": 400, "message": "用户名不能为空", "data": false})
		return
	}

	minU := config.AppConfig.AuthUsernameMinLength
	maxU := config.AppConfig.AuthUsernameMaxLength
	if len(username) < minU || len(username) > maxU {
		c.JSON(400, gin.H{"code": 400, "message": fmt.Sprintf("用户名长度必须在%d-%d字符之间", minU, maxU), "data": false})
		return
	}

	exists, err := ctrl.authService.CheckUsernameExist(username)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": "检查失败", "data": false})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success", "data": !exists})
}

// Login 处理用户登录请求（统一接口）
// POST /api/auth/login
// 仅支持用户名密码登录，并可按需返回 refresh_token。
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

	// 验证非空（去除空白后）
	if req.Username == "" {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "用户名不能为空",
			Data:    nil,
		})
		return
	}

	if strings.TrimSpace(req.Password) == "" {
		c.JSON(400, LoginResponse{
			Code:    400,
			Message: "密码不能为空",
			Data:    nil,
		})
		return
	}

	ctrl.handleDatabaseUserLogin(c, req)
}
// handleDatabaseUserLogin 处理数据库用户登录
func (ctrl *AuthController) handleDatabaseUserLogin(c *gin.Context, req LoginRequest) {
	// 调用服务层进行登录
	token, user, _, err := ctrl.authService.Login(req.Username, req.Password)
	if err != nil {
		var validationErr *service.AuthValidationError
		if errors.As(err, &validationErr) {
			c.JSON(400, LoginResponse{
				Code:    400,
				Message: validationErr.Error(),
				Data:    nil,
			})
			return
		}

		if errors.Is(err, service.ErrInvalidCredentials) {
			log.Printf("✗ 登录失败: 用户名或密码错误 - %s", req.Username)
			c.JSON(401, LoginResponse{
				Code:    401,
				Message: "用户名或密码错误",
				Data:    nil,
			})
			return
		}

		// 账户被禁用
		if errors.Is(err, service.ErrAccountDisabled) {
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
		config.AppConfig.RefreshTokenTTL,
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
