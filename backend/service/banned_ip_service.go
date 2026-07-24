package service

import (
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"unisearch/model"

	"gorm.io/gorm"
)

// BannedIPService 管理 IP 封禁名单。
// 命中检查走进程内缓存（读多写少，RWMutex 保护），DB 作为持久化来源；
// 写操作同步更新缓存，启动时通过 WarmUp 从 DB 预热未过期记录。
type BannedIPService struct {
	db    *gorm.DB
	mu    sync.RWMutex
	cache map[string]*time.Time // ip -> 过期时间（nil 表示永久封禁）
}

// NewBannedIPService 创建封禁 IP 服务实例。
func NewBannedIPService(db *gorm.DB) *BannedIPService {
	return &BannedIPService{
		db:    db,
		cache: make(map[string]*time.Time),
	}
}

func normalizeIP(ip string) string {
	return strings.TrimSpace(ip)
}

// WarmUp 从 DB 加载未过期封禁记录到内存缓存。应在启动装配完成后调用。
func (s *BannedIPService) WarmUp() error {
	if s == nil || s.db == nil {
		return errors.New("封禁服务未初始化")
	}

	var records []model.BannedIP
	now := time.Now()
	if err := s.db.Where("expires_at IS NULL OR expires_at > ?", now).Find(&records).Error; err != nil {
		return fmt.Errorf("预热封禁名单失败: %w", err)
	}

	next := make(map[string]*time.Time, len(records))
	for _, r := range records {
		next[r.IP] = r.ExpiresAt
	}

	s.mu.Lock()
	s.cache = next
	s.mu.Unlock()
	return nil
}

// IsBanned 检查 IP 是否处于封禁中（未过期）。命中缓存中的过期记录会顺带清理。
func (s *BannedIPService) IsBanned(ip string) bool {
	if s == nil {
		return false
	}
	ip = normalizeIP(ip)
	if ip == "" {
		return false
	}

	s.mu.RLock()
	expiresAt, ok := s.cache[ip]
	s.mu.RUnlock()
	if !ok {
		return false
	}
	if expiresAt == nil {
		return true // 永久封禁
	}
	if time.Now().Before(*expiresAt) {
		return true
	}

	// 已过期：清理缓存条目（DB 记录由后台或下次预热清理，不阻塞请求）。
	s.mu.Lock()
	if cur, still := s.cache[ip]; still && cur == expiresAt {
		delete(s.cache, ip)
	}
	s.mu.Unlock()
	return false
}

// Ban 写入或更新一条封禁记录（upsert by ip），并同步缓存。
func (s *BannedIPService) Ban(ip, reason, source string, expiresAt *time.Time, createdBy string) (*model.BannedIP, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("封禁服务未初始化")
	}
	ip = normalizeIP(ip)
	if ip == "" {
		return nil, errors.New("IP 不能为空")
	}
	if source != model.BannedIPSourceAuto && source != model.BannedIPSourceManual {
		source = model.BannedIPSourceManual
	}

	record := model.BannedIP{
		IP:        ip,
		Reason:    strings.TrimSpace(reason),
		Source:    source,
		ExpiresAt: expiresAt,
		CreatedBy: strings.TrimSpace(createdBy),
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var existing model.BannedIP
		queryErr := tx.Where("ip = ?", ip).First(&existing).Error
		if queryErr == nil {
			existing.Reason = record.Reason
			existing.Source = source
			existing.ExpiresAt = expiresAt
			existing.CreatedBy = record.CreatedBy
			if saveErr := tx.Save(&existing).Error; saveErr != nil {
				return saveErr
			}
			record = existing
			return nil
		}
		if !errors.Is(queryErr, gorm.ErrRecordNotFound) {
			return queryErr
		}
		return tx.Create(&record).Error
	})
	if err != nil {
		return nil, fmt.Errorf("写入封禁记录失败: %w", err)
	}

	s.mu.Lock()
	s.cache[ip] = expiresAt
	s.mu.Unlock()
	return &record, nil
}

// Unban 按 IP 解封：删除 DB 记录并清缓存。
func (s *BannedIPService) Unban(ip string) error {
	if s == nil || s.db == nil {
		return errors.New("封禁服务未初始化")
	}
	ip = normalizeIP(ip)
	if ip == "" {
		return errors.New("IP 不能为空")
	}

	if err := s.db.Where("ip = ?", ip).Delete(&model.BannedIP{}).Error; err != nil {
		return fmt.Errorf("解封失败: %w", err)
	}

	s.mu.Lock()
	delete(s.cache, ip)
	s.mu.Unlock()
	return nil
}

// UnbanByID 按主键解封：先查出 IP 再删除并清缓存。
func (s *BannedIPService) UnbanByID(id uint) error {
	if s == nil || s.db == nil {
		return errors.New("封禁服务未初始化")
	}
	if id == 0 {
		return errors.New("记录 ID 无效")
	}

	var record model.BannedIP
	if err := s.db.First(&record, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("封禁记录不存在")
		}
		return fmt.Errorf("查询封禁记录失败: %w", err)
	}

	if err := s.db.Delete(&model.BannedIP{}, id).Error; err != nil {
		return fmt.Errorf("解封失败: %w", err)
	}

	s.mu.Lock()
	delete(s.cache, record.IP)
	s.mu.Unlock()
	return nil
}

// List 分页查询封禁名单，支持 IP 模糊搜索。返回条目与总数。
func (s *BannedIPService) List(page, size int, keyword string) ([]model.BannedIP, int64, error) {
	if s == nil || s.db == nil {
		return nil, 0, errors.New("封禁服务未初始化")
	}
	if page <= 0 {
		page = 1
	}
	if size <= 0 || size > 200 {
		size = 20
	}

	query := s.db.Model(&model.BannedIP{})
	if kw := strings.TrimSpace(keyword); kw != "" {
		query = query.Where("ip LIKE ?", "%"+kw+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("统计封禁记录失败: %w", err)
	}

	var items []model.BannedIP
	if err := query.Order("created_at DESC, id DESC").
		Offset((page - 1) * size).Limit(size).Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("查询封禁记录失败: %w", err)
	}
	return items, total, nil
}
