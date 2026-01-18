package cache

import (
	"crypto/md5"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// SearchPatternAnalyzer 搜索模式分析器
type SearchPatternAnalyzer struct {
	// 模式缓存
	patternCache map[string]*SearchPattern
	cacheMutex   sync.RWMutex

	// 分析规则
	keywordRules []*KeywordRule

	// 统计信息
	analysisCount int64
	cacheHitCount int64

	// 配置
	maxCacheSize int
	cacheExpiry  time.Duration
}

// KeywordRule 关键词规则
type KeywordRule struct {
	Name        string
	Pattern     *regexp.Regexp
	Priority    int
	Description string
}

// NewSearchPatternAnalyzer 创建搜索模式分析器
func NewSearchPatternAnalyzer() *SearchPatternAnalyzer {
	analyzer := &SearchPatternAnalyzer{
		patternCache: make(map[string]*SearchPattern),
		maxCacheSize: 1000,          // 最大缓存1000个模式
		cacheExpiry:  1 * time.Hour, // 1小时过期
	}

	// 初始化关键词规则
	analyzer.initializeKeywordRules()

	return analyzer
}

// initializeKeywordRules 初始化关键词规则
func (s *SearchPatternAnalyzer) initializeKeywordRules() {
	s.keywordRules = []*KeywordRule{
		{
			Name:        "电影资源",
			Pattern:     regexp.MustCompile(`(?i)(电影|movie|film|影片|HD|4K|蓝光|BluRay)`),
			Priority:    1,
			Description: "电影相关搜索",
		},
		{
			Name:        "电视剧资源",
			Pattern:     regexp.MustCompile(`(?i)(电视剧|TV|series|连续剧|美剧|韩剧|日剧)`),
			Priority:    1,
			Description: "电视剧相关搜索",
		},
		{
			Name:        "动漫资源",
			Pattern:     regexp.MustCompile(`(?i)(动漫|anime|动画|漫画|manga)`),
			Priority:    1,
			Description: "动漫相关搜索",
		},
		{
			Name:        "音乐资源",
			Pattern:     regexp.MustCompile(`(?i)(音乐|music|歌曲|专辑|album|MP3|FLAC)`),
			Priority:    2,
			Description: "音乐相关搜索",
		},
		{
			Name:        "游戏资源",
			Pattern:     regexp.MustCompile(`(?i)(游戏|game|单机|网游|手游|steam)`),
			Priority:    2,
			Description: "游戏相关搜索",
		},
		{
			Name:        "软件资源",
			Pattern:     regexp.MustCompile(`(?i)(软件|software|app|应用|工具|破解)`),
			Priority:    2,
			Description: "软件相关搜索",
		},
		{
			Name:        "学习资源",
			Pattern:     regexp.MustCompile(`(?i)(教程|tutorial|课程|学习|教学|资料)`),
			Priority:    3,
			Description: "学习资源搜索",
		},
		{
			Name:        "文档资源",
			Pattern:     regexp.MustCompile(`(?i)(文档|doc|pdf|txt|电子书|ebook)`),
			Priority:    3,
			Description: "文档资源搜索",
		},
		{
			Name:        "通用搜索",
			Pattern:     regexp.MustCompile(`.*`), // 匹配所有
			Priority:    4,
			Description: "通用搜索模式",
		},
	}
}

// AnalyzePattern 分析搜索模式
func (s *SearchPatternAnalyzer) AnalyzePattern(op *CacheOperation) *SearchPattern {
	s.analysisCount++

	// 🔧 生成缓存键
	cacheKey := s.generateCacheKey(op)

	// 🚀 检查缓存
	s.cacheMutex.RLock()
	if cached, exists := s.patternCache[cacheKey]; exists {
		// 检查是否过期
		if time.Since(cached.LastAccessTime) < s.cacheExpiry {
			cached.LastAccessTime = time.Now()
			cached.Frequency++
			s.cacheMutex.RUnlock()
			s.cacheHitCount++
			return cached
		}
	}
	s.cacheMutex.RUnlock()

	// 🎯 分析新模式
	pattern := s.analyzeNewPattern(op)

	// 🗄️ 缓存结果
	s.cachePattern(cacheKey, pattern)

	return pattern
}

// generateCacheKey 生成缓存键
func (s *SearchPatternAnalyzer) generateCacheKey(op *CacheOperation) string {
	// 使用关键词和插件名生成缓存键
	source := fmt.Sprintf("%s_%s",
		s.normalizeKeyword(op.Keyword),
		op.PluginName)

	// MD5哈希以节省内存
	hash := md5.Sum([]byte(source))
	return fmt.Sprintf("%x", hash)
}

// normalizeKeyword 标准化关键词
func (s *SearchPatternAnalyzer) normalizeKeyword(keyword string) string {
	// 转换为小写
	normalized := strings.ToLower(keyword)

	// 移除特殊字符和多余空格
	normalized = regexp.MustCompile(`[^\w\s\u4e00-\u9fff]`).ReplaceAllString(normalized, " ")
	normalized = regexp.MustCompile(`\s+`).ReplaceAllString(normalized, " ")
	normalized = strings.TrimSpace(normalized)

	return normalized
}

// analyzeNewPattern 分析新模式
func (s *SearchPatternAnalyzer) analyzeNewPattern(op *CacheOperation) *SearchPattern {
	pattern := &SearchPattern{
		KeywordPattern: s.classifyKeyword(op.Keyword),
		PluginSet:      []string{op.PluginName},
		TimeWindow:     s.determineTimeWindow(op),
		Frequency:      1,
		LastAccessTime: time.Now(),
		Metadata:       make(map[string]interface{}),
	}

	// 🔍 关键词分析
	s.analyzeKeywordCharacteristics(pattern, op.Keyword)

	// 🔍 插件分析
	s.analyzePluginCharacteristics(pattern, op.PluginName)

	// 🔍 时间模式分析
	s.analyzeTimePattern(pattern, op.Timestamp)

	return pattern
}

// classifyKeyword 分类关键词
func (s *SearchPatternAnalyzer) classifyKeyword(keyword string) string {
	// 按优先级检查规则
	for _, rule := range s.keywordRules {
		if rule.Pattern.MatchString(keyword) {
			return rule.Name
		}
	}

	return "通用搜索"
}

// analyzeKeywordCharacteristics 分析关键词特征
func (s *SearchPatternAnalyzer) analyzeKeywordCharacteristics(pattern *SearchPattern, keyword string) {
	metadata := pattern.Metadata

	// 分析关键词长度
	metadata["keyword_length"] = len(keyword)

	// 分析关键词复杂度（包含的词数）
	words := strings.Fields(keyword)
	metadata["word_count"] = len(words)

	// 分析是否包含特殊字符
	hasSpecialChars := regexp.MustCompile(`[^\w\s\u4e00-\u9fff]`).MatchString(keyword)
	metadata["has_special_chars"] = hasSpecialChars

	// 分析是否包含数字
	hasNumbers := regexp.MustCompile(`\d`).MatchString(keyword)
	metadata["has_numbers"] = hasNumbers

	// 分析语言类型
	hasChinese := regexp.MustCompile(`[\u4e00-\u9fff]`).MatchString(keyword)
	hasEnglish := regexp.MustCompile(`[a-zA-Z]`).MatchString(keyword)

	if hasChinese && hasEnglish {
		metadata["language"] = "mixed"
	} else if hasChinese {
		metadata["language"] = "chinese"
	} else if hasEnglish {
		metadata["language"] = "english"
	} else {
		metadata["language"] = "other"
	}

	// 预测搜索频率（基于关键词特征）
	complexity := len(words)
	if hasSpecialChars {
		complexity++
	}
	if hasNumbers {
		complexity++
	}

	// 复杂度越低，搜索频率可能越高
	predictedFrequency := "medium"
	if complexity <= 2 {
		predictedFrequency = "high"
	} else if complexity >= 5 {
		predictedFrequency = "low"
	}

	metadata["predicted_frequency"] = predictedFrequency
}

// analyzePluginCharacteristics 分析插件特征
func (s *SearchPatternAnalyzer) analyzePluginCharacteristics(pattern *SearchPattern, pluginName string) {
	metadata := pattern.Metadata

	// 插件类型分析（基于名称推断）
	pluginType := "general"
	if strings.Contains(strings.ToLower(pluginName), "4k") {
		pluginType = "high_quality"
	} else if strings.Contains(strings.ToLower(pluginName), "pan") {
		pluginType = "cloud_storage"
	} else if strings.Contains(strings.ToLower(pluginName), "search") {
		pluginType = "search_engine"
	}

	metadata["plugin_type"] = pluginType
	metadata["plugin_name"] = pluginName
}

// analyzeTimePattern 分析时间模式
func (s *SearchPatternAnalyzer) analyzeTimePattern(pattern *SearchPattern, timestamp time.Time) {
	metadata := pattern.Metadata

	// 时间段分析
	hour := timestamp.Hour()
	var timePeriod string
	switch {
	case hour >= 6 && hour < 12:
		timePeriod = "morning"
	case hour >= 12 && hour < 18:
		timePeriod = "afternoon"
	case hour >= 18 && hour < 22:
		timePeriod = "evening"
	default:
		timePeriod = "night"
	}

	metadata["time_period"] = timePeriod

	// 工作日/周末分析
	weekday := timestamp.Weekday()
	isWeekend := weekday == time.Saturday || weekday == time.Sunday
	metadata["is_weekend"] = isWeekend

	// 预测最佳缓存时间（基于时间模式）
	if isWeekend || timePeriod == "evening" {
		pattern.TimeWindow = 30 * time.Minute // 高峰期，较长缓存
	} else {
		pattern.TimeWindow = 15 * time.Minute // 非高峰期，较短缓存
	}
}

// determineTimeWindow 确定时间窗口
func (s *SearchPatternAnalyzer) determineTimeWindow(op *CacheOperation) time.Duration {
	// 基本时间窗口：15分钟
	baseWindow := 15 * time.Minute

	// 根据优先级调整
	switch op.Priority {
	case 1: // 高优先级插件
		return baseWindow * 2 // 30分钟
	case 2: // 中高优先级插件
		return baseWindow * 3 / 2 // 22.5分钟
	case 3: // 中等优先级插件
		return baseWindow // 15分钟
	case 4: // 低优先级插件
		return baseWindow / 2 // 7.5分钟
	default:
		return baseWindow
	}
}

// cachePattern 缓存模式
func (s *SearchPatternAnalyzer) cachePattern(cacheKey string, pattern *SearchPattern) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	// 检查缓存大小，必要时清理
	if len(s.patternCache) >= s.maxCacheSize {
		s.cleanupCache()
	}

	s.patternCache[cacheKey] = pattern
}

// cleanupCache 清理缓存
func (s *SearchPatternAnalyzer) cleanupCache() {
	now := time.Now()

	// 收集需要删除的键
	toDelete := make([]string, 0)
	for key, pattern := range s.patternCache {
		if now.Sub(pattern.LastAccessTime) > s.cacheExpiry {
			toDelete = append(toDelete, key)
		}
	}

	// 如果过期删除不够，按使用频率删除
	if len(toDelete) < len(s.patternCache)/4 { // 删除不到25%
		// 按频率排序，删除使用频率最低的
		type patternFreq struct {
			key        string
			frequency  int
			lastAccess time.Time
		}

		patterns := make([]patternFreq, 0, len(s.patternCache))
		for key, pattern := range s.patternCache {
			patterns = append(patterns, patternFreq{
				key:        key,
				frequency:  pattern.Frequency,
				lastAccess: pattern.LastAccessTime,
			})
		}

		// 按频率排序（频率低的在前）
		sort.Slice(patterns, func(i, j int) bool {
			if patterns[i].frequency == patterns[j].frequency {
				return patterns[i].lastAccess.Before(patterns[j].lastAccess)
			}
			return patterns[i].frequency < patterns[j].frequency
		})

		// 删除前25%
		deleteCount := len(patterns) / 4
		for i := 0; i < deleteCount; i++ {
			toDelete = append(toDelete, patterns[i].key)
		}
	}

	// 执行删除
	for _, key := range toDelete {
		delete(s.patternCache, key)
	}
}

// GetCacheStats 获取缓存统计
func (s *SearchPatternAnalyzer) GetCacheStats() map[string]interface{} {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()

	hitRate := float64(0)
	if s.analysisCount > 0 {
		hitRate = float64(s.cacheHitCount) / float64(s.analysisCount)
	}

	return map[string]interface{}{
		"cache_size":      len(s.patternCache),
		"max_cache_size":  s.maxCacheSize,
		"analysis_count":  s.analysisCount,
		"cache_hit_count": s.cacheHitCount,
		"hit_rate":        hitRate,
		"cache_expiry":    s.cacheExpiry,
	}
}

// GetPopularPatterns 获取热门模式
func (s *SearchPatternAnalyzer) GetPopularPatterns(limit int) []*SearchPattern {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()

	patterns := make([]*SearchPattern, 0, len(s.patternCache))
	for _, pattern := range s.patternCache {
		patterns = append(patterns, pattern)
	}

	// 按频率排序
	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Frequency > patterns[j].Frequency
	})

	if limit > 0 && limit < len(patterns) {
		patterns = patterns[:limit]
	}

	return patterns
}
