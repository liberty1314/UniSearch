package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"unisearch/model"
)

const scanTransferRefreshTimeout = 12 * time.Second

type scanTransferRefreshPlugin interface {
	RefreshScanTransfer(ctx context.Context, linkURL string, refreshKey string) (model.Link, error)
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
		writeAPIError(c, http.StatusBadRequest, "SCAN_TRANSFER_INVALID_REQUEST", "请求参数无效", nil)
		return
	}

	req.LinkURL = strings.TrimSpace(req.LinkURL)
	req.RefreshKey = strings.TrimSpace(req.RefreshKey)
	if req.LinkURL == "" || req.RefreshKey == "" {
		writeAPIError(c, http.StatusBadRequest, "SCAN_TRANSFER_INVALID_REQUEST", "请求参数无效", nil)
		return
	}

	refresher := resolveScanTransferRefreshPlugin()
	if refresher == nil {
		writeAPIError(c, http.StatusServiceUnavailable, "SCAN_TRANSFER_PLUGIN_UNAVAILABLE", "扫码刷新服务暂时不可用", nil)
		return
	}

	refreshCtx, cancel := context.WithTimeout(c.Request.Context(), scanTransferRefreshTimeout)
	defer cancel()
	refreshedLink, err := refresher.RefreshScanTransfer(refreshCtx, req.LinkURL, req.RefreshKey)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			writeAPIError(c, 499, "SCAN_TRANSFER_REQUEST_CANCELED", "请求已取消", nil)
			return
		}
		errorCode, message := scanTransferRefreshErrorResponse(err)
		writeAPIError(c, http.StatusBadRequest, errorCode, message, err)
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

func scanTransferRefreshErrorResponse(err error) (string, string) {
	if err == nil {
		return "SCAN_TRANSFER_REFRESH_FAILED", "扫码载荷刷新失败，请稍后重试"
	}

	errText := err.Error()
	if strings.Contains(errText, "refresh_key") || strings.Contains(errText, "刷新链接") {
		return "SCAN_TRANSFER_INVALID_REFRESH_KEY", "扫码刷新参数无效"
	}
	if strings.Contains(errText, "未返回可刷新的扫码转存载荷") {
		return "SCAN_TRANSFER_PAYLOAD_UNAVAILABLE", "当前资源暂时无法刷新扫码载荷"
	}
	return "SCAN_TRANSFER_REFRESH_FAILED", "扫码载荷刷新失败，请稍后重试"
}
