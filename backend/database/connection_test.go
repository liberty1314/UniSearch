package database

import "testing"

func TestValidateDatabaseName(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{name: "unisearch", wantErr: false},
		{name: "unisearch_test_2026", wantErr: false},
		{name: "", wantErr: true},
		{name: "bad-name", wantErr: true},
		{name: "bad`name", wantErr: true},
		{name: "db/name", wantErr: true},
		{name: "db;DROP DATABASE db", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateDatabaseName(tt.name)
			if (err != nil) != tt.wantErr {
				t.Fatalf("数据库名 %q 校验结果不符: %v", tt.name, err)
			}
		})
	}
}
