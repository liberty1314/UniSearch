package service

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"
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

// 内置弱密码黑名单（小写归一化后比对）。覆盖最常见的弱口令。
var builtinWeakPasswords = map[string]struct{}{
	"123456":     {},
	"123456789":  {},
	"12345678":   {},
	"password":   {},
	"111111":     {},
	"123123":     {},
	"000000":     {},
	"qwerty":     {},
	"qwerty123":  {},
	"abc123":     {},
	"password1":  {},
	"1234567890": {},
	"iloveyou":   {},
	"admin":      {},
	"admin123":   {},
	"root":       {},
	"666666":     {},
	"888888":     {},
	"letmein":    {},
	"welcome":    {},
	"monkey":     {},
	"1q2w3e4r":   {},
	"passw0rd":   {},
	"zaq12wsx":   {},
}

var (
	passwordBlocklistOnce sync.Once
	passwordBlocklist     map[string]struct{}
)

// loadPasswordBlocklist 惰性加载弱密码黑名单：内置列表 + 可选的外部文件。
// 外部文件加载失败时仅使用内置列表，不阻断校验。
func loadPasswordBlocklist() map[string]struct{} {
	passwordBlocklistOnce.Do(func() {
		blocklist := make(map[string]struct{}, len(builtinWeakPasswords))
		for pw := range builtinWeakPasswords {
			blocklist[pw] = struct{}{}
		}

		path := ""
		if config.AppConfig != nil {
			path = config.AppConfig.AuthPasswordBlocklistPath
		}
		if path != "" {
			if file, err := os.Open(path); err == nil {
				defer file.Close()
				scanner := bufio.NewScanner(file)
				for scanner.Scan() {
					line := strings.ToLower(strings.TrimSpace(scanner.Text()))
					if line != "" {
						blocklist[line] = struct{}{}
					}
				}
			}
		}
		passwordBlocklist = blocklist
	})
	return passwordBlocklist
}

// isWeakPassword 判断密码是否命中弱密码黑名单（小写归一化比对）。
func isWeakPassword(password string) bool {
	blocklist := loadPasswordBlocklist()
	_, hit := blocklist[strings.ToLower(password)]
	return hit
}

// countPasswordClasses 统计密码包含的字符类别数：大写/小写/数字/符号。
func countPasswordClasses(password string) int {
	var hasUpper, hasLower, hasDigit, hasSymbol bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSymbol = true
		}
	}
	classes := 0
	for _, present := range []bool{hasUpper, hasLower, hasDigit, hasSymbol} {
		if present {
			classes++
		}
	}
	return classes
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

	requiredClasses := config.AppConfig.AuthPasswordComplexityClasses
	if requiredClasses == 0 {
		requiredClasses = 3
	}
	if countPasswordClasses(password) < requiredClasses {
		return newAuthValidationError(fmt.Sprintf("密码必须包含大写字母、小写字母、数字、符号中的至少%d类", requiredClasses))
	}

	if isWeakPassword(password) {
		return newAuthValidationError("密码过于简单，请勿使用常见弱口令")
	}

	return nil
}
