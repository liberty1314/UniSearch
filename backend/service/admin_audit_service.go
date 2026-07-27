package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"unisearch/model"
	"unisearch/util/logger"

	"gorm.io/gorm"
)

// AdminAuditFilter 操作审计列表过滤条件。
type AdminAuditFilter struct {
	Operator string
	Action   string
	Path     string
	Start    *time.Time
	End      *time.Time
}

// AdminAuditService 管理管理员操作审计日志的写入、查询与清理。
type AdminAuditService struct {
	db *gorm.DB
}

// NewAdminAuditService 创建操作审计服务实例。
func NewAdminAuditService(db *gorm.DB) *AdminAuditService {
	return &AdminAuditService{db: db}
}

// Record 异步写入一条操作审计记录。写失败仅告警，不影响主流程。
func (s *AdminAuditService) Record(entry model.AdminAuditLog) {
	if s == nil || s.db == nil {
		return
	}
	go func() {
		if err := s.db.Create(&entry).Error; err != nil {
			logger.Warn("admin_audit_write_failed",
				logger.String("path", entry.Path),
				logger.Any("error", err),
			)
		}
	}()
}

// List 分页查询操作审计记录，支持按操作人/操作/路径/时间范围过滤。
func (s *AdminAuditService) List(page, size int, filter AdminAuditFilter) ([]model.AdminAuditLog, int64, error) {
	if s == nil || s.db == nil {
		return nil, 0, errors.New("操作审计服务未初始化")
	}
	if page <= 0 {
		page = 1
	}
	if size <= 0 || size > 200 {
		size = 20
	}

	query := s.db.Model(&model.AdminAuditLog{})
	if kw := strings.TrimSpace(filter.Operator); kw != "" {
		query = query.Where("operator LIKE ?", "%"+kw+"%")
	}
	if kw := strings.TrimSpace(filter.Action); kw != "" {
		query = query.Where("action LIKE ?", "%"+kw+"%")
	}
	if kw := strings.TrimSpace(filter.Path); kw != "" {
		query = query.Where("path LIKE ?", "%"+kw+"%")
	}
	if filter.Start != nil {
		query = query.Where("created_at >= ?", *filter.Start)
	}
	if filter.End != nil {
		query = query.Where("created_at <= ?", *filter.End)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("统计操作审计记录失败: %w", err)
	}

	var items []model.AdminAuditLog
	if err := query.Order("created_at DESC, id DESC").
		Offset((page - 1) * size).Limit(size).Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("查询操作审计记录失败: %w", err)
	}
	return items, total, nil
}

// Cleanup 删除留存期之前的操作审计记录，返回删除行数。
func (s *AdminAuditService) Cleanup(retentionDays int) (int64, error) {
	if s == nil || s.db == nil {
		return 0, errors.New("操作审计服务未初始化")
	}
	if retentionDays <= 0 {
		return 0, errors.New("留存天数必须大于 0")
	}
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	result := s.db.Where("created_at < ?", cutoff).Delete(&model.AdminAuditLog{})
	if result.Error != nil {
		return 0, fmt.Errorf("清理操作审计记录失败: %w", result.Error)
	}
	return result.RowsAffected, nil
}
