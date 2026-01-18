package util

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword 使用 bcrypt 加密密码
// 参数:
//   - password: 明文密码
//
// 返回:
//   - string: bcrypt 加密后的密码哈希
//   - error: 加密过程中的错误
//
// 验证需求: 4.4, 13.1
func HashPassword(password string) (string, error) {
	// 使用 bcrypt 的默认 cost (10) 加密密码
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

// ComparePassword 验证密码是否匹配
// 参数:
//   - hashedPassword: bcrypt 加密后的密码哈希
//   - password: 待验证的明文密码
//
// 返回:
//   - bool: 密码是否匹配，true 表示匹配，false 表示不匹配
//
// 验证需求: 4.4, 13.1
func ComparePassword(hashedPassword, password string) bool {
	// 使用 bcrypt 比较密码
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	// 如果没有错误，说明密码匹配
	return err == nil
}
