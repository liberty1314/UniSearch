# 生产环境部署优化指南

## 🎯 目标

解决 Zeabur 生产环境中的插件超时问题，将平均搜索耗时从 14.5 秒降至 6-8 秒。

## 📊 当前问题

- ❌ 平均耗时：14554ms (14.5 秒)
- ❌ 插件超时：6 次
- ❌ Warning 数量：9 次
- ❌ 频繁出现 "plugin · sidhub · 插件搜索超时"

## ✅ 已实施的代码优化

### 1. 降低默认超时时间

**修改的文件：**
- `backend/plugin/baseasyncplugin.go` - 异步插件超时配置
- `backend/service/search_progressive.go` - 渐进式搜索超时配置  
- `backend/service/search_executor.go` - 插件执行器超时配置

**优化内容：**
```go
// 优化前
defaultAsyncResponseTimeout = 4 * time.Second   // 快速响应超时
defaultPluginTimeout        = 30 * time.Second  // 总超时

// 优化后
defaultAsyncResponseTimeout = 3 * time.Second   // 快速响应 3 秒
defaultPluginTimeout        = 10 * time.Second  // 总超时 10 秒
```

**效果预期：**
- ✅ 插件最多等待 10 秒（原 30 秒）
- ✅ 快速响应时间缩短至 3 秒（原 4 秒）
- ✅ 用户等待时间减少 66%

## 🚀 立即部署步骤

### 步骤 1：提交代码更改

```bash
# 1. 查看修改
git status

# 2. 添加修改的文件
git add backend/plugin/baseasyncplugin.go
git add backend/service/search_progressive.go
git add backend/service/search_executor.go

# 3. 提交
git commit -m "perf(plugin): 优化插件超时配置，降低默认超时时间从30秒至10秒"

# 4. 推送到远程
git push origin dev
```

### 步骤 2：Zeabur 环境变量配置（可选但推荐）

在 Zeabur 控制台添加以下环境变量以进一步优化：

```bash
# 插件超时配置（秒）
PLUGIN_TIMEOUT=10

# 异步响应超时配置（秒）
ASYNC_RESPONSE_TIMEOUT=3

# 并发配置（根据实际情况调整）
DEFAULT_CONCURRENCY=5
ASYNC_MAX_BACKGROUND_WORKERS=20
ASYNC_MAX_BACKGROUND_TASKS=100

# 禁用频繁超时的插件（可选）
# ENABLED_PLUGINS=labi,shandian,muou,wanou,hunhepan,pansearch,panta,susu,thepiratebay,ouge,clmao,u3c3,jutoushe,nyaa,xinjuc,aikanzy,quark4k,quarksoo,huban,panwiki,panyq
```

### 步骤 3：部署到 Zeabur

Zeabur 会自动检测到代码推送并触发部署。

或手动触发重新部署：
1. 进入 Zeabur 项目页面
2. 点击服务
3. 点击 "Redeploy" 按钮

### 步骤 4：验证部署效果

**测试搜索性能：**

```bash
# 使用 curl 测试（替换为你的实际域名）
time curl -X POST https://your-app.zeabur.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"keyword":"金特务：本色回归","sourceType":"all"}'

# 查看响应时间应该在 6-10 秒内
```

**检查健康监控：**

访问健康监控页面：
```
https://your-app.zeabur.app/api/search/observability
```

关注以下指标：
- 平均搜索耗时（应 < 10 秒）
- 插件超时次数（应显著减少）
- Warning 数量（应 < 3 次）

## 📈 预期改进效果

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 平均搜索耗时 | 14.5 秒 | 6-8 秒 | **↓ 55%** |
| 插件超时次数 | 6 次/搜索 | 1-2 次/搜索 | **↓ 70%** |
| P95 延迟 | 25+ 秒 | 12 秒 | **↓ 52%** |
| 用户体验 | 😟 较差 | 😊 良好 | **显著提升** |

## 🔧 故障排查

### 问题 1：超时次数仍然很高

**解决方案：**

1. 检查是否有特定插件频繁超时：
```bash
# 查看日志中的超时插件
zeabur logs | grep "插件搜索超时"
```

2. 临时禁用问题插件：
```bash
# 在环境变量中设置 ENABLED_PLUGINS，移除超时插件
# 例如移除 sidhub：
ENABLED_PLUGINS=labi,shandian,muou,wanou,hunhepan,pansearch,panta,susu,thepiratebay,ouge,clmao,u3c3,jutoushe,nyaa,xinjuc,aikanzy,quark4k,quarksoo,huban,panwiki,panyq
```

### 问题 2：某些搜索结果变少

**原因：** 超时时间缩短后，慢速插件可能来不及返回结果。

**解决方案：**

1. 检查缓存命中率是否正常
2. 考虑为特定插件单独配置更长的超时时间
3. 启用缓存预热机制

### 问题 3：部署后无明显改善

**检查清单：**

- [ ] 确认代码已成功部署到 Zeabur
- [ ] 检查环境变量是否生效：`zeabur env`
- [ ] 清除浏览器缓存，使用隐私模式测试
- [ ] 检查 Zeabur 容器日志是否有错误

## 🎓 进一步优化建议

### 短期优化（1-2 周）

1. **实现插件健康状态感知**
   - 自动降级频繁超时的插件
   - 根据历史表现动态调整超时时间

2. **前端渐进式展示优化**
   - 有结果立即展示，不等待所有插件
   - 超时插件显示占位符和提示

3. **缓存策略优化**
   - 增加热门关键词缓存预热
   - 优化缓存 TTL 配置

### 长期优化（持续进行）

1. **插件性能监控面板**
   - 实时监控每个插件的响应时间
   - 可视化超时率和成功率

2. **智能负载均衡**
   - 快速插件优先处理
   - 慢速插件降低优先级

3. **插件自动降级和恢复**
   - 超时率 > 50% 自动临时禁用 5 分钟
   - 自动检测恢复后重新启用

## 📞 支持

如有问题，请检查：
1. [完整解决方案文档](./plugin-timeout-solution.md)
2. Zeabur 部署日志
3. 应用健康监控接口

---

**部署清单：**

- [x] 修改代码降低默认超时时间
- [ ] 提交并推送代码到 Git
- [ ] 在 Zeabur 配置环境变量
- [ ] 触发重新部署
- [ ] 验证部署效果
- [ ] 监控关键指标
