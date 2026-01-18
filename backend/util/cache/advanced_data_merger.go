package cache

import (
	"fmt"
	"sync"
	"time"

	"pansou/model"
)

// AdvancedDataMerger 高级数据合并器
type AdvancedDataMerger struct {
	// 合并策略
	mergeStrategies map[string]MergeStrategy

	// 合并规则
	mergeRules []*MergeRule

	// 统计信息
	totalMerges      int64
	successfulMerges int64
	failedMerges     int64

	// 缓存去重
	deduplicationMap map[string]*CacheOperation
	dedupMutex       sync.RWMutex

	// 性能监控
	mergeMetrics *MergeMetrics

	mutex sync.RWMutex
}

// MergeStrategy 合并策略接口
type MergeStrategy interface {
	CanMerge(existing *CacheOperation, new *CacheOperation) bool
	Merge(existing *CacheOperation, new *CacheOperation) (*CacheOperation, error)
	GetPriority() int
}

// MergeRule 合并规则
type MergeRule struct {
	Name        string
	Description string
	Condition   func(*CacheOperation, *CacheOperation) bool
	MergeFunc   func(*CacheOperation, *CacheOperation) (*CacheOperation, error)
	Priority    int
	Enabled     bool
}

// MergeMetrics 合并指标
type MergeMetrics struct {
	// 时间统计
	AverageMergeTime time.Duration
	MaxMergeTime     time.Duration
	TotalMergeTime   time.Duration

	// 数据统计
	DataSizeBefore   int64
	DataSizeAfter    int64
	CompressionRatio float64

	// 类型统计
	MergesByType    map[string]int64
	MergesByPlugin  map[string]int64
	MergesByKeyword map[string]int64

	// 效率统计
	DuplicatesRemoved   int64
	ResultsConsolidated int64
	StorageSaved        int64
}

// NewAdvancedDataMerger 创建高级数据合并器
func NewAdvancedDataMerger() *AdvancedDataMerger {
	merger := &AdvancedDataMerger{
		mergeStrategies:  make(map[string]MergeStrategy),
		deduplicationMap: make(map[string]*CacheOperation),
		mergeMetrics: &MergeMetrics{
			MergesByType:    make(map[string]int64),
			MergesByPlugin:  make(map[string]int64),
			MergesByKeyword: make(map[string]int64),
		},
	}

	// 初始化合并策略
	merger.initializeMergeStrategies()

	// 初始化合并规则
	merger.initializeMergeRules()

	return merger
}

// initializeMergeStrategies 初始化合并策略
func (m *AdvancedDataMerger) initializeMergeStrategies() {
	// 注册同键合并策略
	m.mergeStrategies["same_key"] = &SameKeyMergeStrategy{}

	// 注册同插件同关键词策略
	m.mergeStrategies["same_plugin_keyword"] = &SamePluginKeywordMergeStrategy{}

	// 注册结果去重策略
	m.mergeStrategies["deduplication"] = &DeduplicationMergeStrategy{}

	// 注册内容相似性策略
	m.mergeStrategies["content_similarity"] = &ContentSimilarityMergeStrategy{}
}

// initializeMergeRules 初始化合并规则
func (m *AdvancedDataMerger) initializeMergeRules() {
	m.mergeRules = []*MergeRule{
		{
			Name:        "完全相同键合并",
			Description: "合并具有完全相同缓存键的操作",
			Condition: func(existing, new *CacheOperation) bool {
				return existing.Key == new.Key
			},
			MergeFunc: m.mergeSameKey,
			Priority:  1,
			Enabled:   true,
		},
		{
			Name:        "同插件同关键词合并",
			Description: "合并同一插件对同一关键词的搜索结果",
			Condition: func(existing, new *CacheOperation) bool {
				return existing.PluginName == new.PluginName &&
					existing.Keyword == new.Keyword &&
					existing.Key != new.Key
			},
			MergeFunc: m.mergeSamePluginKeyword,
			Priority:  2,
			Enabled:   true,
		},
		{
			Name:        "时间窗口内合并",
			Description: "合并时间窗口内的相似操作",
			Condition: func(existing, new *CacheOperation) bool {
				timeDiff := new.Timestamp.Sub(existing.Timestamp)
				return timeDiff >= 0 && timeDiff <= 5*time.Minute &&
					existing.PluginName == new.PluginName
			},
			MergeFunc: m.mergeTimeWindow,
			Priority:  3,
			Enabled:   true,
		},
		{
			Name:        "结果去重合并",
			Description: "去除重复的搜索结果",
			Condition: func(existing, new *CacheOperation) bool {
				return m.hasOverlapResults(existing, new)
			},
			MergeFunc: m.mergeDeduplication,
			Priority:  4,
			Enabled:   true,
		},
	}
}

// TryMergeOperation 尝试合并操作
func (m *AdvancedDataMerger) TryMergeOperation(buffer *GlobalBuffer, newOp *CacheOperation) bool {
	startTime := time.Now()
	defer func() {
		mergeTime := time.Since(startTime)
		m.updateMergeMetrics(mergeTime)
	}()

	m.totalMerges++

	// 🔍 在缓冲区中寻找可合并的操作
	merged := false

	for i, existingOp := range buffer.Operations {
		if m.canMergeOperations(existingOp, newOp) {
			// 🚀 执行合并
			mergedOp, err := m.performMerge(existingOp, newOp)
			if err != nil {
				m.failedMerges++
				continue
			}

			// 替换原操作
			buffer.Operations[i] = mergedOp

			// 更新统计
			m.successfulMerges++
			m.updateMergeStatistics(existingOp, newOp, mergedOp)

			merged = true
			break
		}
	}

	return merged
}

// canMergeOperations 检查是否可以合并操作
func (m *AdvancedDataMerger) canMergeOperations(existing, new *CacheOperation) bool {
	// 按优先级检查合并规则
	for _, rule := range m.mergeRules {
		if rule.Enabled && rule.Condition(existing, new) {
			return true
		}
	}

	return false
}

// performMerge 执行合并
func (m *AdvancedDataMerger) performMerge(existing, new *CacheOperation) (*CacheOperation, error) {
	// 找到最高优先级的适用规则
	var bestRule *MergeRule
	for _, rule := range m.mergeRules {
		if rule.Enabled && rule.Condition(existing, new) {
			if bestRule == nil || rule.Priority < bestRule.Priority {
				bestRule = rule
			}
		}
	}

	if bestRule == nil {
		return nil, fmt.Errorf("未找到适用的合并规则")
	}

	// 执行合并
	return bestRule.MergeFunc(existing, new)
}

// mergeSameKey 合并相同键的操作
func (m *AdvancedDataMerger) mergeSameKey(existing, new *CacheOperation) (*CacheOperation, error) {
	// 合并搜索结果
	mergedResults := m.mergeSearchResults(existing.Data, new.Data)

	merged := &CacheOperation{
		Key:        existing.Key,
		Data:       mergedResults,
		TTL:        m.chooseLongerTTL(existing.TTL, new.TTL),
		PluginName: existing.PluginName, // 保持原插件名
		Keyword:    existing.Keyword,    // 保持原关键词
		Timestamp:  new.Timestamp,       // 使用最新时间戳
		Priority:   m.chooseBetterPriority(existing.Priority, new.Priority),
		DataSize:   existing.DataSize + new.DataSize, // 累计数据大小
		IsFinal:    existing.IsFinal || new.IsFinal,  // 任一为最终结果则为最终结果
	}

	return merged, nil
}

// mergeSamePluginKeyword 合并同插件同关键词操作
func (m *AdvancedDataMerger) mergeSamePluginKeyword(existing, new *CacheOperation) (*CacheOperation, error) {
	// 生成新的合并键
	mergedKey := fmt.Sprintf("merged_%s_%s_%d",
		existing.PluginName, existing.Keyword, time.Now().Unix())

	// 合并搜索结果
	mergedResults := m.mergeSearchResults(existing.Data, new.Data)

	merged := &CacheOperation{
		Key:        mergedKey,
		Data:       mergedResults,
		TTL:        m.chooseLongerTTL(existing.TTL, new.TTL),
		PluginName: existing.PluginName,
		Keyword:    existing.Keyword,
		Timestamp:  new.Timestamp,
		Priority:   m.chooseBetterPriority(existing.Priority, new.Priority),
		DataSize:   len(mergedResults) * 500, // 重新估算数据大小
		IsFinal:    existing.IsFinal || new.IsFinal,
	}

	return merged, nil
}

// mergeTimeWindow 合并时间窗口内的操作
func (m *AdvancedDataMerger) mergeTimeWindow(existing, new *CacheOperation) (*CacheOperation, error) {
	// 时间窗口合并策略：保留最新的元信息，合并数据
	mergedResults := m.mergeSearchResults(existing.Data, new.Data)

	merged := &CacheOperation{
		Key:        new.Key, // 使用新的键
		Data:       mergedResults,
		TTL:        new.TTL, // 使用新的TTL
		PluginName: new.PluginName,
		Keyword:    new.Keyword,
		Timestamp:  new.Timestamp,
		Priority:   new.Priority,
		DataSize:   len(mergedResults) * 500,
		IsFinal:    new.IsFinal,
	}

	return merged, nil
}

// mergeDeduplication 去重合并
func (m *AdvancedDataMerger) mergeDeduplication(existing, new *CacheOperation) (*CacheOperation, error) {
	// 执行深度去重
	deduplicatedResults := m.deduplicateSearchResults(existing.Data, new.Data)

	merged := &CacheOperation{
		Key:        existing.Key,
		Data:       deduplicatedResults,
		TTL:        m.chooseLongerTTL(existing.TTL, new.TTL),
		PluginName: existing.PluginName,
		Keyword:    existing.Keyword,
		Timestamp:  new.Timestamp,
		Priority:   m.chooseBetterPriority(existing.Priority, new.Priority),
		DataSize:   len(deduplicatedResults) * 500,
		IsFinal:    existing.IsFinal || new.IsFinal,
	}

	return merged, nil
}

// mergeSearchResults 合并搜索结果
func (m *AdvancedDataMerger) mergeSearchResults(existing, new []model.SearchResult) []model.SearchResult {
	// 使用map去重
	resultMap := make(map[string]model.SearchResult)

	// 添加现有结果
	for _, result := range existing {
		key := m.generateResultKey(result)
		resultMap[key] = result
	}

	// 添加新结果，自动去重
	for _, result := range new {
		key := m.generateResultKey(result)
		if existingResult, exists := resultMap[key]; exists {
			// 合并相同结果的信息
			mergedResult := m.mergeIndividualResults(existingResult, result)
			resultMap[key] = mergedResult
		} else {
			resultMap[key] = result
		}
	}

	// 转换回切片
	merged := make([]model.SearchResult, 0, len(resultMap))
	for _, result := range resultMap {
		merged = append(merged, result)
	}

	return merged
}

// deduplicateSearchResults 深度去重搜索结果
func (m *AdvancedDataMerger) deduplicateSearchResults(existing, new []model.SearchResult) []model.SearchResult {
	// 更严格的去重逻辑
	resultMap := make(map[string]model.SearchResult)
	duplicateCount := 0

	// 处理现有结果
	for _, result := range existing {
		key := m.generateResultKey(result)
		resultMap[key] = result
	}

	// 处理新结果
	for _, result := range new {
		key := m.generateResultKey(result)
		if _, exists := resultMap[key]; !exists {
			resultMap[key] = result
		} else {
			duplicateCount++
		}
	}

	// 更新去重统计
	m.mergeMetrics.DuplicatesRemoved += int64(duplicateCount)

	// 转换回切片
	deduplicated := make([]model.SearchResult, 0, len(resultMap))
	for _, result := range resultMap {
		deduplicated = append(deduplicated, result)
	}

	return deduplicated
}

// generateResultKey 生成结果键用于去重
func (m *AdvancedDataMerger) generateResultKey(result model.SearchResult) string {
	// 使用标题和主要链接生成唯一键
	key := result.Title
	if len(result.Links) > 0 {
		key += "_" + result.Links[0].URL
	}
	return key
}

// mergeIndividualResults 合并单个结果
func (m *AdvancedDataMerger) mergeIndividualResults(existing, new model.SearchResult) model.SearchResult {
	merged := existing

	// 选择更完整的内容
	if len(new.Content) > len(existing.Content) {
		merged.Content = new.Content
	}

	// 合并链接
	linkMap := make(map[string]model.Link)
	for _, link := range existing.Links {
		linkMap[link.URL] = link
	}
	for _, link := range new.Links {
		linkMap[link.URL] = link
	}

	links := make([]model.Link, 0, len(linkMap))
	for _, link := range linkMap {
		links = append(links, link)
	}
	merged.Links = links

	// 合并标签
	tagMap := make(map[string]bool)
	for _, tag := range existing.Tags {
		tagMap[tag] = true
	}
	for _, tag := range new.Tags {
		tagMap[tag] = true
	}

	tags := make([]string, 0, len(tagMap))
	for tag := range tagMap {
		tags = append(tags, tag)
	}
	merged.Tags = tags

	// 使用更新的时间
	if new.Datetime.After(existing.Datetime) {
		merged.Datetime = new.Datetime
	}

	return merged
}

// hasOverlapResults 检查是否有重叠结果
func (m *AdvancedDataMerger) hasOverlapResults(existing, new *CacheOperation) bool {
	if len(existing.Data) == 0 || len(new.Data) == 0 {
		return false
	}

	// 简单重叠检测：检查前几个结果的标题
	checkCount := 3
	if len(existing.Data) < checkCount {
		checkCount = len(existing.Data)
	}
	if len(new.Data) < checkCount {
		checkCount = len(new.Data)
	}

	for i := 0; i < checkCount; i++ {
		for j := 0; j < checkCount; j++ {
			if existing.Data[i].Title == new.Data[j].Title {
				return true
			}
		}
	}

	return false
}

// chooseLongerTTL 选择更长的TTL
func (m *AdvancedDataMerger) chooseLongerTTL(ttl1, ttl2 time.Duration) time.Duration {
	if ttl1 > ttl2 {
		return ttl1
	}
	return ttl2
}

// chooseBetterPriority 选择更好的优先级
func (m *AdvancedDataMerger) chooseBetterPriority(priority1, priority2 int) int {
	if priority1 < priority2 { // 数字越小优先级越高
		return priority1
	}
	return priority2
}

// updateMergeMetrics 更新合并指标
func (m *AdvancedDataMerger) updateMergeMetrics(mergeTime time.Duration) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.mergeMetrics.TotalMergeTime += mergeTime

	// 更新平均时间
	if m.successfulMerges > 0 {
		m.mergeMetrics.AverageMergeTime = time.Duration(
			int64(m.mergeMetrics.TotalMergeTime) / m.successfulMerges)
	}

	// 更新最大时间
	if mergeTime > m.mergeMetrics.MaxMergeTime {
		m.mergeMetrics.MaxMergeTime = mergeTime
	}
}

// updateMergeStatistics 更新合并统计
func (m *AdvancedDataMerger) updateMergeStatistics(existing, new, merged *CacheOperation) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// 数据大小统计
	beforeSize := int64(existing.DataSize + new.DataSize)
	afterSize := int64(merged.DataSize)

	m.mergeMetrics.DataSizeBefore += beforeSize
	m.mergeMetrics.DataSizeAfter += afterSize

	// 计算压缩比例
	if m.mergeMetrics.DataSizeBefore > 0 {
		m.mergeMetrics.CompressionRatio = float64(m.mergeMetrics.DataSizeAfter) /
			float64(m.mergeMetrics.DataSizeBefore)
	}

	// 按类型统计
	m.mergeMetrics.MergesByPlugin[merged.PluginName]++
	m.mergeMetrics.MergesByKeyword[merged.Keyword]++

	// 结果整合统计
	originalCount := int64(len(existing.Data) + len(new.Data))
	mergedCount := int64(len(merged.Data))
	consolidated := originalCount - mergedCount

	if consolidated > 0 {
		m.mergeMetrics.ResultsConsolidated += consolidated
		m.mergeMetrics.StorageSaved += beforeSize - afterSize
	}
}

// GetMergeStats 获取合并统计
func (m *AdvancedDataMerger) GetMergeStats() map[string]interface{} {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	successRate := float64(0)
	if m.totalMerges > 0 {
		successRate = float64(m.successfulMerges) / float64(m.totalMerges)
	}

	return map[string]interface{}{
		"total_merges":         m.totalMerges,
		"successful_merges":    m.successfulMerges,
		"failed_merges":        m.failedMerges,
		"success_rate":         successRate,
		"merge_metrics":        m.mergeMetrics,
		"average_merge_time":   m.mergeMetrics.AverageMergeTime,
		"max_merge_time":       m.mergeMetrics.MaxMergeTime,
		"compression_ratio":    m.mergeMetrics.CompressionRatio,
		"duplicates_removed":   m.mergeMetrics.DuplicatesRemoved,
		"results_consolidated": m.mergeMetrics.ResultsConsolidated,
		"storage_saved":        m.mergeMetrics.StorageSaved,
	}
}

// 实现各种合并策略

// SameKeyMergeStrategy 相同键合并策略
type SameKeyMergeStrategy struct{}

func (s *SameKeyMergeStrategy) CanMerge(existing, new *CacheOperation) bool {
	return existing.Key == new.Key
}

func (s *SameKeyMergeStrategy) Merge(existing, new *CacheOperation) (*CacheOperation, error) {
	// 委托给合并器的方法
	return nil, fmt.Errorf("应该使用合并器的方法")
}

func (s *SameKeyMergeStrategy) GetPriority() int {
	return 1
}

// SamePluginKeywordMergeStrategy 同插件同关键词合并策略
type SamePluginKeywordMergeStrategy struct{}

func (s *SamePluginKeywordMergeStrategy) CanMerge(existing, new *CacheOperation) bool {
	return existing.PluginName == new.PluginName && existing.Keyword == new.Keyword
}

func (s *SamePluginKeywordMergeStrategy) Merge(existing, new *CacheOperation) (*CacheOperation, error) {
	return nil, fmt.Errorf("应该使用合并器的方法")
}

func (s *SamePluginKeywordMergeStrategy) GetPriority() int {
	return 2
}

// DeduplicationMergeStrategy 去重合并策略
type DeduplicationMergeStrategy struct{}

func (s *DeduplicationMergeStrategy) CanMerge(existing, new *CacheOperation) bool {
	// 检查是否有重复结果
	return len(existing.Data) > 0 && len(new.Data) > 0
}

func (s *DeduplicationMergeStrategy) Merge(existing, new *CacheOperation) (*CacheOperation, error) {
	return nil, fmt.Errorf("应该使用合并器的方法")
}

func (s *DeduplicationMergeStrategy) GetPriority() int {
	return 4
}

// ContentSimilarityMergeStrategy 内容相似性合并策略
type ContentSimilarityMergeStrategy struct{}

func (s *ContentSimilarityMergeStrategy) CanMerge(existing, new *CacheOperation) bool {
	// 简单的相似性检测：关键词相似度
	return existing.Keyword == new.Keyword ||
		(len(existing.Keyword) > 3 && len(new.Keyword) > 3 &&
			existing.Keyword[:3] == new.Keyword[:3])
}

func (s *ContentSimilarityMergeStrategy) Merge(existing, new *CacheOperation) (*CacheOperation, error) {
	return nil, fmt.Errorf("应该使用合并器的方法")
}

func (s *ContentSimilarityMergeStrategy) GetPriority() int {
	return 5
}
