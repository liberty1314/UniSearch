package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"unisearch/service"
)

// ChannelMetricsRealtimeHandler 返回频道指标的内存实时快照。
func ChannelMetricsRealtimeHandler(metricsCollector *service.TGChannelMetricsCollector) gin.HandlerFunc {
	return func(c *gin.Context) {
		if metricsCollector == nil {
			c.JSON(http.StatusOK, gin.H{
				"active_channel_count": 0,
				"avg_response_ms":      0,
				"success_rate":         0,
				"timeout_rate":         0,
				"error_count":          0,
				"items":                []interface{}{},
			})
			return
		}
		c.JSON(http.StatusOK, metricsCollector.RealtimeSnapshot())
	}
}

// ChannelMetricsListHandler 返回频道性能聚合指标。
func ChannelMetricsListHandler(metricsCollector *service.TGChannelMetricsCollector) gin.HandlerFunc {
	return func(c *gin.Context) {
		if metricsCollector == nil {
			c.JSON(http.StatusOK, gin.H{
				"items":       []interface{}{},
				"range":       gin.H{},
				"granularity": "5m",
			})
			return
		}

		from, err := parseOptionalChannelMetricTime(c.Query("from"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "from 时间格式错误", "code": "INVALID_FROM"})
			return
		}
		to, err := parseOptionalChannelMetricTime(c.Query("to"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "to 时间格式错误", "code": "INVALID_TO"})
			return
		}
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))

		items, err := metricsCollector.ListMetrics(service.TGChannelMetricsQuery{
			ChannelName: c.Query("channel_name"),
			From:        from,
			To:          to,
			Limit:       limit,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "查询频道性能指标失败: " + err.Error(),
				"code":  "CHANNEL_METRICS_QUERY_FAILED",
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

// ChannelMetricsErrorLogsHandler 返回频道错误日志。
func ChannelMetricsErrorLogsHandler(metricsCollector *service.TGChannelMetricsCollector) gin.HandlerFunc {
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
		items, total, err := metricsCollector.ListErrorLogs(service.TGChannelErrorLogQuery{
			ChannelName: c.Query("channel_name"),
			Page:        page,
			PageSize:    pageSize,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "查询频道错误日志失败: " + err.Error(),
				"code":  "CHANNEL_METRICS_ERRORS_QUERY_FAILED",
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

func parseOptionalChannelMetricTime(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
