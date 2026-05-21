package service

import (
	"errors"
	"fmt"
	"time"
	"unisearch/model"

	"gorm.io/gorm"
)

var (
	// ErrAnnouncementTitleRequired 表示公告标题缺失
	ErrAnnouncementTitleRequired = errors.New("标题不能为空")
	// ErrAnnouncementContentRequired 表示公告内容缺失
	ErrAnnouncementContentRequired = errors.New("内容不能为空")
	// ErrAnnouncementInvalidTimeRange 表示失效时间非法
	ErrAnnouncementInvalidTimeRange = errors.New("失效时间必须晚于生效时间")
	// ErrAnnouncementInvalidPriority 表示优先级值非法
	ErrAnnouncementInvalidPriority = errors.New("优先级必须是 high、medium 或 low")
	// ErrAnnouncementNotFound 表示公告不存在
	ErrAnnouncementNotFound = errors.New("公告不存在")
	// ErrAnnouncementInvalidSortField 表示排序字段非法
	ErrAnnouncementInvalidSortField = errors.New("无效的排序字段")
	// ErrAnnouncementInvalidSortOrder 表示排序方向非法
	ErrAnnouncementInvalidSortOrder = errors.New("排序方向必须是 asc 或 desc")
	// ErrAnnouncementInvalidLifecycleStatus 表示公告生命周期筛选值非法
	ErrAnnouncementInvalidLifecycleStatus = errors.New("生命周期状态必须是 scheduled、active 或 expired")
)

const (
	announcementPriorityDescOrderClause = "CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END DESC, created_at DESC"
	announcementPriorityAscOrderClause  = "CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END ASC, created_at ASC"
)

// AnnouncementService 公告服务
type AnnouncementService struct {
	db *gorm.DB
}

// NewAnnouncementService 创建公告服务实例
func NewAnnouncementService(db *gorm.DB) *AnnouncementService {
	return &AnnouncementService{db: db}
}

// CreateAnnouncement 创建公告
// 参数:
//   - announcement: 公告数据（包含标题、内容、优先级、时间等）
//   - createdBy: 创建者用户名
//
// 返回: 创建的公告对象和错误信息
// 需求: 1.1, 1.2, 1.3, 1.4, 1.5
func (s *AnnouncementService) CreateAnnouncement(announcement *model.Announcement, createdBy string) (*model.Announcement, error) {
	if err := validateAnnouncement(announcement); err != nil {
		return nil, err
	}

	// 自动记录创建时间和创建者信息（需求 1.5）
	announcement.CreatedBy = createdBy
	announcement.CreatedAt = time.Now()
	announcement.UpdatedAt = time.Now()

	// 创建公告（需求 1.1, 1.4 - ID 由数据库自动生成）
	if err := s.db.Create(announcement).Error; err != nil {
		return nil, fmt.Errorf("创建公告失败: %w", err)
	}

	return announcement, nil
}

// UpdateAnnouncement 更新公告
// 参数:
//   - id: 公告ID
//   - announcement: 更新的公告数据（包含标题、内容、优先级、时间等）
//   - updatedBy: 修改者用户名
//
// 返回: 更新后的公告对象和错误信息
// 需求: 2.1, 2.2, 2.3, 2.4
func (s *AnnouncementService) UpdateAnnouncement(id uint, announcement *model.Announcement, updatedBy string) (*model.Announcement, error) {
	if err := validateAnnouncement(announcement); err != nil {
		return nil, err
	}

	// 查询现有公告，确保存在（需求 2.4）
	var existingAnnouncement model.Announcement
	if err := s.db.First(&existingAnnouncement, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAnnouncementNotFound
		}
		return nil, fmt.Errorf("查询公告失败: %w", err)
	}

	// 保持 ID 不变（需求 2.3）
	announcement.ID = id

	// 保持创建信息不变
	announcement.CreatedAt = existingAnnouncement.CreatedAt
	announcement.CreatedBy = existingAnnouncement.CreatedBy

	// 自动更新修改时间和修改者信息（需求 2.2）
	announcement.UpdatedAt = time.Now()
	announcement.UpdatedBy = updatedBy

	// 更新公告（需求 2.1）
	if err := s.db.Save(announcement).Error; err != nil {
		return nil, fmt.Errorf("更新公告失败: %w", err)
	}

	return announcement, nil
}

// DeleteAnnouncement 删除公告（软删除）
// 参数:
//   - id: 公告ID
//
// 返回: 错误信息
// 需求: 3.4, 11.3
func (s *AnnouncementService) DeleteAnnouncement(id uint) error {
	// 查询公告是否存在
	var announcement model.Announcement
	if err := s.db.First(&announcement, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAnnouncementNotFound
		}
		return fmt.Errorf("查询公告失败: %w", err)
	}

	// 软删除公告（需求 11.3）
	// GORM 的 Delete 方法会自动执行软删除（设置 DeletedAt 字段）
	if err := s.db.Delete(&announcement).Error; err != nil {
		return fmt.Errorf("删除公告失败: %w", err)
	}

	return nil
}

// SetAnnouncementStatus 设置公告状态（启用/禁用）
// 参数:
//   - id: 公告ID
//   - isEnabled: 是否启用
//
// 返回: 错误信息
// 需求: 3.1, 3.2
func (s *AnnouncementService) SetAnnouncementStatus(id uint, isEnabled bool) error {
	return s.SetAnnouncementStatusWithOperator(id, isEnabled, "")
}

// SetAnnouncementStatusWithOperator 设置公告状态（启用/禁用）并记录操作人
func (s *AnnouncementService) SetAnnouncementStatusWithOperator(id uint, isEnabled bool, updatedBy string) error {
	// 查询公告是否存在
	var announcement model.Announcement
	if err := s.db.First(&announcement, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAnnouncementNotFound
		}
		return fmt.Errorf("查询公告失败: %w", err)
	}

	// 更新启用状态（需求 3.1）
	announcement.IsEnabled = isEnabled
	announcement.UpdatedAt = time.Now()
	announcement.UpdatedBy = updatedBy

	// 保存更新
	if err := s.db.Save(&announcement).Error; err != nil {
		return fmt.Errorf("更新公告状态失败: %w", err)
	}

	return nil
}

// GetAnnouncement 获取单个公告
// 参数:
//   - id: 公告ID
//
// 返回: 公告对象和错误信息
// 需求: 4.2
func (s *AnnouncementService) GetAnnouncement(id uint) (*model.Announcement, error) {
	var announcement model.Announcement
	if err := s.db.First(&announcement, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAnnouncementNotFound
		}
		return nil, fmt.Errorf("查询公告失败: %w", err)
	}

	return &announcement, nil
}

// ListAnnouncementsParams 公告列表查询参数
type ListAnnouncementsParams struct {
	Page            int    // 页码（从1开始）
	PageSize        int    // 每页数量
	SortBy          string // 排序字段（created_at, priority, start_time）
	SortOrder       string // 排序方向（asc, desc）
	Keyword         string // 标题关键字
	Priority        string // 优先级筛选
	IsEnabled       *bool  // 启用状态筛选
	LifecycleStatus string // 生命周期筛选（scheduled/active/expired）
}

// ListAnnouncementsResult 公告列表查询结果
type ListAnnouncementsResult struct {
	Announcements []model.Announcement // 公告列表
	Total         int64                // 总数
	Page          int                  // 当前页码
	PageSize      int                  // 每页数量
	TotalPages    int                  // 总页数
}

// ListAnnouncements 获取公告列表（支持分页和排序）
// 参数:
//   - params: 查询参数（页码、每页数量、排序字段、排序方向）
//
// 返回: 公告列表结果和错误信息
// 需求: 4.2, 4.3
func (s *AnnouncementService) ListAnnouncements(params ListAnnouncementsParams) (*ListAnnouncementsResult, error) {
	// 设置默认值
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}
	if params.SortBy == "" {
		params.SortBy = "created_at"
	}
	if params.SortOrder == "" {
		params.SortOrder = "desc"
	}

	// 验证排序字段
	validSortFields := map[string]bool{
		"created_at": true,
		"priority":   true,
		"start_time": true,
	}
	if !validSortFields[params.SortBy] {
		return nil, ErrAnnouncementInvalidSortField
	}

	// 验证排序方向
	if params.SortOrder != "asc" && params.SortOrder != "desc" {
		return nil, ErrAnnouncementInvalidSortOrder
	}
	if params.Priority != "" && params.Priority != "high" && params.Priority != "medium" && params.Priority != "low" {
		return nil, ErrAnnouncementInvalidPriority
	}
	if params.LifecycleStatus != "" &&
		params.LifecycleStatus != "scheduled" &&
		params.LifecycleStatus != "active" &&
		params.LifecycleStatus != "expired" {
		return nil, ErrAnnouncementInvalidLifecycleStatus
	}

	query := s.db.Model(&model.Announcement{})
	query = applyAnnouncementListFilters(query, params)

	// 查询总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("查询公告总数失败: %w", err)
	}

	// 计算总页数
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	// 查询公告列表（需求 4.2, 4.3）
	var announcements []model.Announcement
	offset := (params.Page - 1) * params.PageSize
	orderClause := buildAnnouncementOrderClause(params.SortBy, params.SortOrder)

	if err := query.Order(orderClause).Limit(params.PageSize).Offset(offset).Find(&announcements).Error; err != nil {
		return nil, fmt.Errorf("查询公告列表失败: %w", err)
	}

	return &ListAnnouncementsResult{
		Announcements: announcements,
		Total:         total,
		Page:          params.Page,
		PageSize:      params.PageSize,
		TotalPages:    totalPages,
	}, nil
}

// GetActiveAnnouncements 获取当前有效的公告
// 参数:
//   - systemSettingsService: 系统设置服务（用于检查功能开关）
//
// 返回: 有效公告列表和错误信息
// 需求: 5.1, 5.2, 5.3, 13.2
func (s *AnnouncementService) GetActiveAnnouncements(systemSettingsService *SystemSettingsService) ([]model.Announcement, error) {
	// 检查公告功能是否启用（需求 13.2）
	settings, err := systemSettingsService.GetSettings()
	if err != nil {
		return nil, fmt.Errorf("获取系统设置失败: %w", err)
	}

	// 如果功能未启用，返回空数组
	if !settings.AnnouncementEnabled {
		return []model.Announcement{}, nil
	}

	// 查询有效公告（需求 5.1, 5.2）
	// 条件：启用状态为 true、当前时间 >= 生效时间、(失效时间为空 OR 当前时间 <= 失效时间)
	now := time.Now()
	var announcements []model.Announcement

	err = s.db.Where("is_enabled = ?", true).
		Where("start_time <= ?", now).
		Where("end_time IS NULL OR end_time >= ?", now).
		Order(announcementPriorityDescOrderClause).
		Find(&announcements).Error

	if err != nil {
		return nil, fmt.Errorf("查询有效公告失败: %w", err)
	}

	return announcements, nil
}

func validateAnnouncement(announcement *model.Announcement) error {
	if announcement.Title == "" {
		return ErrAnnouncementTitleRequired
	}
	if announcement.Content == "" {
		return ErrAnnouncementContentRequired
	}
	if announcement.EndTime != nil && !announcement.EndTime.After(announcement.StartTime) {
		return ErrAnnouncementInvalidTimeRange
	}
	if announcement.Priority != "high" && announcement.Priority != "medium" && announcement.Priority != "low" {
		return ErrAnnouncementInvalidPriority
	}
	return nil
}

func buildAnnouncementOrderClause(sortBy string, sortOrder string) string {
	if sortBy == "priority" {
		if sortOrder == "asc" {
			return announcementPriorityAscOrderClause
		}
		return announcementPriorityDescOrderClause
	}

	return fmt.Sprintf("%s %s", sortBy, sortOrder)
}

func applyAnnouncementListFilters(query *gorm.DB, params ListAnnouncementsParams) *gorm.DB {
	if params.Keyword != "" {
		query = query.Where("title LIKE ?", fmt.Sprintf("%%%s%%", params.Keyword))
	}
	if params.Priority != "" {
		query = query.Where("priority = ?", params.Priority)
	}
	if params.IsEnabled != nil {
		query = query.Where("is_enabled = ?", *params.IsEnabled)
	}
	if params.LifecycleStatus != "" {
		now := time.Now()
		switch params.LifecycleStatus {
		case "scheduled":
			query = query.Where("start_time > ?", now)
		case "active":
			query = query.Where("start_time <= ?", now).Where("end_time IS NULL OR end_time >= ?", now)
		case "expired":
			query = query.Where("end_time IS NOT NULL AND end_time < ?", now)
		}
	}
	return query
}
