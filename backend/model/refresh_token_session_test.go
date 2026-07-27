package model

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestRefreshTokenSessionJSONExcludesDigest(t *testing.T) {
	session := RefreshTokenSession{
		UserID:      9,
		TokenDigest: strings.Repeat("a", 64),
	}

	data, err := json.Marshal(session)
	if err != nil {
		t.Fatalf("序列化刷新会话失败: %v", err)
	}
	if bytes.Contains(data, []byte(session.TokenDigest)) || bytes.Contains(data, []byte("token_digest")) {
		t.Fatalf("JSON 暴露了令牌摘要: %s", data)
	}
}
