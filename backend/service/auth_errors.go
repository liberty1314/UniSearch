package service

import "errors"

var (
	ErrUsernameExists     = errors.New("用户名已存在")
	ErrInvalidCredentials = errors.New("用户名或密码错误")
	ErrAccountDisabled    = errors.New("账户已被禁用")
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
