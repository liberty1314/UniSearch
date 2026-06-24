package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/service"
)

type pluginRuntimeConfigRequest struct {
	Config map[string]interface{} `json:"config"`
}

func GetPluginRuntimeConfigHandler(searchService *service.SearchService, configService *service.PluginRuntimeConfigService) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("pluginName")
		manifest, ok := resolvePluginRuntimeConfigManifest(searchService, name)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "插件不存在", "code": "PLUGIN_NOT_FOUND"})
			return
		}

		config, err := configService.GetConfig(name, manifest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取插件配置失败", "code": "PLUGIN_CONFIG_READ_FAILED"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"plugin_name": name,
			"config":      config,
		})
	}
}

func SavePluginRuntimeConfigHandler(searchService *service.SearchService, configService *service.PluginRuntimeConfigService) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("pluginName")
		manifest, ok := resolvePluginRuntimeConfigManifest(searchService, name)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "插件不存在", "code": "PLUGIN_NOT_FOUND"})
			return
		}

		var req pluginRuntimeConfigRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "code": "INVALID_REQUEST"})
			return
		}

		config, err := configService.SaveConfig(name, manifest, req.Config)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "PLUGIN_CONFIG_INVALID"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"plugin_name": name,
			"config":      config,
		})
	}
}

func resolvePluginRuntimeConfigManifest(searchService *service.SearchService, name string) (model.PluginManifest, bool) {
	if searchService == nil || searchService.GetPluginManager() == nil {
		return model.PluginManifest{}, false
	}
	for _, currentPlugin := range searchService.GetPluginManager().GetPlugins() {
		if currentPlugin.Name() == name {
			return plugin.ResolvePluginManifest(currentPlugin), true
		}
	}
	return model.PluginManifest{}, false
}
