package service

import (
	"fmt"
	"unicode"
	"unisearch/config"
)

func containsPasswordWhitespace(password string) bool {
	for _, char := range password {
		if unicode.IsSpace(char) {
			return true
		}
	}
	return false
}

// ValidateNewPassword 校验新设置的账号密码，登录时的历史密码比对不使用该规则。
func ValidateNewPassword(password string) error {
	minLength := config.AppConfig.AuthPasswordMinLength
	maxLength := config.AppConfig.AuthPasswordMaxLength
	if minLength == 0 {
		minLength = 6
	}
	if maxLength == 0 {
		maxLength = 64
	}

	if password == "" {
		return newAuthValidationError("密码不能为空")
	}

	if containsPasswordWhitespace(password) {
		return newAuthValidationError("密码不能包含空格")
	}

	if len(password) < minLength || len(password) > maxLength {
		return newAuthValidationError(fmt.Sprintf("密码长度必须在%d-%d字符之间", minLength, maxLength))
	}

	return nil
}
