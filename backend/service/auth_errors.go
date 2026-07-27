package service

import "errors"

var (
	ErrUsernameExists        = errors.New("用户名已存在")
	ErrInvalidCredentials    = errors.New("用户名或密码错误")
	ErrAccountDisabled       = errors.New("账户已被禁用")
	ErrSignupDisabled        = errors.New("用户注册功能已关闭")
	ErrLoginDisabled         = errors.New("用户登录功能已关闭")
	ErrAuthStateUnavailable  = errors.New("账户授权状态暂时不可用")
	ErrAuthPolicyUnavailable = errors.New("认证策略暂时不可用")
)

type AuthValidationError struct {
	Message string
}

func (e *AuthValidationError) Error() string {
	return e.Message
}

func newAuthValidationError(message string) error {
	return &AuthValidationError{Message: message}
}
