package api

import (
	"context"
	"net/http"

	"unisearch/model"

	"github.com/gin-gonic/gin"
)

type HotRankingQueryService interface {
	GetHotRankings(ctx context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error)
}

func GetHotRankingHandler(hotRankingService HotRankingQueryService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if hotRankingService == nil {
			c.JSON(http.StatusInternalServerError, model.NewErrorResponse(500, "热门榜单服务未初始化"))
			return
		}

		query := model.HotRankingQuery{
			Mode:      model.NormalizeHotRankingMode(c.Query("mode")),
			Period:    model.NormalizeHotRankingPeriod(c.Query("period")),
			Category:  model.NormalizeHotRankingCategory(c.Query("category")),
			SortBy:    model.NormalizeHotRankingSortBy(c.Query("sort_by")),
			Date:      c.Query("date"),
			WeekStart: c.Query("week_start"),
			Month:     c.Query("month"),
			Year:      c.Query("year"),
			Page:      model.NormalizeHotRankingPage(c.Query("page")),
			PageSize:  model.NormalizeHotRankingPageSize(c.Query("page_size")),
		}

		if err := model.ValidateHotRankingQuery(query); err != nil {
			c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, "无效的热门榜单参数: "+err.Error()))
			return
		}

		response, err := hotRankingService.GetHotRankings(c.Request.Context(), query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, model.NewErrorResponse(500, "获取热门榜单失败: "+err.Error()))
			return
		}

		c.JSON(http.StatusOK, model.NewSuccessResponse(response))
	}
}
