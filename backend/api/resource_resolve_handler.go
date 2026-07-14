package api

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin/sidhub"
	"unisearch/service"
	"unisearch/util/logger"
)

const (
	resourceResolveTimeout  = 12 * time.Second
	resourceResolveCacheTTL = 5 * time.Minute
)

type resourceResolveRequest struct {
	ResourceID   string `json:"resource_id" binding:"required"`
	LinkID       string `json:"link_id" binding:"required"`
	ResolveToken string `json:"resolve_token" binding:"required"`
}

type resourceResolveResponse struct {
	ResourceID       string             `json:"resource_id"`
	LinkID           string             `json:"link_id"`
	ResolutionStatus string             `json:"resolution_status"`
	Link             model.ResourceLink `json:"link"`
}

type resourceResolverPlugin interface {
	ResolveResource(ctx context.Context, sourceURL string, provider string, movieID string, entryIndex int) (model.Link, error)
}

type userConcurrencyLimiter struct {
	mu     sync.Mutex
	active map[string]int
	limit  int
}

func newUserConcurrencyLimiter(limit int) *userConcurrencyLimiter {
	return &userConcurrencyLimiter{active: make(map[string]int), limit: limit}
}

func (limiter *userConcurrencyLimiter) Acquire(key string) (func(), bool) {
	if limiter == nil || limiter.limit <= 0 {
		return func() {}, true
	}
	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	if limiter.active[key] >= limiter.limit {
		return nil, false
	}
	limiter.active[key]++
	var once sync.Once
	return func() {
		once.Do(func() {
			limiter.mu.Lock()
			defer limiter.mu.Unlock()
			limiter.active[key]--
			if limiter.active[key] <= 0 {
				delete(limiter.active, key)
			}
		})
	}, true
}

type resourceResolveCacheEntry struct {
	link      model.ResourceLink
	expiresAt time.Time
}

type resourceResolveCall struct {
	done chan struct{}
	link model.ResourceLink
	err  error
}

var (
	resourceResolveRateLimiter = NewRateLimiter(3, 5*time.Second)
	resourceResolveConcurrency = newUserConcurrencyLimiter(2)
	resourceResolveMetrics     = service.NewResourceResolveMetrics()
	verifyResourceResolveToken = service.VerifyResourceResolveToken
	resourceResolveCache       sync.Map
	resourceResolveCallsMu     sync.Mutex
	resourceResolveCalls       = make(map[string]*resourceResolveCall)
)

func ResourceResolveHandler(c *gin.Context) {
	resourceResolveHandler(resourceResolveTimeout)(c)
}

func resourceResolveHandler(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		outcome := "invalid_request"
		provider := ""
		cacheHit := false
		fallbackIndex := 0
		resolveDigest := ""
		resourceResolveMetrics.Begin()
		defer func() {
			latency := time.Since(startedAt)
			resourceResolveMetrics.Finish(outcome, cacheHit, latency)
			logger.Info("resource_resolve",
				logger.String("request_id", requestIDFromContext(c)),
				logger.String("resolve_digest", resolveDigest),
				logger.String("provider", provider),
				logger.String("outcome", outcome),
				logger.Bool("cache_hit", cacheHit),
				logger.Int64("latency_ms", latency.Milliseconds()),
				logger.Int("fallback_index", fallbackIndex),
			)
		}()

		var req resourceResolveRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			writeAPIError(c, http.StatusBadRequest, "RESOURCE_RESOLVE_INVALID_REQUEST", "解析请求无效", nil)
			return
		}
		req.ResourceID = strings.TrimSpace(req.ResourceID)
		req.LinkID = strings.TrimSpace(req.LinkID)
		req.ResolveToken = strings.TrimSpace(req.ResolveToken)
		if req.ResourceID == "" || req.LinkID == "" || req.ResolveToken == "" {
			writeAPIError(c, http.StatusBadRequest, "RESOURCE_RESOLVE_INVALID_REQUEST", "解析请求无效", nil)
			return
		}
		resolveDigest = resourceResolveTokenDigest(req.ResolveToken)

		userKey := resourceResolveUserKey(c)
		if allowed, retryAfter := resourceResolveRateLimiter.AllowWithRetryAfter(userKey); !allowed {
			outcome = "rate_limited"
			setResourceResolveRetryAfter(c, retryAfter)
			writeAPIError(c, http.StatusTooManyRequests, "RESOURCE_RESOLVE_RATE_LIMITED", "请求过于频繁，请稍后重试", nil)
			return
		}
		release, acquired := resourceResolveConcurrency.Acquire(userKey)
		if !acquired {
			outcome = "concurrency_limited"
			c.Header("Retry-After", "1")
			writeAPIError(c, http.StatusTooManyRequests, "RESOURCE_RESOLVE_CONCURRENCY_LIMITED", "当前解析请求过多，请稍后重试", nil)
			return
		}
		defer release()

		secret := ""
		if config.AppConfig != nil {
			secret = config.AppConfig.ResourcePublicIDSecret
		}
		claims, err := verifyResourceResolveToken(secret, req.ResolveToken, req.ResourceID, req.LinkID)
		if err != nil {
			if errors.Is(err, service.ErrResolveTokenExpired) {
				outcome = "token_expired"
				writeAPIError(c, http.StatusGone, "RESOURCE_RESOLVE_TOKEN_EXPIRED", "解析凭据已过期，请重新搜索", nil)
				return
			}
			writeAPIError(c, http.StatusBadRequest, "RESOURCE_RESOLVE_INVALID_REQUEST", "解析请求无效", nil)
			return
		}
		provider = claims.Provider
		fallbackIndex = claims.EntryIndex

		resolveCtx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()
		cacheKey := claims.PluginID + "\x00" + req.LinkID
		link, hit, err := resolveResourceLinkOnce(resolveCtx, cacheKey, func() (model.ResourceLink, error) {
			resolver := findResourceResolverPlugin(claims.PluginID)
			if resolver == nil {
				return model.ResourceLink{}, &sidhub.ResourceResolveError{Kind: sidhub.ResolveUnavailable, Err: fmt.Errorf("resolver plugin unavailable")}
			}
			resolved, resolveErr := resolver.ResolveResource(resolveCtx, claims.SourceURL, claims.Provider, claims.MovieID, claims.EntryIndex)
			if resolveErr != nil {
				return model.ResourceLink{}, resolveErr
			}
			return buildResolvedResourceLink(req.LinkID, resolved), nil
		})
		cacheHit = hit
		if err != nil {
			outcome = writeResourceResolveError(c, err)
			return
		}

		outcome = "success"
		c.JSON(http.StatusOK, model.NewSuccessResponse(resourceResolveResponse{
			ResourceID:       req.ResourceID,
			LinkID:           req.LinkID,
			ResolutionStatus: "resolved",
			Link:             link,
		}))
	}
}

func resourceResolveUserKey(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		return "user:" + fmt.Sprint(userID)
	}
	return "ip:" + c.ClientIP()
}

func setResourceResolveRetryAfter(c *gin.Context, retryAfter time.Duration) {
	seconds := int(math.Ceil(retryAfter.Seconds()))
	if seconds < 1 {
		seconds = 1
	}
	c.Header("Retry-After", strconv.Itoa(seconds))
}

func resourceResolveTokenDigest(token string) string {
	digest := sha256.Sum256([]byte(token))
	return hex.EncodeToString(digest[:6])
}

func findResourceResolverPlugin(pluginID string) resourceResolverPlugin {
	if searchService == nil || searchService.GetPluginManager() == nil {
		return nil
	}
	for _, candidate := range searchService.GetPluginManager().GetPlugins() {
		if candidate.Name() != pluginID {
			continue
		}
		resolver, _ := candidate.(resourceResolverPlugin)
		return resolver
	}
	return nil
}

func resolveResourceLinkOnce(ctx context.Context, cacheKey string, resolve func() (model.ResourceLink, error)) (model.ResourceLink, bool, error) {
	if cached, ok := resourceResolveCache.Load(cacheKey); ok {
		entry, valid := cached.(resourceResolveCacheEntry)
		if valid && time.Now().Before(entry.expiresAt) {
			return entry.link, true, nil
		}
		resourceResolveCache.Delete(cacheKey)
	}

	resourceResolveCallsMu.Lock()
	if call, ok := resourceResolveCalls[cacheKey]; ok {
		resourceResolveCallsMu.Unlock()
		select {
		case <-ctx.Done():
			return model.ResourceLink{}, false, ctx.Err()
		case <-call.done:
			return call.link, false, call.err
		}
	}
	call := &resourceResolveCall{done: make(chan struct{})}
	resourceResolveCalls[cacheKey] = call
	resourceResolveCallsMu.Unlock()

	link, err := resolve()
	if err == nil {
		resourceResolveCache.Store(cacheKey, resourceResolveCacheEntry{link: link, expiresAt: time.Now().Add(resourceResolveCacheTTL)})
	}
	resourceResolveCallsMu.Lock()
	call.link = link
	call.err = err
	delete(resourceResolveCalls, cacheKey)
	close(call.done)
	resourceResolveCallsMu.Unlock()
	return link, false, err
}

func buildResolvedResourceLink(linkID string, link model.Link) model.ResourceLink {
	var datetime *time.Time
	if !link.Datetime.IsZero() {
		copy := link.Datetime
		datetime = &copy
	}
	var scanTransfer *model.ScanTransferInfo
	scanTransfer = sanitizePublicScanTransferInfo(link.ScanTransfer)
	return model.ResourceLink{
		ID:           linkID,
		Type:         link.Type,
		URL:          link.URL,
		Password:     link.Password,
		AccessMode:   link.AccessMode,
		ScanTransfer: scanTransfer,
		Title:        link.WorkTitle,
		WorkTitle:    link.WorkTitle,
		Datetime:     datetime,
		Resolution:   &model.ResourceLinkResolution{Status: "resolved"},
	}
}

func writeResourceResolveError(c *gin.Context, err error) string {
	if errors.Is(err, context.DeadlineExceeded) && c.Request.Context().Err() == nil {
		writeAPIError(c, http.StatusGatewayTimeout, "RESOURCE_RESOLVE_TIMEOUT", "资源解析超时，请稍后重试", nil)
		return "timeout"
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		writeAPIError(c, 499, "RESOURCE_RESOLVE_REQUEST_CANCELED", "请求已取消", nil)
		return "request_canceled"
	}
	var resolveErr *sidhub.ResourceResolveError
	if errors.As(err, &resolveErr) {
		switch resolveErr.Kind {
		case sidhub.ResolveInvalidRequest:
			writeAPIError(c, http.StatusBadRequest, "RESOURCE_RESOLVE_INVALID_REQUEST", "解析请求无效", nil)
			return "invalid_request"
		case sidhub.ResolveInvalid:
			writeAPIError(c, http.StatusGone, "RESOURCE_INVALID", "当前资源已失效", nil)
			return "resource_invalid"
		case sidhub.ResolveParseFailed:
			writeAPIError(c, http.StatusBadGateway, "RESOURCE_UPSTREAM_PARSE_FAILED", "上游页面暂时无法解析", nil)
			return "upstream_parse_failed"
		case sidhub.ResolveUnavailable:
			writeAPIError(c, http.StatusServiceUnavailable, "RESOURCE_RESOLVER_UNAVAILABLE", "资源解析服务暂时不可用", nil)
			return "resolver_unavailable"
		}
	}
	writeAPIError(c, http.StatusServiceUnavailable, "RESOURCE_RESOLVER_UNAVAILABLE", "资源解析服务暂时不可用", nil)
	return "resolver_unavailable"
}

func resetResourceResolveStateForTest() {
	resourceResolveRateLimiter = NewRateLimiter(3, 5*time.Second)
	resourceResolveConcurrency = newUserConcurrencyLimiter(2)
	resourceResolveMetrics = service.NewResourceResolveMetrics()
	resourceResolveCache = sync.Map{}
	resourceResolveCallsMu.Lock()
	resourceResolveCalls = make(map[string]*resourceResolveCall)
	resourceResolveCallsMu.Unlock()
}
