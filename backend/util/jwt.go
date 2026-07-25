package util

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims JWT载荷结构（新版本，符合 apikey-mysql-migration 规范）
// 包含 UserID, Username, Role 字段，用于用户身份验证和权限控制。
// TokenVersion 用于批量失效（改密/封禁时递增用户版本），JTI（RegisteredClaims.ID）
// 用于单个 Token 精确吊销（登出）。
type JWTClaims struct {
	UserID       uint   `json:"user_id"`       // 用户ID
	Username     string `json:"username"`      // 用户名
	Role         string `json:"role"`          // 用户角色（admin 或 user）
	TokenVersion int    `json:"token_version"` // 令牌版本，与用户当前版本不一致即失效
	jwt.RegisteredClaims
}

// generateJTI 生成随机的 JWT ID（16 字节十六进制），用于精确吊销单个 Token。
func generateJTI() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// GenerateJWTToken 生成JWT Token（新版本，符合 apikey-mysql-migration 规范）
// 参数：
//   - userID: 用户ID
//   - username: 用户名
//   - role: 用户角色（admin 或 user）
//   - tokenVersion: 用户当前令牌版本（用于批量失效）
//   - secret: JWT 签名密钥
//   - expiry: Token 过期时间（建议 24 小时）
//
// 返回：
//   - string: 生成的 JWT Token 字符串
//   - error: 错误信息
//
// 验证需求：5.5, 5.6, 13.6
func GenerateJWTToken(userID uint, username, role string, tokenVersion int, secret string, expiry time.Duration) (string, error) {
	if username == "" {
		return "", errors.New("username cannot be empty")
	}
	if role == "" {
		return "", errors.New("role cannot be empty")
	}
	if secret == "" {
		return "", errors.New("secret cannot be empty")
	}

	jti, err := generateJTI()
	if err != nil {
		return "", err
	}

	expirationTime := time.Now().Add(expiry)
	claims := &JWTClaims{
		UserID:       userID,
		Username:     username,
		Role:         role,
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "unisearch",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateJWTToken 验证JWT Token（新版本，符合 apikey-mysql-migration 规范）
// 参数：
//   - tokenString: JWT Token 字符串
//   - secret: JWT 签名密钥
//
// 返回：
//   - *JWTClaims: 解析后的 JWT Claims（包含 UserID, Username, Role）
//   - error: 错误信息
//
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
	if claims.Username == "" {
		return nil, errors.New("invalid token: missing username")
	}
	if claims.Role == "" {
		return nil, errors.New("invalid token: missing role")
	}

	return claims, nil
}
