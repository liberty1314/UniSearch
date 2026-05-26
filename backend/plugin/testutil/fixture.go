package testutil

import (
	"os"
	"path/filepath"
	"testing"
)

func ReadFixture(t *testing.T, parts ...string) string {
	t.Helper()
	path := filepath.Join(parts...)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("读取 fixture 失败: %v", err)
	}
	return string(data)
}
