# 插件超时问题彻底解决方案

## 问题分析

### 当前问题现状
从 Zeabur 生产环境监控数据显示：
- 平均耗时：14554ms（约 14.5 秒）
- 插件超时次数：6 次
- Warning 次数：9 次
- 频繁出现 "plugin · sidhub · 插件搜索超时" 错误
- **核心问题**：插件超时会阻塞搜索结果展示，导致用户长时间看到加载状态

### 根本原因

#### 1. **超时时间配置过长**
- 默认插件超时：**30 秒**（`defaultPluginTimeout = 30 * time.Second`）
- 异步响应超时：4 秒（`defaultAsyncResponseTimeout = 4 * time.Second`）
- 30 秒超时在生产环境下太长，导致用户等待时间过长

#### 2. **渐进式搜索中的超时处理问题**
位置：`backend/service/search_progressive.go:225-244`

```go
select {
case result := <-done:
    // 正常完成
case <-time.After(pluginTimeout):  // 等待 30 秒！
    // 超时处理
}
```

每个插件都会等待完整的超时时间（30秒），虽然是并发执行，但对于慢插件会严重影响用户体验。

#### 3. **缓存机制未充分利用**
- 异步插件有两层超时：4秒快速响应 + 30秒后台完成
- 但超时后返回空结果，没有充分利用部分缓存
- 前端等待所有插件完成才展示结果

#### 4. **前端展示逻辑问题**
- 渐进式搜索虽然支持逐步返回结果，但前端可能在等待所有源完成
- 没有优雅降级机制：超时插件会显示 Warning，但不影响已获取的结果展示

## 解决方案

### 方案一：优化超时配置（立即生效，最小改动）

#### 1.1 调整默认超时时间

**文件：`backend/plugin/baseasyncplugin.go`**

```go
// 当前配置（第 34-36 行）
defaultAsyncResponseTimeout = 4 * time.Second
defaultPluginTimeout        = 30 * time.Second  // ❌ 太长

// 推荐配置
defaultAsyncResponseTimeout = 3 * time.Second   // ✅ 快速响应 3 秒
defaultPluginTimeout        = 10 * time.Second  // ✅ 总超时 10 秒
```

#### 1.2 通过环境变量配置

**在 `.env` 或部署环境中设置：**

```bash
# 插件总超时时间（秒）
PLUGIN_TIMEOUT=10

# 异步响应超时时间（秒）
ASYNC_RESPONSE_TIMEOUT=3
```

**影响：**
- 立即生效，无需修改代码
- 用户最多等待 10 秒而不是 30 秒
- 3 秒内无响应的插件返回空结果，但后台继续处理并更新缓存

---

### 方案二：实现智能超时和降级（推荐，最佳用户体验）

#### 2.1 插件健康状态感知超时

**思路：** 根据插件历史表现动态调整超时时间

**文件：`backend/service/search_progressive.go`**

在 `startProgressivePluginTasks` 方法中添加动态超时逻辑：

```go
func (s *SearchService) startProgressivePluginTasks(...) {
    // ... 现有代码 ...
    
    for _, p := range plugins {
        currentPlugin := p
        wg.Add(1)
        go func() {
            defer wg.Done()
            
            // 🔥 动态超时：根据插件健康状态调整
            pluginTimeout := s.getAdaptiveTimeout(currentPlugin.Name())
            
            // ... 现有逻辑 ...
        }()
    }
}

// 新增方法：根据插件健康状态返回动态超时
func (s *SearchService) getAdaptiveTimeout(pluginName string) time.Duration {
    baseTimeout := effectivePluginTimeout()
    
    if s.pluginHealth == nil {
        return baseTimeout
    }
    
    // 获取插件健康状态
    status, err := s.pluginHealth.GetStatus(pluginName)
    if err != nil || status == nil {
        return baseTimeout
    }
    
    // 根据超时率调整超时时间
    timeoutRate := status.TimeoutRate
    if timeoutRate > 0.5 {
        // 超时率 > 50%：使用 50% 的超时时间
        return baseTimeout / 2
    } else if timeoutRate > 0.3 {
        // 超时率 > 30%：使用 70% 的超时时间
        return baseTimeout * 7 / 10
    }
    
    return baseTimeout
}
```

#### 2.2 插件优先级队列

**思路：** 快速插件先返回结果，慢插件最后处理

**实现：**

```go
// 按历史平均响应时间排序插件
type pluginWithPriority struct {
    plugin          plugin.AsyncSearchPlugin
    avgResponseTime time.Duration
}

func (s *SearchService) sortPluginsBySpeed(plugins []plugin.AsyncSearchPlugin) []plugin.AsyncSearchPlugin {
    withPriority := make([]pluginWithPriority, 0, len(plugins))
    
    for _, p := range plugins {
        avgTime := s.getPluginAvgResponseTime(p.Name())
        withPriority = append(withPriority, pluginWithPriority{
            plugin:          p,
            avgResponseTime: avgTime,
        })
    }
    
    // 按响应时间升序排序（快的优先）
    sort.Slice(withPriority, func(i, j int) bool {
        return withPriority[i].avgResponseTime < withPriority[j].avgResponseTime
    })
    
    result := make([]plugin.AsyncSearchPlugin, len(withPriority))
    for i, wp := range withPriority {
        result[i] = wp.plugin
    }
    return result
}
```

#### 2.3 插件超时自动降级

**文件：`backend/service/plugin_health_service.go`**

添加自动禁用逻辑：

```go
// 在 RecordResult 方法中添加
func (s *PluginHealthService) RecordResult(pluginName string, healthy bool, message string, source string) error {
    // ... 现有代码 ...
    
    // 🔥 超时率过高自动降级
    if source == "timeout" && status.TimeoutRate > 0.7 {
        // 超时率 > 70%，临时禁用 5 分钟
        s.temporarilyDisable(pluginName, 5*time.Minute, "连续超时率过高")
    }
    
    return nil
}
```

---

### 方案三：前端优化（配合后端改进）

#### 3.1 渐进式展示结果

**前端逻辑：**

```typescript
// 不等待所有插件完成，有结果就展示
function handleSearchProgressiveEvent(event: SearchProgressiveEvent) {
    if (event.type === 'batch') {
        // 立即展示当前已获取的结果
        updateResults(event.resources);
        
        // 显示进度：已完成 X/Y 个来源
        updateProgress(event.completedSources, event.totalSources);
    }
    
    if (event.type === 'warning') {
        // 超时警告不阻塞展示，仅显示提示
        showToast(`${event.source} 响应较慢，已返回其他来源结果`);
    }
}
```

#### 3.2 超时插件视觉降级

```typescript
// 对超时的插件显示占位符或提示
function renderPluginStatus(plugin: string, status: 'loading' | 'timeout' | 'success') {
    if (status === 'timeout') {
        return (
            <div className="plugin-timeout-notice">
                {plugin} 响应超时，可稍后刷新查看
            </div>
        );
    }
}
```

---

### 方案四：缓存优化（提高命中率）

#### 4.1 优先返回缓存，后台刷新

**文件：`backend/plugin/baseasyncplugin.go:356-384`**

当前逻辑已经支持，但需要优化：

```go
// 当前代码（第 369 行）
if len(cachedResult.Results) > 0 {
    // 🔥 优化：即使缓存过期，也立即返回
    // 同时在后台刷新
    go p.refreshCacheInBackground(...)
    return cachedResult.Results, nil
}
```

#### 4.2 缓存预热

**针对热门关键词和频繁超时的插件：**

```go
// 定时任务：预热常用关键词
func (s *SearchService) WarmupCache() {
    popularKeywords := []string{"金特务", "玩具总动员5"}
    
    for _, keyword := range popularKeywords {
        go s.Search(keyword, ...)
    }
}
```

---

## 推荐实施方案

### 阶段一：快速缓解（1 小时内完成）

✅ **立即执行：**

1. **调整环境变量**（Zeabur 部署环境）：
```bash
PLUGIN_TIMEOUT=10              # 从 30 秒降到 10 秒
ASYNC_RESPONSE_TIMEOUT=3       # 从 4 秒降到 3 秒
```

2. **禁用频繁超时的插件**：
```bash
# 临时移除 sidhub 插件
ENABLED_PLUGINS=labi,shandian,muou,wanou,hunhepan,pansearch,panta,susu,thepiratebay,ouge,clmao,u3c3,jutoushe,nyaa,xinjuc,aikanzy,quark4k,quarksoo,huban,panwiki,panyq
```

**预期效果：**
- 平均搜索时间从 14.5 秒降至 6-8 秒
- 超时次数减少 70%
- 用户体验立即改善

### 阶段二：优化实现（1-2 天）

✅ **开发任务：**

1. **实现动态超时**（方案二 2.1）
2. **插件优先级队列**（方案二 2.2）
3. **前端渐进式展示**（方案三 3.1）

**预期效果：**
- 首屏结果展示时间 < 3 秒
- 整体搜索完成时间 < 8 秒
- 超时率 < 5%

### 阶段三：长期优化（持续）

✅ **监控和调优：**

1. **插件性能监控面板**
2. **自动降级和恢复机制**
3. **缓存策略优化**
4. **插件健康检查定时任务**

---

## 具体修改代码

### 修改 1：调整默认超时时间

**文件：`backend/plugin/baseasyncplugin.go:34-36`**

```go
// 修改前
defaultAsyncResponseTimeout = 4 * time.Second
defaultPluginTimeout        = 30 * time.Second

// 修改后
defaultAsyncResponseTimeout = 3 * time.Second   // 快速响应 3 秒
defaultPluginTimeout        = 10 * time.Second  // 总超时 10 秒
```

### 修改 2：优化超时后的空结果处理

**文件：`backend/plugin/baseasyncplugin.go:554-587`**

```go
case <-time.After(responseTimeout):
    // 检查是否有部分缓存可用
    if cachedItems, ok := apiResponseCache.Load(pluginSpecificCacheKey); ok {
        cachedResult := cachedItems.(cachedResponse)
        if len(cachedResult.Results) > 0 {
            recordCacheAccess(pluginSpecificCacheKey)
            // 🔥 返回部分缓存，不返回空结果
            return cachedResult.Results, nil
        }
    }
    
    // 🔥 新增：检查是否有其他相关缓存（关键词变体）
    if alternativeCache := p.findAlternativeCache(keyword); alternativeCache != nil {
        return alternativeCache, nil
    }
    
    // 最后才返回空结果
    return []model.SearchResult{}, nil
```

### 修改 3：添加插件健康状态感知

**文件：`backend/service/search_progressive.go:200-244`**

在现有代码中的超时处理部分添加：

```go
// 第 200 行附近
pluginTimeout := effectivePluginTimeout()

// 🔥 新增：根据插件健康状态调整超时
if s.pluginHealth != nil {
    if status, err := s.pluginHealth.GetStatus(currentPlugin.Name()); err == nil && status != nil {
        if status.TimeoutRate > 0.5 {
            // 超时率过高，降低超时时间
            pluginTimeout = pluginTimeout / 2
        }
    }
}
```

---

## 监控和验证

### 关键指标

部署后需要监控以下指标：

1. **搜索性能指标：**
   - 平均搜索耗时（目标：< 8 秒）
   - P95 搜索耗时（目标：< 12 秒）
   - P99 搜索耗时（目标：< 15 秒）

2. **插件健康指标：**
   - 插件超时次数（目标：< 5%）
   - 插件成功率（目标：> 90%）
   - Warning 数量（目标：< 3 次/搜索）

3. **缓存指标：**
   - 缓存命中率（目标：> 40%）
   - 缓存更新成功率（目标：> 95%）

### 验证方法

```bash
# 1. 测试搜索性能
curl -X POST https://your-app.zeabur.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"keyword":"金特务：本色回归"}' \
  -w "\nTime: %{time_total}s\n"

# 2. 查看插件健康状态
curl https://your-app.zeabur.app/api/admin/system-info

# 3. 监控日志
zeabur logs --tail 100
```

---

## 总结

### 立即执行
1. ✅ 修改环境变量：`PLUGIN_TIMEOUT=10`，`ASYNC_RESPONSE_TIMEOUT=3`
2. ✅ 临时禁用高超时插件（sidhub）

### 短期优化
3. ✅ 修改代码中的默认超时时间
4. ✅ 优化前端渐进式展示逻辑

### 长期优化
5. ✅ 实现动态超时和插件优先级
6. ✅ 完善监控和自动降级机制

**预期效果：**
- 🎯 搜索平均耗时从 14.5 秒降至 6-8 秒
- 🎯 超时次数减少 80%
- 🎯 用户体验显著改善，搜索结果快速展示
