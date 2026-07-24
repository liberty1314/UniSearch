package service

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// withTurnstileVerifyURL 临时替换 Turnstile 校验端点，测试结束后恢复。
func withTurnstileVerifyURL(t *testing.T, url string) {
	t.Helper()
	original := turnstileVerifyURL
	turnstileVerifyURL = url
	t.Cleanup(func() {
		turnstileVerifyURL = original
	})
}

func TestCaptchaServiceVerifyTurnstileSuccess(t *testing.T) {
	t.Setenv("TURNSTILE_SECRET_KEY", "test-secret")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Fatalf("解析表单失败: %v", err)
		}
		if got := r.PostFormValue("secret"); got != "test-secret" {
			t.Errorf("secret 不匹配: got %q", got)
		}
		if got := r.PostFormValue("response"); got != "valid-token" {
			t.Errorf("response 不匹配: got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true}`))
	}))
	defer server.Close()
	withTurnstileVerifyURL(t, server.URL)

	svc := NewCaptchaService(server.Client())
	if err := svc.Verify(context.Background(), "turnstile", "valid-token", "1.2.3.4"); err != nil {
		t.Fatalf("期望校验通过，实际错误: %v", err)
	}
}

func TestCaptchaServiceVerifyTurnstileFailure(t *testing.T) {
	t.Setenv("TURNSTILE_SECRET_KEY", "test-secret")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":false,"error-codes":["invalid-input-response"]}`))
	}))
	defer server.Close()
	withTurnstileVerifyURL(t, server.URL)

	svc := NewCaptchaService(server.Client())
	err := svc.Verify(context.Background(), "turnstile", "bad-token", "")
	if err == nil {
		t.Fatal("期望校验失败，实际通过")
	}
	if !errors.Is(err, ErrCaptchaFailed) {
		t.Fatalf("期望 ErrCaptchaFailed，实际: %v", err)
	}
}

func TestCaptchaServiceVerifyTokenEmpty(t *testing.T) {
	t.Setenv("TURNSTILE_SECRET_KEY", "test-secret")

	svc := NewCaptchaService(nil)
	err := svc.Verify(context.Background(), "turnstile", "  ", "")
	if !errors.Is(err, ErrCaptchaTokenEmpty) {
		t.Fatalf("期望 ErrCaptchaTokenEmpty，实际: %v", err)
	}
}

func TestCaptchaServiceVerifySecretMissing(t *testing.T) {
	t.Setenv("TURNSTILE_SECRET_KEY", "")

	svc := NewCaptchaService(nil)
	err := svc.Verify(context.Background(), "turnstile", "some-token", "")
	if !errors.Is(err, ErrCaptchaConfigMissing) {
		t.Fatalf("期望 ErrCaptchaConfigMissing，实际: %v", err)
	}
}

func TestCaptchaServiceVerifyUnsupportedProvider(t *testing.T) {
	svc := NewCaptchaService(nil)
	err := svc.Verify(context.Background(), "hcaptcha", "token", "")
	if err == nil {
		t.Fatal("期望不支持的提供方返回错误")
	}
}
