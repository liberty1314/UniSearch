package api

import (
	"context"
	"net/http"

	"unisearch/model"

	"github.com/gin-gonic/gin"
)

type HotRankingQueryService interface {
	GetHotRankings(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error)
}

func GetHotRankingHandler(hotRankingService HotRankingQueryService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if hotRankingService == nil {
			c.JSON(http.StatusInternalServerError, model.NewErrorResponse(500, "热门榜单服务未初始化"))
			return
		}

		period := model.NormalizeHotRankingPeriod(c.Query("period"))
		category := model.NormalizeHotRankingCategory(c.Query("category"))

		response, err := hotRankingService.GetHotRankings(c.Request.Context(), period, category)
		if err != nil {
			c.JSON(http.StatusInternalServerError, model.NewErrorResponse(500, "获取热门榜单失败: "+err.Error()))
			return
		}

		c.JSON(http.StatusOK, model.NewSuccessResponse(response))
	}
}
