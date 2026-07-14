package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"unisearch/model"
)

const (
	resourceResolveTokenPrefix   = "rrt_v1_"
	resourceResolveTokenVersion  = 1
	resourceResolveTokenLifetime = 24 * time.Hour
)

var (
	resourceResolveTokenAAD = []byte("resource-resolve:v1")
	ErrResolveTokenInvalid  = errors.New("resource resolve token invalid")
	ErrResolveTokenExpired  = errors.New("resource resolve token expired")
)

type resourceResolveTokenClaims struct {
	Version    int    `json:"v"`
	ResourceID string `json:"rid"`
	LinkID     string `json:"lid"`
	PluginID   string `json:"pid"`
	Provider   string `json:"provider"`
	SourceURL  string `json:"source_url"`
	MovieID    string `json:"movie_id,omitempty"`
	EntryIndex int    `json:"entry_index,omitempty"`
	IssuedAt   int64  `json:"iat"`
	ExpiresAt  int64  `json:"exp"`
}

type ResourceResolveTokenClaims struct {
	ResourceID string
	LinkID     string
	PluginID   string
	Provider   string
	SourceURL  string
	MovieID    string
	EntryIndex int
	IssuedAt   int64
	ExpiresAt  int64
}

type resourceResolveTokenCodec struct {
	key  [32]byte
	now  func() time.Time
	rand io.Reader
}

func newResourceResolveTokenCodec(secret string) (*resourceResolveTokenCodec, error) {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return nil, fmt.Errorf("resource resolve token secret is required")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte("resource-resolve-token-v1"))
	derived := mac.Sum(nil)
	codec := &resourceResolveTokenCodec{
		now:  time.Now,
		rand: rand.Reader,
	}
	copy(codec.key[:], derived)
	return codec, nil
}

func (codec *resourceResolveTokenCodec) Sign(claims resourceResolveTokenClaims) (string, error) {
	if codec == nil || codec.now == nil || codec.rand == nil {
		return "", ErrResolveTokenInvalid
	}
	if strings.TrimSpace(claims.ResourceID) == "" || strings.TrimSpace(claims.LinkID) == "" ||
		strings.TrimSpace(claims.PluginID) == "" || strings.TrimSpace(claims.Provider) == "" ||
		strings.TrimSpace(claims.SourceURL) == "" {
		return "", ErrResolveTokenInvalid
	}

	now := codec.now()
	claims.Version = resourceResolveTokenVersion
	claims.IssuedAt = now.Unix()
	claims.ExpiresAt = now.Add(resourceResolveTokenLifetime).Unix()
	plaintext, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("marshal resource resolve claims: %w", err)
	}

	gcm, err := codec.gcm()
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(codec.rand, nonce); err != nil {
		return "", fmt.Errorf("read resource resolve nonce: %w", err)
	}
	payload := append(nonce, gcm.Seal(nil, nonce, plaintext, resourceResolveTokenAAD)...)
	return resourceResolveTokenPrefix + base64.RawURLEncoding.EncodeToString(payload), nil
}

func (codec *resourceResolveTokenCodec) Verify(token string, resourceID string, linkID string) (resourceResolveTokenClaims, error) {
	if codec == nil || codec.now == nil || !strings.HasPrefix(token, resourceResolveTokenPrefix) {
		return resourceResolveTokenClaims{}, ErrResolveTokenInvalid
	}
	payload, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(token, resourceResolveTokenPrefix))
	if err != nil {
		return resourceResolveTokenClaims{}, ErrResolveTokenInvalid
	}
	gcm, err := codec.gcm()
	if err != nil || len(payload) <= gcm.NonceSize() {
		return resourceResolveTokenClaims{}, ErrResolveTokenInvalid
	}
	nonce := payload[:gcm.NonceSize()]
	ciphertext := payload[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, resourceResolveTokenAAD)
	if err != nil {
		return resourceResolveTokenClaims{}, ErrResolveTokenInvalid
	}

	var claims resourceResolveTokenClaims
	if err := json.Unmarshal(plaintext, &claims); err != nil || claims.Version != resourceResolveTokenVersion {
		return resourceResolveTokenClaims{}, ErrResolveTokenInvalid
	}
	if !hmac.Equal([]byte(claims.ResourceID), []byte(resourceID)) || !hmac.Equal([]byte(claims.LinkID), []byte(linkID)) {
		return resourceResolveTokenClaims{}, ErrResolveTokenInvalid
	}
	if claims.IssuedAt <= 0 || claims.ExpiresAt <= claims.IssuedAt ||
		claims.ExpiresAt-claims.IssuedAt != int64(resourceResolveTokenLifetime/time.Second) {
		return resourceResolveTokenClaims{}, ErrResolveTokenInvalid
	}
	if codec.now().Unix() > claims.ExpiresAt {
		return resourceResolveTokenClaims{}, ErrResolveTokenExpired
	}
	return claims, nil
}

func (codec *resourceResolveTokenCodec) gcm() (cipher.AEAD, error) {
	block, err := aes.NewCipher(codec.key[:])
	if err != nil {
		return nil, fmt.Errorf("create resource resolve cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create resource resolve gcm: %w", err)
	}
	return gcm, nil
}

func resolvePublicLinkID(secret string, resourceID string, link model.Link, index int) string {
	mac := hmac.New(sha256.New, []byte(secret))
	for _, field := range []string{"resource-link-id-v1", resourceID, link.Type, link.URL, strconv.Itoa(index)} {
		_, _ = mac.Write([]byte(field))
		_, _ = mac.Write([]byte{0})
	}
	return "lnk_v1_" + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)[:18])
}

func IssueResourceResolveToken(secret string, claims ResourceResolveTokenClaims) (string, error) {
	codec, err := newResourceResolveTokenCodec(secret)
	if err != nil {
		return "", err
	}
	return codec.Sign(resourceResolveTokenClaims{
		ResourceID: claims.ResourceID,
		LinkID:     claims.LinkID,
		PluginID:   claims.PluginID,
		Provider:   claims.Provider,
		SourceURL:  claims.SourceURL,
		MovieID:    claims.MovieID,
		EntryIndex: claims.EntryIndex,
	})
}

func VerifyResourceResolveToken(secret string, token string, resourceID string, linkID string) (ResourceResolveTokenClaims, error) {
	codec, err := newResourceResolveTokenCodec(secret)
	if err != nil {
		return ResourceResolveTokenClaims{}, err
	}
	claims, err := codec.Verify(token, resourceID, linkID)
	if err != nil {
		return ResourceResolveTokenClaims{}, err
	}
	return ResourceResolveTokenClaims{
		ResourceID: claims.ResourceID,
		LinkID:     claims.LinkID,
		PluginID:   claims.PluginID,
		Provider:   claims.Provider,
		SourceURL:  claims.SourceURL,
		MovieID:    claims.MovieID,
		EntryIndex: claims.EntryIndex,
		IssuedAt:   claims.IssuedAt,
		ExpiresAt:  claims.ExpiresAt,
	}, nil
}
