package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"unisearch/service"
)

// PluginMetricsRealtimeHandler 返回插件指标的内存实时快照。
func PluginMetricsRealtimeHandler(metricsCollector *service.PluginMetricsCollector) gin.HandlerFunc {
	return func(c *gin.Context) {
		if metricsCollector == nil {
			c.JSON(http.StatusOK, gin.H{
				"active_plugin_count": 0,
				"avg_response_ms":     0,
				"success_rate":        0,
				"timeout_rate":        0,
				"error_count":         0,
				"items":               []interface{}{},
			})
			return
		}
		c.JSON(http.StatusOK, metricsCollector.RealtimeSnapshot())
	}
}

// PluginMetricsListHandler 返回插件性能聚合指标。
func PluginMetricsListHandler(metricsCollector *service.PluginMetricsCollector) gin.HandlerFunc {
	return func(c *gin.Context) {
		if metricsCollector == nil {
			c.JSON(http.StatusOK, gin.H{
				"items":       []interface{}{},
				"range":       gin.H{},
				"granularity": "5m",
			})
			return
		}

		from, err := parseOptionalPluginMetricTime(c.Query("from"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "from 时间格式错误", "code": "INVALID_FROM"})
			return
		}
		to, err := parseOptionalPluginMetricTime(c.Query("to"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "to 时间格式错误", "code": "INVALID_TO"})
			return
		}
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))

		items, err := metricsCollector.ListMetrics(service.PluginMetricsQuery{
			PluginName: c.Query("plugin_name"),
			From:       from,
			To:         to,
			Limit:      limit,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "查询插件性能指标失败: " + err.Error(),
				"code":  "PLUGIN_METRICS_QUERY_FAILED",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"items":       items,
			"range":       gin.H{"from": from, "to": to},
			"granularity": "5m",
		})
	}
}

// PluginMetricsErrorLogsHandler 返回插件错误日志。
func PluginMetricsErrorLogsHandler(metricsCollector *service.PluginMetricsCollector) gin.HandlerFunc {
	return func(c *gin.Context) {
		if metricsCollector == nil {
			c.JSON(http.StatusOK, gin.H{
				"items":     []interface{}{},
				"page":      1,
				"page_size": 20,
				"total":     0,
			})
			return
		}

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
		items, total, err := metricsCollector.ListErrorLogs(service.PluginErrorLogQuery{
			PluginName: c.Query("plugin_name"),
			Page:       page,
			PageSize:   pageSize,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "查询插件错误日志失败: " + err.Error(),
				"code":  "PLUGIN_METRICS_ERRORS_QUERY_FAILED",
			})
			return
		}

		if page <= 0 {
			page = 1
		}
		if pageSize <= 0 || pageSize > 100 {
			pageSize = 20
		}
		c.JSON(http.StatusOK, gin.H{
			"items":     items,
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		})
	}
}

func parseOptionalPluginMetricTime(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
