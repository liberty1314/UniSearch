package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"unisearch/config"
	"unisearch/model"
	"unisearch/util"
	jsonutil "unisearch/util/json"
)

func parseSearchRequest(c *gin.Context) (model.SearchRequest, error) {
	var req model.SearchRequest
	var err error

	if c.Request.Method == http.MethodGet {
		req, err = parseGetSearchRequest(c)
	} else {
		req, err = parsePostSearchRequest(c)
	}
	if err != nil {
		return model.SearchRequest{}, err
	}

	return normalizeHTTPSearchRequest(req), nil
}

func parseGetSearchRequest(c *gin.Context) (model.SearchRequest, error) {
	ext, err := parseExtParam(c.Query("ext"))
	if err != nil {
		return model.SearchRequest{}, err
	}

	filter, err := parseFilterParam(c.Query("filter"))
	if err != nil {
		return model.SearchRequest{}, err
	}

	return model.SearchRequest{
		Keyword:      c.Query("kw"),
		Channels:     splitCommaParam(c.Query("channels")),
		Concurrency:  parseOptionalInt(c.Query("conc")),
		ForceRefresh: strings.TrimSpace(c.Query("refresh")) == "true",
		ResultType:   strings.TrimSpace(c.Query("res")),
		SourceType:   strings.TrimSpace(c.Query("src")),
		Plugins:      splitCommaParam(c.Query("plugins")),
		CloudTypes:   splitCommaParam(c.Query("cloud_types")),
		Ext:          ext,
		Filter:       filter,
	}, nil
}

func parsePostSearchRequest(c *gin.Context) (model.SearchRequest, error) {
	data, err := c.GetRawData()
	if err != nil {
		return model.SearchRequest{}, searchRequestParseError("读取请求数据失败: " + err.Error())
	}

	var req model.SearchRequest
	if err := jsonutil.Unmarshal(data, &req); err != nil {
		return model.SearchRequest{}, searchRequestParseError("无效的请求参数: " + err.Error())
	}
	return req, nil
}

func normalizeHTTPSearchRequest(req model.SearchRequest) model.SearchRequest {
	if len(req.Channels) == 0 {
		req.Channels = defaultSearchChannels()
	}

	if req.ResultType == "" {
		req.ResultType = "merged_by_type"
	} else if req.ResultType == "merge" {
		req.ResultType = "merged_by_type"
	}

	if req.SourceType == "" {
		req.SourceType = "all"
	}

	if req.SourceType == "tg" {
		req.Plugins = nil
	} else if req.SourceType == "plugin" {
		req.Channels = nil
	} else if req.SourceType == "all" && len(req.Plugins) == 0 {
		req.Plugins = nil
	}

	if req.Ext == nil {
		req.Ext = make(map[string]interface{})
	}

	return req
}

func defaultSearchChannels() []string {
	if tgChannelService != nil {
		dbChannels, err := tgChannelService.GetEnabledChannels()
		if err == nil && len(dbChannels) > 0 {
			return append([]string(nil), dbChannels...)
		}
	}

	if config.AppConfig == nil {
		return nil
	}

	return append([]string(nil), config.AppConfig.DefaultChannels...)
}

func parseExtParam(value string) (map[string]interface{}, error) {
	if strings.TrimSpace(value) == "" {
		return make(map[string]interface{}), nil
	}

	ext := make(map[string]interface{})
	if strings.TrimSpace(value) == "{}" {
		return ext, nil
	}

	if err := jsonutil.Unmarshal([]byte(value), &ext); err != nil {
		return nil, searchRequestParseError("无效的ext参数格式: " + err.Error())
	}
	if ext == nil {
		return make(map[string]interface{}), nil
	}
	return ext, nil
}

func parseFilterParam(value string) (*model.FilterConfig, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}

	filter := &model.FilterConfig{}
	if err := jsonutil.Unmarshal([]byte(value), filter); err != nil {
		return nil, searchRequestParseError("无效的filter参数格式: " + err.Error())
	}
	return filter, nil
}

func splitCommaParam(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			items = append(items, trimmed)
		}
	}

	if len(items) == 0 {
		return nil
	}
	return items
}

func parseOptionalInt(value string) int {
	if strings.TrimSpace(value) == "" {
		return 0
	}
	return util.StringToInt(value)
}

type searchRequestParseError string

func (e searchRequestParseError) Error() string {
	return string(e)
}
