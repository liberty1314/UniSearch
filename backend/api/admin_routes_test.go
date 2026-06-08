package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAdminCustomPluginRoutesAreRemoved(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	registerAdminRoutes(router.Group("/api"), RouterDeps{})

	cases := []struct {
		method string
		path   string
	}{
		{method: http.MethodPost, path: "/api/admin/plugin-center/install"},
		{method: http.MethodPost, path: "/api/admin/plugins"},
		{method: http.MethodPut, path: "/api/admin/plugins/custom-pan"},
		{method: http.MethodDelete, path: "/api/admin/plugins/custom-pan"},
		{method: http.MethodPost, path: "/api/admin/plugins/batch-delete"},
		{method: http.MethodPost, path: "/api/admin/test-url"},
	}

	for _, tc := range cases {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			if w.Code != http.StatusNotFound {
				t.Fatalf("期望旧自定义插件入口返回 404，实际为 %d: %s", w.Code, w.Body.String())
			}
		})
	}
}
