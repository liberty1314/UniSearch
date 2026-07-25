package api

import (
	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/util"
)

// VerifyHandler 验证token有效性
func VerifyHandler(c *gin.Context) {
	// 如果未启用认证，直接返回有效
	if !config.AppConfig.AuthEnabled {
		c.JSON(200, gin.H{
			"valid":   true,
			"message": "认证功能未启用",
		})
		return
	}

	// 如果能到达这里，说明中间件已经验证通过
	username, exists := c.Get("username")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	c.JSON(200, gin.H{
		"valid":    true,
		"username": username,
	})
}

// LogoutHandler 退出登录：将当前 access token 的 JTI 加入吊销名单，使其立即失效。
func LogoutHandler(c *gin.Context) {
	revokeRequestAccessToken(c)
	util.ClearRefreshTokenCookie(c)
	c.JSON(200, gin.H{"message": "退出成功"})
}
