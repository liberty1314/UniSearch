package cache

import (
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"sync"

	"unisearch/plugin"
)

// 预计算的哈希值映射
var (
	channelHashCache sync.Map // 存储频道列表哈希
	pluginHashCache  sync.Map // 存储插件列表哈希

	// 预先计算的常用列表哈希值
	precomputedHashes sync.Map

	// 所有插件名称的哈希值
	allPluginsHash string
	// 所有频道名称的哈希值
	allChannelsHash string
)

// searchResultCacheSchemaVersion 用于隔离搜索结果结构变更前后的缓存。
const searchResultCacheSchemaVersion = "v6"

var searchResultExtWhitelist = []string{
	"sidhub_base_url",
	"title_en",
}

// 初始化预计算的哈希值
func init() {
	// 预计算空列表的哈希值
	precomputedHashes.Store("empty_channels", "all")

	// 预计算所有插件的哈希值
	allPlugins := plugin.GetRegisteredPlugins()
	allPluginNames := make([]string, 0, len(allPlugins))
	for _, p := range allPlugins {
		allPluginNames = append(allPluginNames, p.Name())
	}
	sort.Strings(allPluginNames)
	allPluginsHash = calculateListHash(allPluginNames)
	precomputedHashes.Store("all_plugins", allPluginsHash)

	// 预计算所有频道的哈希值（这里假设有一个全局频道列表）
	// 注意：如果没有全局频道列表，可以使用一个默认值
	allChannelsHash = "all"
	precomputedHashes.Store("all_channels", allChannelsHash)
}

// GenerateTGCacheKey 为TG搜索生成缓存键（新版本 - Redis 迁移）
// 使用 SHA256 哈希算法生成查询字符串的哈希值
// 返回格式: tg:search:{query_hash}
// 注意：此函数签名已更改以符合 Redis 缓存迁移规范
func GenerateTGCacheKey(query string, channels []string) string {
	normalizedQuery := strings.ToLower(strings.TrimSpace(query))
	channelsHash := getChannelsHash(channels)
	hash := sha256.Sum256([]byte(searchResultCacheSchemaVersion + ":" + normalizedQuery + ":" + channelsHash))
	return fmt.Sprintf("tg:search:%x", hash)
}

// GenerateTGCacheKeyLegacy 为TG搜索生成缓存键（旧版本 - 保留向后兼容）
// 已弃用：请使用 GenerateTGCacheKey(query string) 代替
func GenerateTGCacheKeyLegacy(keyword string, channels []string) string {
	// 关键词标准化
	normalizedKeyword := strings.ToLower(strings.TrimSpace(keyword))

	// 获取频道列表哈希
	channelsHash := getChannelsHash(channels)

	// 生成TG搜索特定的缓存键
	keyStr := fmt.Sprintf("tg:%s:%s", normalizedKeyword, channelsHash)
	hash := md5.Sum([]byte(keyStr))
	return hex.EncodeToString(hash[:])
}

// GeneratePluginCacheKey 为插件搜索生成缓存键（新版本 - Redis 迁移）
// 缓存键包含查询词与实际参与搜索的插件集合，避免启停后缓存污染
// 返回格式: plugin:search:{query_and_plugins_hash}
func GeneratePluginCacheKey(query string, pluginNames []string, ext map[string]interface{}) string {
	normalizedQuery := strings.ToLower(strings.TrimSpace(query))
	pluginsHash := getPluginsHash(pluginNames)
	extSignature := buildWhitelistedExtSignature(ext)
	hash := sha256.Sum256([]byte(searchResultCacheSchemaVersion + ":" + normalizedQuery + ":" + pluginsHash + ":" + extSignature))
	return fmt.Sprintf("plugin:search:%x", hash)
}

// GeneratePluginCacheKeyLegacy 为插件搜索生成缓存键（旧版本 - 保留向后兼容）
// 已弃用：请使用 GeneratePluginCacheKey(query string) 代替
func GeneratePluginCacheKeyLegacy(keyword string, plugins []string) string {
	// 关键词标准化
	normalizedKeyword := strings.ToLower(strings.TrimSpace(keyword))

	// 获取插件列表哈希
	pluginsHash := getPluginsHash(plugins)

	// 生成插件搜索特定的缓存键
	keyStr := fmt.Sprintf("plugin:%s:%s", normalizedKeyword, pluginsHash)
	hash := md5.Sum([]byte(keyStr))
	return hex.EncodeToString(hash[:])
}

// GenerateCacheKey 根据所有影响搜索结果的参数生成缓存键
func GenerateCacheKey(keyword string, channels []string, sourceType string, plugins []string) string {
	// 关键词标准化
	normalizedKeyword := strings.ToLower(strings.TrimSpace(keyword))

	// 获取频道列表哈希
	channelsHash := getChannelsHash(channels)

	// 源类型处理
	if sourceType == "" {
		sourceType = "all"
	}

	// 插件参数规范化处理
	var pluginsHash string
	if sourceType == "tg" {
		// 对于只搜索Telegram的请求，忽略插件参数
		pluginsHash = "none"
	} else {
		// 获取插件列表哈希
		pluginsHash = getPluginsHash(plugins)
	}

	// 生成最终缓存键
	keyStr := fmt.Sprintf("%s:%s:%s:%s", normalizedKeyword, channelsHash, sourceType, pluginsHash)
	hash := md5.Sum([]byte(keyStr))
	return hex.EncodeToString(hash[:])
}

// 获取或计算频道哈希
func getChannelsHash(channels []string) string {
	if channels == nil || len(channels) == 0 {
		// 使用预计算的所有频道哈希
		if hash, ok := precomputedHashes.Load("all_channels"); ok {
			return hash.(string)
		}
		return allChannelsHash
	}

	// 对于小型列表，直接使用字符串连接
	if len(channels) < 5 {
		channelsCopy := make([]string, len(channels))
		copy(channelsCopy, channels)
		sort.Strings(channelsCopy)

		// 直接返回排序后的字符串连接
		return strings.Join(channelsCopy, ",")
	}

	// 生成排序后的字符串用作键
	channelsCopy := make([]string, len(channels))
	copy(channelsCopy, channels)
	sort.Strings(channelsCopy)
	key := strings.Join(channelsCopy, ",")

	// 尝试从缓存获取
	if hash, ok := channelHashCache.Load(key); ok {
		return hash.(string)
	}

	// 计算哈希
	hash := calculateListHash(channelsCopy)

	// 存入缓存
	channelHashCache.Store(key, hash)
	return hash
}

// 获取或计算插件哈希
func getPluginsHash(plugins []string) string {
	// 检查是否为空列表
	if plugins == nil || len(plugins) == 0 {
		// 使用预计算的所有插件哈希
		if hash, ok := precomputedHashes.Load("all_plugins"); ok {
			return hash.(string)
		}
		return allPluginsHash
	}

	// 检查是否有空字符串元素
	hasNonEmptyPlugin := false
	for _, p := range plugins {
		if p != "" {
			hasNonEmptyPlugin = true
			break
		}
	}

	// 如果全是空字符串，也视为空列表
	if !hasNonEmptyPlugin {
		if hash, ok := precomputedHashes.Load("all_plugins"); ok {
			return hash.(string)
		}
		return allPluginsHash
	}

	// 对于小型列表，直接使用字符串连接
	if len(plugins) < 5 {
		pluginsCopy := make([]string, 0, len(plugins))
		for _, p := range plugins {
			if p != "" { // 忽略空字符串
				pluginsCopy = append(pluginsCopy, p)
			}
		}
		sort.Strings(pluginsCopy)

		// 直接返回排序后的字符串连接
		return strings.Join(pluginsCopy, ",")
	}

	// 生成排序后的字符串用作键，忽略空字符串
	pluginsCopy := make([]string, 0, len(plugins))
	for _, p := range plugins {
		if p != "" { // 忽略空字符串
			pluginsCopy = append(pluginsCopy, p)
		}
	}
	sort.Strings(pluginsCopy)
	key := strings.Join(pluginsCopy, ",")

	// 尝试从缓存获取
	if hash, ok := pluginHashCache.Load(key); ok {
		return hash.(string)
	}

	// 计算哈希
	hash := calculateListHash(pluginsCopy)

	// 存入缓存
	pluginHashCache.Store(key, hash)
	return hash
}

// 计算列表的哈希值
func calculateListHash(items []string) string {
	h := md5.New()
	for _, item := range items {
		h.Write([]byte(item))
	}
	return hex.EncodeToString(h.Sum(nil))
}

func buildWhitelistedExtSignature(ext map[string]interface{}) string {
	if len(ext) == 0 {
		return "default"
	}

	pairs := make([]string, 0, len(searchResultExtWhitelist))
	for _, key := range searchResultExtWhitelist {
		value, ok := ext[key]
		if !ok {
			continue
		}

		normalizedValue := strings.TrimSpace(fmt.Sprint(value))
		if normalizedValue == "" {
			continue
		}
		pairs = append(pairs, key+"="+normalizedValue)
	}

	if len(pairs) == 0 {
		return "default"
	}

	sort.Strings(pairs)
	return strings.Join(pairs, "&")
}

// GenerateCacheKeyV2 根据所有影响搜索结果的参数生成缓存键
// 为保持向后兼容，保留原函数，但标记为已弃用
func GenerateCacheKeyV2(keyword string, channels []string, sourceType string, plugins []string) string {
	// 关键词标准化：去除首尾空格，转为小写
	normalizedKeyword := strings.ToLower(strings.TrimSpace(keyword))

	// 频道处理
	var channelsStr string
	if channels != nil && len(channels) > 0 {
		channelsCopy := make([]string, len(channels))
		copy(channelsCopy, channels)
		sort.Strings(channelsCopy)
		channelsStr = strings.Join(channelsCopy, ",")
	} else {
		channelsStr = "all"
	}

	// 插件处理
	var pluginsStr string
	if plugins != nil && len(plugins) > 0 {
		pluginsCopy := make([]string, len(plugins))
		copy(pluginsCopy, plugins)
		sort.Strings(pluginsCopy)
		pluginsStr = strings.Join(pluginsCopy, ",")
	} else {
		pluginsStr = "all"
	}

	// 源类型处理
	if sourceType == "" {
		sourceType = "all"
	}

	// 生成缓存键字符串
	keyStr := fmt.Sprintf("v2:%s:%s:%s:%s", normalizedKeyword, channelsStr, sourceType, pluginsStr)

	// 计算MD5哈希
	hash := md5.Sum([]byte(keyStr))
	return hex.EncodeToString(hash[:])
}

// GenerateCacheKeyLegacy 根据查询和过滤器生成缓存键
// 为保持向后兼容，保留原函数，但重命名为更清晰的名称
func GenerateCacheKeyLegacy(query string, filters map[string]string) string {
	// 如果只需要基于关键词的缓存，不考虑过滤器，调用新函数
	if filters == nil || len(filters) == 0 {
		return GenerateCacheKey(query, nil, "", nil)
	}

	// 创建包含查询和所有过滤器的字符串
	keyStr := query

	// 按字母顺序排序过滤器键，确保相同的过滤器集合总是产生相同的键
	var keys []string
	for k := range filters {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// 添加过滤器到键字符串
	for _, k := range keys {
		keyStr += "|" + k + "=" + filters[k]
	}

	// 计算MD5哈希
	hash := md5.Sum([]byte(keyStr))
	return hex.EncodeToString(hash[:])
}
