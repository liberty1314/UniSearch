package logger

import (
	"fmt"
	"log"
	"sort"
	"strings"
)

const redactedValue = "<redacted>"
const maxPlainTextRunes = 80

type Level string

const (
	LevelDebug Level = "debug"
	LevelInfo  Level = "info"
	LevelWarn  Level = "warn"
	LevelError Level = "error"
)

type Field struct {
	Key   string
	Value interface{}
}

func String(key string, value string) Field {
	return Field{Key: key, Value: value}
}

func Int(key string, value int) Field {
	return Field{Key: key, Value: value}
}

func Int64(key string, value int64) Field {
	return Field{Key: key, Value: value}
}

func Float64(key string, value float64) Field {
	return Field{Key: key, Value: value}
}

func Bool(key string, value bool) Field {
	return Field{Key: key, Value: value}
}

func Any(key string, value interface{}) Field {
	return Field{Key: key, Value: value}
}

// Redact 统一处理日志字段脱敏，避免在业务代码中重复判断敏感字段。
func Redact(key string, value interface{}) interface{} {
	if value == nil {
		return nil
	}

	valueText := fmt.Sprint(value)
	normalizedKey := normalizeKey(key)

	if normalizedKey == "authorization" {
		return redactAuthorization(valueText)
	}

	if isAPIKeyField(normalizedKey) {
		return maskEdges(valueText, 4, 4)
	}

	if isSecretField(normalizedKey) {
		return redactedValue
	}

	if len([]rune(valueText)) > maxPlainTextRunes {
		return truncateRunes(valueText, maxPlainTextRunes)
	}

	return value
}

func Info(event string, fields ...Field) {
	write(LevelInfo, event, fields...)
}

func Warn(event string, fields ...Field) {
	write(LevelWarn, event, fields...)
}

func Error(event string, fields ...Field) {
	write(LevelError, event, fields...)
}

func Debug(enabled bool, event string, fields ...Field) {
	if !enabled {
		return
	}
	write(LevelDebug, event, fields...)
}

func write(level Level, event string, fields ...Field) {
	if formattedFields := FormatFields(fields); formattedFields != "" {
		log.Printf("[%s] event=%s %s", level, event, formattedFields)
		return
	}
	log.Printf("[%s] event=%s", level, event)
}

func FormatFields(fields []Field) string {
	if len(fields) == 0 {
		return ""
	}

	sortedFields := append([]Field(nil), fields...)
	sort.Slice(sortedFields, func(i, j int) bool {
		return sortedFields[i].Key < sortedFields[j].Key
	})

	parts := make([]string, 0, len(sortedFields))
	for _, field := range sortedFields {
		if field.Key == "" {
			continue
		}
		parts = append(parts, fmt.Sprintf("%s=%v", field.Key, Redact(field.Key, field.Value)))
	}

	return strings.Join(parts, " ")
}

func normalizeKey(key string) string {
	normalized := strings.ToLower(strings.TrimSpace(key))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	return normalized
}

func redactAuthorization(value string) string {
	const bearerPrefix = "Bearer "
	if strings.HasPrefix(value, bearerPrefix) {
		token := strings.TrimPrefix(value, bearerPrefix)
		return bearerPrefix + maskStart(token, 3)
	}
	return redactedValue
}

func isAPIKeyField(normalizedKey string) bool {
	return normalizedKey == "api_key" ||
		normalizedKey == "apikey" ||
		normalizedKey == "key" ||
		strings.Contains(normalizedKey, "api_key")
}

func isSecretField(normalizedKey string) bool {
	secretMarkers := []string{
		"cookie",
		"password",
		"passwd",
		"secret",
		"token",
		"redis_password",
		"tmdb",
	}
	for _, marker := range secretMarkers {
		if strings.Contains(normalizedKey, marker) {
			return true
		}
	}
	return false
}

func maskStart(value string, keepStart int) string {
	runes := []rune(value)
	if len(runes) <= keepStart {
		return strings.Repeat("*", len(runes))
	}
	return string(runes[:keepStart]) + "***"
}

func maskEdges(value string, keepStart int, keepEnd int) string {
	runes := []rune(value)
	if len(runes) <= keepStart+keepEnd {
		return strings.Repeat("*", len(runes))
	}
	return string(runes[:keepStart]) + "***" + string(runes[len(runes)-keepEnd:])
}

func truncateRunes(value string, maxRunes int) string {
	runes := []rune(value)
	if len(runes) <= maxRunes {
		return value
	}
	return string(runes[:maxRunes]) + "..."
}
