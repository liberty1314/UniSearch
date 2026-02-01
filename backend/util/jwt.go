package util

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims JWT载荷结构（已弃用，请使用 JWTClaims）
type Claims struct {
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"` // 是否为管理员
	APIKey   string `json:"api_key"`  // 关联的API Key
	jwt.RegisteredClaims
}

// JWTClaims JWT载荷结构（新版本，符合 apikey-mysql-migration 规范）
// 包含 UserID, Username, Role 字段，用于用户身份验证和权限控制
type JWTClaims struct {
	UserID   uint   `json:"user_id"`  // 用户ID
	Username string `json:"username"` // 用户名
	Role     string `json:"role"`     // 用户角色（admin 或 user）
	APIKey   string `json:"api_key,omitempty"` // API Key（仅用于 API Key 登录）
	jwt.RegisteredClaims
}

// GenerateToken 生成JWT token（旧版本，已弃用）
func GenerateToken(username string, isAdmin bool, secret string, expiry time.Duration) (string, error) {
	return GenerateTokenWithAPIKey(username, isAdmin, "", secret, expiry)
}

// GenerateTokenWithAPIKey 生成带API Key的JWT token（旧版本，已弃用）
func GenerateTokenWithAPIKey(username string, isAdmin bool, apiKey string, secret string, expiry time.Duration) (string, error) {
	if username == "" {
		return "", errors.New("username cannot be empty")
	}
	if secret == "" {
		return "", errors.New("secret cannot be empty")
	}

	expirationTime := time.Now().Add(expiry)
	claims := &Claims{
		Username: username,
		IsAdmin:  isAdmin,
		APIKey:   apiKey,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "unisearch",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GenerateJWTToken 生成JWT Token（新版本，符合 apikey-mysql-migration 规范）
// 参数：
//   - userID: 用户ID
//   - username: 用户名
//   - role: 用户角色（admin 或 user）
//   - secret: JWT 签名密钥
//   - expiry: Token 过期时间（建议 24 小时）
// 返回：
//   - string: 生成的 JWT Token 字符串
//   - error: 错误信息
// 验证需求：5.5, 5.6, 13.6
func GenerateJWTToken(userID uint, username, role, secret string, expiry time.Duration) (string, error) {
	return GenerateJWTTokenWithAPIKey(userID, username, role, "", secret, expiry)
}

// GenerateJWTTokenWithAPIKey 生成带 API Key 的 JWT Token
// 参数：
//   - userID: 用户ID
//   - username: 用户名
//   - role: 用户角色（admin 或 user）
//   - apiKey: API Key（可选，仅用于 API Key 登录）
//   - secret: JWT 签名密钥
//   - expiry: Token 过期时间（建议 24 小时）
// 返回：
//   - string: 生成的 JWT Token 字符串
//   - error: 错误信息
func GenerateJWTTokenWithAPIKey(userID uint, username, role, apiKey, secret string, expiry time.Duration) (string, error) {
	if username == "" {
		return "", errors.New("username cannot be empty")
	}
	if role == "" {
		return "", errors.New("role cannot be empty")
	}
	if secret == "" {
		return "", errors.New("secret cannot be empty")
	}

	expirationTime := time.Now().Add(expiry)
	claims := &JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		APIKey:   apiKey,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "unisearch",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken 验证JWT token（旧版本，已弃用）
func ValidateToken(tokenString string, secret string) (*Claims, error) {
	if tokenString == "" {
		return nil, errors.New("token cannot be empty")
	}
	if secret == "" {
		return nil, errors.New("secret cannot be empty")
	}

	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// 验证签名算法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// ValidateJWTToken 验证JWT Token（新版本，符合 apikey-mysql-migration 规范）
// 参数：
//   - tokenString: JWT Token 字符串
//   - secret: JWT 签名密钥
// 返回：
//   - *JWTClaims: 解析后的 JWT Claims（包含 UserID, Username, Role）
//   - error: 错误信息
// 验证需求：5.5, 5.6, 13.6
func ValidateJWTToken(tokenString string, secret string) (*JWTClaims, error) {
	if tokenString == "" {
		return nil, errors.New("token cannot be empty")
	}
	if secret == "" {
		return nil, errors.New("secret cannot be empty")
	}

	claims := &JWTClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// 验证签名算法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	// 验证必需字段
	// 注意：API Key 用户的 user_id 可以为 0，所以不验证 user_id
	if claims.Username == "" {
		return nil, errors.New("invalid token: missing username")
	}
	if claims.Role == "" {
		return nil, errors.New("invalid token: missing role")
	}

	return claims, nil
}
