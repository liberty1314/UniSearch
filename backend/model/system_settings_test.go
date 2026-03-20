package model

import (
	"reflect"
	"strings"
	"testing"
)

func TestDefaultCopyFormatTemplateUsesMysqlSafeColumnType(t *testing.T) {
	field, ok := reflect.TypeOf(SystemSettings{}).FieldByName("DefaultCopyFormatTemplate")
	if !ok {
		t.Fatal("DefaultCopyFormatTemplate field not found")
	}

	gormTag := field.Tag.Get("gorm")
	if strings.Contains(gormTag, "type:text") {
		t.Fatalf("default_copy_format_template must not use text with a default value, got tag %q", gormTag)
	}

	if !strings.Contains(gormTag, "size:1024") {
		t.Fatalf("default_copy_format_template should use a bounded varchar size, got tag %q", gormTag)
	}
}
