package service

import (
	"bytes"
	"encoding/base64"
	"errors"
	"strings"
	"testing"
	"time"

	"unisearch/model"
)

const testResourceResolveSecret = "resource-resolve-test-secret-with-at-least-32-bytes"

func newTestResourceResolveTokenCodec(t *testing.T, now time.Time, nonceBytes []byte) *resourceResolveTokenCodec {
	t.Helper()
	codec, err := newResourceResolveTokenCodec(testResourceResolveSecret)
	if err != nil {
		t.Fatalf("create token codec: %v", err)
	}
	codec.now = func() time.Time { return now }
	codec.rand = bytes.NewReader(nonceBytes)
	return codec
}

func testResolveTokenClaims() resourceResolveTokenClaims {
	return resourceResolveTokenClaims{
		ResourceID: "r_v1_resource",
		LinkID:     "lnk_v1_link",
		PluginID:   "sidhub",
		Provider:   "quark",
		SourceURL:  "https://www.seedhub.cc/link_start/?redirect_to=private_4259",
		MovieID:    "4259",
		EntryIndex: 3,
	}
}

func TestResourceResolveTokenEncryptsAndVerifiesClaims(t *testing.T) {
	now := time.Date(2026, 7, 13, 18, 0, 0, 0, time.UTC)
	codec := newTestResourceResolveTokenCodec(t, now, bytes.Repeat([]byte{1}, 12))
	claims := testResolveTokenClaims()

	token, err := codec.Sign(claims)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	for _, plaintext := range []string{"seedhub.cc", "/link_start/", "4259", "quark"} {
		if strings.Contains(token, plaintext) {
			t.Fatalf("token must not expose %q: %s", plaintext, token)
		}
	}

	verified, err := codec.Verify(token, claims.ResourceID, claims.LinkID)
	if err != nil {
		t.Fatalf("verify token: %v", err)
	}
	if verified.SourceURL != claims.SourceURL || verified.PluginID != claims.PluginID || verified.Provider != claims.Provider {
		t.Fatalf("verified claims mismatch: %#v", verified)
	}
	if verified.IssuedAt != now.Unix() || verified.ExpiresAt != now.Add(24*time.Hour).Unix() {
		t.Fatalf("unexpected token lifetime: %#v", verified)
	}
}

func TestResourceResolveTokenRejectsTamperingAndIdentityMismatch(t *testing.T) {
	now := time.Date(2026, 7, 13, 18, 0, 0, 0, time.UTC)
	codec := newTestResourceResolveTokenCodec(t, now, bytes.Repeat([]byte{2}, 12))
	claims := testResolveTokenClaims()
	token, err := codec.Sign(claims)
	if err != nil {
		t.Fatal(err)
	}

	payload, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(token, resourceResolveTokenPrefix))
	if err != nil {
		t.Fatal(err)
	}
	for _, index := range []int{0, len(payload) - 1} {
		tampered := append([]byte(nil), payload...)
		tampered[index] ^= 0xff
		tamperedToken := resourceResolveTokenPrefix + base64.RawURLEncoding.EncodeToString(tampered)
		if _, err := codec.Verify(tamperedToken, claims.ResourceID, claims.LinkID); !errors.Is(err, ErrResolveTokenInvalid) {
			t.Fatalf("expected tampered token to fail, got %v", err)
		}
	}

	if _, err := codec.Verify(token, "r_v1_other", claims.LinkID); !errors.Is(err, ErrResolveTokenInvalid) {
		t.Fatalf("expected resource mismatch to fail, got %v", err)
	}
	if _, err := codec.Verify(token, claims.ResourceID, "lnk_v1_other"); !errors.Is(err, ErrResolveTokenInvalid) {
		t.Fatalf("expected link mismatch to fail, got %v", err)
	}
}

func TestResourceResolveTokenHonorsTwentyFourHourBoundary(t *testing.T) {
	issuedAt := time.Date(2026, 7, 13, 18, 0, 0, 0, time.UTC)
	codec := newTestResourceResolveTokenCodec(t, issuedAt, bytes.Repeat([]byte{3}, 12))
	claims := testResolveTokenClaims()
	token, err := codec.Sign(claims)
	if err != nil {
		t.Fatal(err)
	}

	codec.now = func() time.Time { return issuedAt.Add(24 * time.Hour) }
	if _, err := codec.Verify(token, claims.ResourceID, claims.LinkID); err != nil {
		t.Fatalf("token should remain valid at exact boundary: %v", err)
	}
	codec.now = func() time.Time { return issuedAt.Add(24*time.Hour + time.Second) }
	if _, err := codec.Verify(token, claims.ResourceID, claims.LinkID); !errors.Is(err, ErrResolveTokenExpired) {
		t.Fatalf("expected expired token error, got %v", err)
	}
}

func TestResourceResolveTokenUsesRandomNonceAndStableLinkID(t *testing.T) {
	now := time.Date(2026, 7, 13, 18, 0, 0, 0, time.UTC)
	nonces := append(bytes.Repeat([]byte{4}, 12), bytes.Repeat([]byte{5}, 12)...)
	codec := newTestResourceResolveTokenCodec(t, now, nonces)
	claims := testResolveTokenClaims()

	first, err := codec.Sign(claims)
	if err != nil {
		t.Fatal(err)
	}
	second, err := codec.Sign(claims)
	if err != nil {
		t.Fatal(err)
	}
	if first == second {
		t.Fatal("random nonces must produce different tokens")
	}

	link := model.Link{Type: "quark", URL: claims.SourceURL}
	firstID := resolvePublicLinkID(testResourceResolveSecret, claims.ResourceID, link, 0)
	secondID := resolvePublicLinkID(testResourceResolveSecret, claims.ResourceID, link, 0)
	if firstID == "" || firstID != secondID {
		t.Fatalf("link ID must be stable: %q != %q", firstID, secondID)
	}
}

func TestResourceResolveTokenRejectsEmptySecret(t *testing.T) {
	if _, err := newResourceResolveTokenCodec(" "); err == nil {
		t.Fatal("empty secret must be rejected")
	}
}
