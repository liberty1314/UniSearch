package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"unisearch/model"
	"unisearch/service"
)

// PluginCenterCatalogHandler 返回本地插件与远程市场聚合后的插件中心目录。
func PluginCenterCatalogHandler(searchService *service.SearchService, pluginHealthService *service.PluginHealthService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if searchService == nil || searchService.GetPluginManager() == nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "插件管理器未初始化",
				"code":  "PLUGIN_MANAGER_NOT_INITIALIZED",
			})
			return
		}

		catalogService := service.NewPluginCatalogService(searchService.GetPluginManager(), pluginHealthService, pluginStateService)
		source := c.DefaultQuery("source", "all")
		refresh := strings.EqualFold(c.Query("refresh"), "true")
		catalog, err := catalogService.ListCatalog(source, refresh)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "获取插件中心目录失败: " + err.Error(),
				"code":  "PLUGIN_CENTER_CATALOG_FAILED",
			})
			return
		}

		c.JSON(http.StatusOK, catalog)
	}
}

// PluginCenterInstallHandler 导入远程市场中声明的 custom_url 插件。
func PluginCenterInstallHandler(searchService *service.SearchService, pluginHealthService *service.PluginHealthService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if searchService == nil || searchService.GetPluginManager() == nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "插件管理器未初始化",
				"code":  "PLUGIN_MANAGER_NOT_INITIALIZED",
			})
			return
		}

		var req model.PluginCatalogInstallRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		catalogService := service.NewPluginCatalogService(searchService.GetPluginManager(), pluginHealthService, pluginStateService)
		item, err := catalogService.InstallCatalogItem(req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
				"code":  "PLUGIN_CENTER_INSTALL_FAILED",
			})
			return
		}

		searchService.InvalidatePluginSelectorCache()
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"item":    item,
		})
	}
}
