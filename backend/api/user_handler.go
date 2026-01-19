package api

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"pansou/model"
	"pansou/service"

	"github.com/gin-gonic/gin"
)

// ============ 请求/响应结构体 ============

// ListUsersRequest 用户列表查询请求
type ListUsersRequest struct {
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
	Keyword  string `form:"keyword"`
	Role     string `form:"role" binding:"omitempty,oneof=admin user"`
}

// ListUsersResponse 用户列表查询响应
type ListUsersResponse struct {
	Users      []UserInfo `json:"users"`
	Total      int64      `json:"total"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
	TotalPages int        `json:"total_pages"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID          uint       `json:"id"`
	Username    string     `json:"username"`
	Role        string     `json:"role"`
	IsEnabled   bool       `json:"is_enabled"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Password string `json:"password" binding:"required,min=6,max=64"`
	Role     string `json:"role" binding:"required,oneof=admin user"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Role     string `json:"role" binding:"required,oneof=admin user"`
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6,max=64"`
}

// SetUserStatusRequest 设置用户状态请求
type SetUserStatusRequest struct {
	IsEnabled bool `json:"is_enabled"`
}

// BatchDeleteUsersRequest 批量删除用户请求
type BatchDeleteUsersRequest struct {
	UserIDs []uint `json:"user_ids" binding:"required,min=1"`
}

// BatchUpdateRoleRequest 批量修改角色请求
type BatchUpdateRoleRequest struct {
	UserIDs []uint `json:"user_ids" binding:"required,min=1"`
	Role    string `json:"role" binding:"required,oneof=admin user"`
}

// BatchOperationResponse 批量操作响应
type BatchOperationResponse struct {
	SuccessCount int                    `json:"success_count"`
	FailedCount  int                    `json:"failed_count"`
	Success      []uint                 `json:"success"`
	Failed       []BatchOperationError  `json:"failed"`
}

// BatchOperationError 批量操作错误
type BatchOperationError struct {
	ID    uint   `json:"id"`
	Error string `json:"error"`
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

// SuccessResponse 成功响应
type SuccessResponse struct {
	Message string `json:"message"`
}

// ============ 辅助函数 ============

// getCurrentUserID 从上下文获取当前用户ID
func getCurrentUserID(c *gin.Context) (uint, error) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, nil
	}
	
	id, ok := userID.(uint)
	if !ok {
		return 0, nil
	}
	
	return id, nil
}

// convertToUserInfo 将 model.User 转换为 UserInfo
func convertToUserInfo(user *model.User) UserInfo {
	return UserInfo{
		ID:          user.ID,
		Username:    user.Username,
		Role:        user.Role,
		IsEnabled:   user.IsEnabled,
		LastLoginAt: user.LastLoginAt,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}
}

// convertToUserInfoList 将 []model.User 转换为 []UserInfo
func convertToUserInfoList(users []model.User) []UserInfo {
	result := make([]UserInfo, len(users))
	for i, user := range users {
		result[i] = convertToUserInfo(&user)
	}
	return result
}

// respondError 返回错误响应
func respondError(c *gin.Context, statusCode int, errorMsg, errorCode string) {
	log.Printf("❌ API错误 [%s %s]: %s (code: %s)", c.Request.Method, c.Request.URL.Path, errorMsg, errorCode)
	c.JSON(statusCode, ErrorResponse{
		Error: errorMsg,
		Code:  errorCode,
	})
}

// respondSuccess 返回成功响应
func respondSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, data)
}

// ============ 处理器函数 ============

// ListUsersHandler 获取用户列表
func ListUsersHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析查询参数
		var req ListUsersRequest
		if err := c.ShouldBindQuery(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请求参数错误", "INVALID_REQUEST")
			return
		}

		// 设置默认值
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}

		// 调用服务层
		result, err := userService.ListUsers(req.Page, req.PageSize, req.Keyword, req.Role)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "查询用户列表失败", "INTERNAL_SERVER_ERROR")
			return
		}

		// 转换为响应格式
		response := ListUsersResponse{
			Users:      convertToUserInfoList(result.Users),
			Total:      result.Total,
			Page:       result.Page,
			PageSize:   result.PageSize,
			TotalPages: result.TotalPages,
		}

		respondSuccess(c, response)
	}
}

// GetUserHandler 获取单个用户
func GetUserHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		userIDStr := c.Param("id")
		userID, err := strconv.ParseUint(userIDStr, 10, 32)
		if err != nil {
			respondError(c, http.StatusBadRequest, "无效的用户ID", "INVALID_USER_ID")
			return
		}

		// 调用服务层
		user, err := userService.GetUserByID(uint(userID))
		if err != nil {
			if err.Error() == "用户不存在" {
				respondError(c, http.StatusNotFound, "用户不存在", "USER_NOT_FOUND")
			} else {
				respondError(c, http.StatusInternalServerError, "查询用户失败", "INTERNAL_SERVER_ERROR")
			}
			return
		}

		respondSuccess(c, convertToUserInfo(user))
	}
}

// CreateUserHandler 创建用户
func CreateUserHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析请求体
		var req CreateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请求参数错误", "INVALID_REQUEST")
			return
		}

		// 调用服务层
		user, err := userService.CreateUser(req.Username, req.Password, req.Role)
		if err != nil {
			// 根据错误类型返回不同的状态码
			switch err.Error() {
			case "用户名已存在":
				respondError(c, http.StatusConflict, err.Error(), "USERNAME_EXISTS")
			case "用户名长度必须在3-32字符之间", "用户名只能包含字母、数字、下划线和连字符":
				respondError(c, http.StatusBadRequest, err.Error(), "INVALID_USERNAME")
			case "密码长度必须在6-64字符之间":
				respondError(c, http.StatusBadRequest, err.Error(), "INVALID_PASSWORD")
			case "角色必须是admin或user":
				respondError(c, http.StatusBadRequest, err.Error(), "INVALID_ROLE")
			default:
				respondError(c, http.StatusInternalServerError, "创建用户失败", "INTERNAL_SERVER_ERROR")
			}
			return
		}

		log.Printf("✓ 用户创建成功: %s (ID: %d, Role: %s)", user.Username, user.ID, user.Role)
		respondSuccess(c, convertToUserInfo(user))
	}
}

// UpdateUserHandler 更新用户
func UpdateUserHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		userIDStr := c.Param("id")
		userID, err := strconv.ParseUint(userIDStr, 10, 32)
		if err != nil {
			respondError(c, http.StatusBadRequest, "无效的用户ID", "INVALID_USER_ID")
			return
		}

		// 获取当前用户ID
		currentUserID, err := getCurrentUserID(c)
		if err != nil {
			respondError(c, http.StatusUnauthorized, "未授权", "UNAUTHORIZED")
			return
		}

		// 解析请求体
		var req UpdateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请求参数错误", "INVALID_REQUEST")
			return
		}

		// 调用服务层
		user, err := userService.UpdateUser(uint(userID), req.Username, req.Role, currentUserID)
		if err != nil {
			// 根据错误类型返回不同的状态码
			switch err.Error() {
			case "用户不存在":
				respondError(c, http.StatusNotFound, err.Error(), "USER_NOT_FOUND")
			case "不能修改自己的角色":
				respondError(c, http.StatusForbidden, err.Error(), "CANNOT_MODIFY_SELF_ROLE")
			case "用户名已存在":
				respondError(c, http.StatusConflict, err.Error(), "USERNAME_EXISTS")
			case "用户名长度必须在3-32字符之间", "用户名只能包含字母、数字、下划线和连字符":
				respondError(c, http.StatusBadRequest, err.Error(), "INVALID_USERNAME")
			case "角色必须是admin或user":
				respondError(c, http.StatusBadRequest, err.Error(), "INVALID_ROLE")
			default:
				respondError(c, http.StatusInternalServerError, "更新用户失败", "INTERNAL_SERVER_ERROR")
			}
			return
		}

		log.Printf("✓ 用户更新成功: %s (ID: %d, Role: %s)", user.Username, user.ID, user.Role)
		respondSuccess(c, convertToUserInfo(user))
	}
}

// ResetPasswordHandler 重置密码
func ResetPasswordHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		userIDStr := c.Param("id")
		userID, err := strconv.ParseUint(userIDStr, 10, 32)
		if err != nil {
			respondError(c, http.StatusBadRequest, "无效的用户ID", "INVALID_USER_ID")
			return
		}

		// 解析请求体
		var req ResetPasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请求参数错误", "INVALID_REQUEST")
			return
		}

		// 调用服务层
		err = userService.ResetPassword(uint(userID), req.Password)
		if err != nil {
			// 根据错误类型返回不同的状态码
			switch err.Error() {
			case "用户不存在":
				respondError(c, http.StatusNotFound, err.Error(), "USER_NOT_FOUND")
			case "密码长度必须在6-64字符之间":
				respondError(c, http.StatusBadRequest, err.Error(), "INVALID_PASSWORD")
			default:
				respondError(c, http.StatusInternalServerError, "重置密码失败", "INTERNAL_SERVER_ERROR")
			}
			return
		}

		log.Printf("✓ 密码重置成功: 用户ID %d", userID)
		respondSuccess(c, SuccessResponse{Message: "密码重置成功"})
	}
}

// DeleteUserHandler 删除用户
func DeleteUserHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		userIDStr := c.Param("id")
		userID, err := strconv.ParseUint(userIDStr, 10, 32)
		if err != nil {
			respondError(c, http.StatusBadRequest, "无效的用户ID", "INVALID_USER_ID")
			return
		}

		// 获取当前用户ID
		currentUserID, err := getCurrentUserID(c)
		if err != nil {
			respondError(c, http.StatusUnauthorized, "未授权", "UNAUTHORIZED")
			return
		}

		// 调用服务层
		err = userService.DeleteUser(uint(userID), currentUserID)
		if err != nil {
			// 根据错误类型返回不同的状态码
			switch err.Error() {
			case "用户不存在":
				respondError(c, http.StatusNotFound, err.Error(), "USER_NOT_FOUND")
			case "不能删除自己":
				respondError(c, http.StatusForbidden, err.Error(), "CANNOT_DELETE_SELF")
			case "不能删除最后一个管理员":
				respondError(c, http.StatusForbidden, err.Error(), "CANNOT_DELETE_LAST_ADMIN")
			default:
				respondError(c, http.StatusInternalServerError, "删除用户失败", "INTERNAL_SERVER_ERROR")
			}
			return
		}

		log.Printf("✓ 用户删除成功: 用户ID %d", userID)
		respondSuccess(c, SuccessResponse{Message: "用户已删除"})
	}
}

// SetUserStatusHandler 设置用户状态
func SetUserStatusHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		userIDStr := c.Param("id")
		userID, err := strconv.ParseUint(userIDStr, 10, 32)
		if err != nil {
			respondError(c, http.StatusBadRequest, "无效的用户ID", "INVALID_USER_ID")
			return
		}

		// 获取当前用户ID
		currentUserID, err := getCurrentUserID(c)
		if err != nil {
			respondError(c, http.StatusUnauthorized, "未授权", "UNAUTHORIZED")
			return
		}

		// 解析请求体
		var req SetUserStatusRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请求参数错误", "INVALID_REQUEST")
			return
		}

		// 调用服务层
		err = userService.SetUserStatus(uint(userID), req.IsEnabled, currentUserID)
		if err != nil {
			// 根据错误类型返回不同的状态码
			switch err.Error() {
			case "用户不存在":
				respondError(c, http.StatusNotFound, err.Error(), "USER_NOT_FOUND")
			case "不能禁用自己的账户":
				respondError(c, http.StatusForbidden, err.Error(), "CANNOT_DISABLE_SELF")
			default:
				respondError(c, http.StatusInternalServerError, "更新用户状态失败", "INTERNAL_SERVER_ERROR")
			}
			return
		}

		statusText := "启用"
		if !req.IsEnabled {
			statusText = "禁用"
		}
		log.Printf("✓ 用户状态更新成功: 用户ID %d (%s)", userID, statusText)
		respondSuccess(c, SuccessResponse{Message: "用户状态已更新"})
	}
}

// BatchDeleteUsersHandler 批量删除用户
func BatchDeleteUsersHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取当前用户ID
		currentUserID, err := getCurrentUserID(c)
		if err != nil {
			respondError(c, http.StatusUnauthorized, "未授权", "UNAUTHORIZED")
			return
		}

		// 解析请求体
		var req BatchDeleteUsersRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请求参数错误", "INVALID_REQUEST")
			return
		}

		// 调用服务层
		result, err := userService.BatchDeleteUsers(req.UserIDs, currentUserID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "批量删除用户失败", "INTERNAL_SERVER_ERROR")
			return
		}

		log.Printf("✓ 批量删除用户完成: 成功 %d, 失败 %d", result.SuccessCount, result.FailedCount)
		
		// 转换为响应格式
		response := BatchOperationResponse{
			SuccessCount: result.SuccessCount,
			FailedCount:  result.FailedCount,
			Success:      result.Success,
			Failed:       make([]BatchOperationError, len(result.Failed)),
		}
		for i, f := range result.Failed {
			response.Failed[i] = BatchOperationError{
				ID:    f.ID,
				Error: f.Error,
			}
		}

		respondSuccess(c, response)
	}
}

// BatchUpdateRoleHandler 批量修改角色
func BatchUpdateRoleHandler(userService *service.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取当前用户ID
		currentUserID, err := getCurrentUserID(c)
		if err != nil {
			respondError(c, http.StatusUnauthorized, "未授权", "UNAUTHORIZED")
			return
		}

		// 解析请求体
		var req BatchUpdateRoleRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请求参数错误", "INVALID_REQUEST")
			return
		}

		// 调用服务层
		result, err := userService.BatchUpdateRole(req.UserIDs, req.Role, currentUserID)
		if err != nil {
			if err.Error() == "角色必须是admin或user" {
				respondError(c, http.StatusBadRequest, err.Error(), "INVALID_ROLE")
			} else {
				respondError(c, http.StatusInternalServerError, "批量修改角色失败", "INTERNAL_SERVER_ERROR")
			}
			return
		}

		log.Printf("✓ 批量修改角色完成: 成功 %d, 失败 %d (目标角色: %s)", result.SuccessCount, result.FailedCount, req.Role)
		
		// 转换为响应格式
		response := BatchOperationResponse{
			SuccessCount: result.SuccessCount,
			FailedCount:  result.FailedCount,
			Success:      result.Success,
			Failed:       make([]BatchOperationError, len(result.Failed)),
		}
		for i, f := range result.Failed {
			response.Failed[i] = BatchOperationError{
				ID:    f.ID,
				Error: f.Error,
			}
		}

		respondSuccess(c, response)
	}
}
