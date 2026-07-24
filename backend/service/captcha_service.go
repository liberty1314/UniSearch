package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"unisearch/config"
)

// turnstileVerifyURL 是 Cloudflare Turnstile 服务端校验端点。
// 声明为变量以便测试时替换为本地 httptest 服务地址。
var turnstileVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// captchaHTTPTimeout 是人机验证请求的超时时间。
const captchaHTTPTimeout = 5 * time.Second

// ErrCaptchaConfigMissing 表示服务端缺少校验密钥等配置。
var ErrCaptchaConfigMissing = errors.New("人机验证未正确配置")

// ErrCaptchaFailed 表示人机验证令牌校验失败。
var ErrCaptchaFailed = errors.New("人机验证未通过")

// ErrCaptchaTokenEmpty 表示未提供人机验证令牌。
var ErrCaptchaTokenEmpty = errors.New("缺少人机验证令牌")

// CaptchaService 提供注册人机验证能力，通过 provider 抽象以便未来扩展。
type CaptchaService struct {
	httpClient *http.Client
}

// NewCaptchaService 创建人机验证服务实例。
// 若传入的 httpClient 为空，则使用带 5s 超时的默认客户端。
func NewCaptchaService(httpClient *http.Client) *CaptchaService {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: captchaHTTPTimeout}
	}
	return &CaptchaService{httpClient: httpClient}
}

// turnstileVerifyResponse 是 Cloudflare Turnstile 校验响应结构。
type turnstileVerifyResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
}

// Verify 校验人机验证令牌。
// provider 目前仅支持 "turnstile"；token 为客户端返回的验证令牌；remoteIP 为客户端 IP（可为空）。
func (s *CaptchaService) Verify(ctx context.Context, provider, token, remoteIP string) error {
	normalizedProvider := strings.ToLower(strings.TrimSpace(provider))
	if normalizedProvider == "" {
		normalizedProvider = "turnstile"
	}

	switch normalizedProvider {
	case "turnstile":
		return s.verifyTurnstile(ctx, token, remoteIP)
	default:
		return fmt.Errorf("不支持的人机验证提供方: %s", provider)
	}
}

func (s *CaptchaService) verifyTurnstile(ctx context.Context, token, remoteIP string) error {
	if strings.TrimSpace(token) == "" {
		return ErrCaptchaTokenEmpty
	}

	secret := config.GetTurnstileSecretKey()
	if secret == "" {
		return ErrCaptchaConfigMissing
	}

	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", token)
	if strings.TrimSpace(remoteIP) != "" {
		form.Set("remoteip", remoteIP)
	}

	reqCtx := ctx
	if reqCtx == nil {
		reqCtx = context.Background()
	}

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, turnstileVerifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("构建人机验证请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := s.httpClient
	if client == nil {
		client = &http.Client{Timeout: captchaHTTPTimeout}
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("请求人机验证服务失败: %w", err)
	}
	defer resp.Body.Close()

	var result turnstileVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("解析人机验证响应失败: %w", err)
	}

	if !result.Success {
		if len(result.ErrorCodes) > 0 {
			return fmt.Errorf("%w: %s", ErrCaptchaFailed, strings.Join(result.ErrorCodes, ","))
		}
		return ErrCaptchaFailed
	}

	return nil
}
