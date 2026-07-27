package service

import (
	"errors"
	"fmt"
	"strings"
	"sync/atomic"
	"time"

	"unisearch/model"
	"unisearch/util/logger"

	"gorm.io/gorm"
)

// searchAuditEnabled 缓存搜索审计开关，避免每次搜索查库。
// 启动时由 system_settings 初始化，系统设置更新时刷新。
var searchAuditEnabled atomic.Bool

// SetSearchAuditEnabled 热更新搜索审计开关。
func SetSearchAuditEnabled(enabled bool) {
	searchAuditEnabled.Store(enabled)
}

// SearchAuditEnabled 读取当前搜索审计开关。
func SearchAuditEnabled() bool {
	return searchAuditEnabled.Load()
}

// SearchAuditFilter 搜索审计列表过滤条件。
type SearchAuditFilter struct {
	Username string
	Keyword  string
	ClientIP string
	Start    *time.Time
	End      *time.Time
}

// SearchAuditService 管理搜索审计日志的写入、查询与清理。
type SearchAuditService struct {
	db *gorm.DB
}

// NewSearchAuditService 创建搜索审计服务实例。
func NewSearchAuditService(db *gorm.DB) *SearchAuditService {
	return &SearchAuditService{db: db}
}

// Record 异步写入一条搜索审计记录。写失败仅告警，不影响搜索主流程。
func (s *SearchAuditService) Record(entry model.SearchAuditLog) {
	if s == nil || s.db == nil {
		return
	}
	if !SearchAuditEnabled() {
		return
	}
	go func() {
		if err := s.db.Create(&entry).Error; err != nil {
			logger.Warn("search_audit_write_failed",
				logger.String("keyword", entry.Keyword),
				logger.Any("error", err),
			)
		}
	}()
}

// List 分页查询搜索审计记录，支持按用户名/关键词/IP/时间范围过滤。
func (s *SearchAuditService) List(page, size int, filter SearchAuditFilter) ([]model.SearchAuditLog, int64, error) {
	if s == nil || s.db == nil {
		return nil, 0, errors.New("搜索审计服务未初始化")
	}
	if page <= 0 {
		page = 1
	}
	if size <= 0 || size > 200 {
		size = 20
	}

	query := s.db.Model(&model.SearchAuditLog{})
	if kw := strings.TrimSpace(filter.Username); kw != "" {
		query = query.Where("username LIKE ?", "%"+kw+"%")
	}
	if kw := strings.TrimSpace(filter.Keyword); kw != "" {
		query = query.Where("keyword LIKE ?", "%"+kw+"%")
	}
	if kw := strings.TrimSpace(filter.ClientIP); kw != "" {
		query = query.Where("client_ip LIKE ?", "%"+kw+"%")
	}
	if filter.Start != nil {
		query = query.Where("created_at >= ?", *filter.Start)
	}
	if filter.End != nil {
		query = query.Where("created_at <= ?", *filter.End)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("统计搜索审计记录失败: %w", err)
	}

	var items []model.SearchAuditLog
	if err := query.Order("created_at DESC, id DESC").
		Offset((page - 1) * size).Limit(size).Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("查询搜索审计记录失败: %w", err)
	}
	return items, total, nil
}

// Cleanup 删除留存期之前的搜索审计记录，返回删除行数。
func (s *SearchAuditService) Cleanup(retentionDays int) (int64, error) {
	if s == nil || s.db == nil {
		return 0, errors.New("搜索审计服务未初始化")
	}
	if retentionDays <= 0 {
		return 0, errors.New("留存天数必须大于 0")
	}
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	result := s.db.Where("created_at < ?", cutoff).Delete(&model.SearchAuditLog{})
	if result.Error != nil {
		return 0, fmt.Errorf("清理搜索审计记录失败: %w", result.Error)
	}
	return result.RowsAffected, nil
}
