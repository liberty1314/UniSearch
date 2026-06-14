package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"unisearch/model"
)

type scanTransferRefreshPlugin interface {
	RefreshScanTransfer(linkURL string, refreshKey string) (model.Link, error)
}

type scanTransferRefreshRequest struct {
	ResourceID string `json:"resource_id"`
	LinkURL    string `json:"link_url"`
	RefreshKey string `json:"refresh_key"`
}

type scanTransferRefreshResponse struct {
	ResourceID   string                  `json:"resource_id,omitempty"`
	LinkURL      string                  `json:"link_url"`
	AccessMode   string                  `json:"access_mode"`
	ScanTransfer *model.ScanTransferInfo `json:"scan_transfer,omitempty"`
}

// RefreshScanTransferHandler 刷新当前资源的二维码或扫码转存载荷。
func RefreshScanTransferHandler(c *gin.Context) {
	var req scanTransferRefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, "请求参数无效"))
		return
	}

	req.LinkURL = strings.TrimSpace(req.LinkURL)
	req.RefreshKey = strings.TrimSpace(req.RefreshKey)
	if req.LinkURL == "" || req.RefreshKey == "" {
		c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, "link_url 和 refresh_key 不能为空"))
		return
	}

	refresher := resolveScanTransferRefreshPlugin()
	if refresher == nil {
		c.JSON(http.StatusServiceUnavailable, model.NewErrorResponse(503, "SeedHub 插件不可用"))
		return
	}

	refreshedLink, err := refresher.RefreshScanTransfer(req.LinkURL, req.RefreshKey)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, err.Error()))
		return
	}

	c.JSON(http.StatusOK, model.NewSuccessResponse(scanTransferRefreshResponse{
		ResourceID:   strings.TrimSpace(req.ResourceID),
		LinkURL:      req.LinkURL,
		AccessMode:   strings.TrimSpace(refreshedLink.AccessMode),
		ScanTransfer: refreshedLink.ScanTransfer,
	}))
}

func resolveScanTransferRefreshPlugin() scanTransferRefreshPlugin {
	if searchService == nil || searchService.GetPluginManager() == nil {
		return nil
	}

	for _, candidate := range searchService.GetPluginManager().GetPlugins() {
		if candidate.Name() != "sidhub" {
			continue
		}
		if refresher, ok := candidate.(scanTransferRefreshPlugin); ok {
			return refresher
		}
	}

	return nil
}
