package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"unisearch/model"
)

func ResourceResolveMetricsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, model.NewSuccessResponse(resourceResolveMetrics.Snapshot()))
}
