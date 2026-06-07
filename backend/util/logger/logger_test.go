package logger

import (
	"strings"
	"testing"
)

func TestRedactFields(t *testing.T) {
	tests := []struct {
		name  string
		key   string
		value interface{}
		want  interface{}
	}{
		{
			name:  "Authorization Bearer 只保留短前缀",
			key:   "Authorization",
			value: "Bearer abcdef123456",
			want:  "Bearer abc***",
		},
		{
			name:  "API Key 只保留首尾片段",
			key:   "api_key",
			value: "sk-1234567890abcdef",
			want:  "sk-1***cdef",
		},
		{
			name:  "Cookie 直接脱敏",
			key:   "cookie",
			value: "session=abcdef",
			want:  "<redacted>",
		},
		{
			name:  "Redis 密码直接脱敏",
			key:   "redis_password",
			value: "redis-secret",
			want:  "<redacted>",
		},
		{
			name:  "TMDB token 直接脱敏",
			key:   "tmdb_token",
			value: "tmdb-secret",
			want:  "<redacted>",
		},
		{
			name:  "普通关键词保留",
			key:   "keyword",
			value: "海边的曼彻斯特",
			want:  "海边的曼彻斯特",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Redact(tt.key, tt.value)
			if got != tt.want {
				t.Fatalf("脱敏结果不符合预期：got=%v want=%v", got, tt.want)
			}
		})
	}
}

func TestRedactTruncatesLongKeyword(t *testing.T) {
	keyword := strings.Repeat("片", 81)

	got := Redact("keyword", keyword)
	gotText, ok := got.(string)
	if !ok {
		t.Fatalf("期望关键词仍然是字符串，实际为 %T", got)
	}
	if len([]rune(gotText)) != 83 {
		t.Fatalf("期望截断为 80 个字符加省略号，实际长度为 %d", len([]rune(gotText)))
	}
	if !strings.HasSuffix(gotText, "...") {
		t.Fatalf("期望截断关键词带省略号，实际为 %q", gotText)
	}
}

func TestFormatFieldsSortsAndRedactsValues(t *testing.T) {
	formatted := FormatFields([]Field{
		{Key: "keyword", Value: strings.Repeat("长", 81)},
		{Key: "api_key", Value: "sk-1234567890abcdef"},
	})

	if !strings.HasPrefix(formatted, "api_key=sk-1***cdef keyword=") {
		t.Fatalf("期望字段按 key 排序并脱敏，实际为 %q", formatted)
	}
	if strings.Contains(formatted, "1234567890") {
		t.Fatalf("格式化日志泄露 API Key 中间片段：%q", formatted)
	}
}
