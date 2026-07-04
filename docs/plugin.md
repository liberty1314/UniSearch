UniSearch 插件超时优化长期方案

  一、现状分析

  现有架构优势：
  - 双层超时系统：3秒快速响应 + 10秒后台超时
  - Worker Pool 并发控制（默认20并发）
  - 已实现但未集成的自适应超时计算器
  - 渐进式搜索支持

  当前问题：
  1. 自适应超时计算器已实现但未集成到搜索流程
  2. 缺乏历史性能数据持久化
  3. 无熔断机制，故障插件持续消耗资源
  4. 所有插件使用相同超时，无差异化处理
  5. 缺乏可视化监控面板

  ---
  二、三大优化方向

  1. 插件性能监控面板

  核心指标：
  - 响应时间（p50/p95/p99）
  - 成功率、超时率、错误率
  - 缓存命中率
  - 并发请求数
  - 连续失败次数

  数据收集：
  - 在 search_executor.go 包装每个插件执行
  - 使用环形缓冲区（10000条）暂存原始数据
  - 每5分钟聚合并批量写入数据库

  存储方案：
  - plugin_performance_metrics 表：时序聚合数据（30天保留）
  - plugin_error_logs 表：详细错误日志（7天保留）
  - 索引：(plugin_name, timestamp)

  前端展示：
  - 实时指标卡片（活跃插件数、平均响应、成功率、错误数）
  - Recharts 响应时间趋势图
  - 插件性能对比表（可排序、可下钻）
  - 错误日志抽屉

  实施工作量： 4-5天

  ---
  2. 自动降级和恢复机制

  熔断器三态：

  Closed（闭合）→ Open（熔断）触发条件：
  - 连续失败 ≥ 5次
  - 超时率 > 80%
  - 滑动窗口（10次请求）错误率 > 70%

  Open → HalfOpen（半开）条件：
  - 冷却期结束（30秒-5分钟，指数退避）

  HalfOpen → Closed 条件：
  - 连续3次探测成功

  HalfOpen → Open 条件：
  - 任何1次失败

  降级策略：
  1. 临时跳过：Open 状态直接跳过插件，返回降级提示
  2. 超时缩短：超时率 > 70% 时缩短至 40% 基准值
  3. 优先级降低：渐进式搜索中将高风险插件排到后面
  4. 并发限制：不健康插件降低并发配额

  健康检查：
  - 主动探测：Closed 状态 5分钟/次，Open 状态 30秒/次
  - 被动记录：每次搜索后自动更新健康状态
  - 使用固定轻量级关键词"健康检查"

  核心实现：
  // service/plugin_circuit_breaker.go
  type CircuitBreakerService struct {
      pluginHealthService *PluginHealthService
      db                  *gorm.DB
      stateLocks          sync.Map // 每插件独立锁
  }
  
  func (s *CircuitBreakerService) ShouldAllowRequest(pluginName string) (bool, CircuitState)
  func (s *CircuitBreakerService) RecordResult(pluginName string, success bool, errMsg string)

  集成点：
  - search_executor.go: 构建任务前调用 ShouldAllowRequest
  - plugin_health_service.go: 扩展模型添加熔断状态字段
  - search_adaptive_timeout.go: 整合现有超时计算

  实施工作量： 4-5天

  ---
  3. 智能负载均衡

  动态优先级计算：
  综合得分 = 健康权重(1-超时率) × 0.4
           + 性能权重(1/(1+平均响应/10)) × 0.3
           + 成功率权重 × 0.2
           + 稳定性权重(1/(1+连续失败)) × 0.1

  插件分级：
  - Fast Tier (得分<30)：响应<2s 且超时率<10%，立即执行
  - Medium Tier (30-60)：响应2-5s，正常调度
  - Slow Tier (60-80)：响应5-10s，延迟执行或降低并发
  - Critical Tier：用户偏好高，保证执行

  并发控制：
  - 全局并发上限（AsyncMaxBackgroundWorkers）
  - 单插件并发限制（通过 pluginLocks）
  - 根据健康度动态分配 worker 槽位

  执行策略：
  1. 按 Critical > Fast > Medium > Slow 顺序提交
  2. 快速插件结果优先返回（渐进式）
  3. 慢速插件异步加载
  4. 高风险插件降级或跳过

  实施工作量： 3-4天

  ---
  三、分阶段实施计划

  阶段一：监控基础设施（第1-5天，P0）

  1.1 数据模型与数据库（1-2天）
  - 扩展 plugin_health_status 表添加熔断字段
  - 新建 plugin_performance_metrics 表
  - 新建 plugin_error_logs 表
  - 更新数据库迁移

  1.2 指标收集服务（1-2天）
  - 创建 service/plugin_metrics_collector.go
  - 实现环形缓冲区 + 5分钟聚合
  - 计算 p50/p95/p99 百分位数

  1.3 集成到搜索执行器（0.5天）
  - 修改 search_executor.go 包装插件调用
  - 注入指标收集逻辑

  1.4 后端API（0.5-1天）
  - GET /api/admin/plugin-metrics - 聚合指标
  - GET /api/admin/plugin-metrics/errors - 错误日志
  - GET /api/admin/plugin-metrics/realtime - 实时快照

  验收： 插件执行后指标正确写入数据库，API 返回正确数据

  ---
  阶段二：熔断与降级核心（第6-10天，P0）

  2.1 熔断器服务（2-3天）
  - 创建 service/plugin_circuit_breaker.go
  - 实现三态状态机（Closed/Open/HalfOpen）
  - 使用 sync.Map 防止并发竞争

  2.2 熔断阈值与转换（1天）
  - 实现状态转换逻辑
  - 配置阈值（连续失败5次、超时率80%等）
  - 动态冷却期（30秒-5分钟指数退避）

  2.3 降级策略集成（1天）
  - 在 search_executor.go 调用 ShouldAllowRequest
  - 返回降级 warning
  - 集成自适应超时计算器
  - 同步调用 RecordResult

  2.4 主动健康检查（1-2天）
  - 创建 service/plugin_health_checker.go
  - 使用 time.Ticker 调度
  - 动态检查频率（5分钟/30秒）
  - 在 main.go 启动后台 goroutine

  验收： 模拟插件故障，5次失败后自动熔断，30秒后恢复网络并自动恢复

  ---
  阶段三：负载均衡与可视化（第11-17天，P1-P2）

  3.1 智能优先级计算（1-2天）
  - 创建 service/plugin_priority_calculator.go
  - 实现动态优先级算法
  - 插件分级（Fast/Medium/Slow/Critical）

  3.2 负载均衡集成（1-2天）
  - 集成到 search_progressive.go
  - 按优先级排序插件
  - 动态分配并发资源

  3.3 前端类型定义（0.5天）
  - types/pluginMetrics.ts - 接口定义
  - api/pluginMetrics.ts - API 封装

  3.4 前端监控组件（2-3天）
  - PluginPerformanceChart.tsx - Recharts 图表
  - PluginMetricsTable.tsx - 性能对比表
  - PluginErrorLogDrawer.tsx - 错误日志抽屉
  - PluginPerformanceDashboard.tsx - 主面板

  3.5 Dashboard 集成（0.5-1天）
  - 修改 Admin.tsx 添加性能监控视图
  - 侧边栏添加导航
  - 实现自动刷新（30秒）

  3.6 数据清理任务（0.5天）
  - 定时任务（每天凌晨2点）
  - 删除30天前性能指标
  - 删除7天前错误日志

  验收： 管理后台访问性能监控页面，图表正确展示，支持时间筛选和下钻

  ---
  四、技术栈

  后端：
  - Go 1.25+ + Gin + GORM
  - sync.Map + sync.Mutex（并发安全）
  - time.Ticker（后台调度）
  - context.Context（超时控制）

  数据库：
  - MySQL 5.7+（主存储）
  - 可选：TimescaleDB/InfluxDB（高并发场景）

  前端：
  - React 18 + TypeScript
  - Recharts（图表）
  - shadcn/ui（UI组件）
  - Axios + 自定义 Hooks

  ---
  五、预期收益

  1. 系统稳定性提升至 99.5%+：熔断器自动隔离故障插件
  2. 首屏响应时间降至 1-2秒：快速插件优先返回
  3. 故障定位时间缩短 80%：实时监控Dashboard
  4. 系统吞吐量提升 40%：智能资源调度
  5. 故障自愈率达到 95%+：自动健康检查与恢复
  6. 迭代效率提升 3倍：数据驱动优化

  ---
  六、风险与缓解

  风险1：数据库写入压力
  - 缓解：内存缓冲 + 5分钟批量写入

  风险2：熔断误判
  - 缓解：保守阈值 + 30秒快速恢复

  风险3：并发竞争
  - 缓解：每插件独立锁 + 原子操作

  风险4：健康检查影响插件
  - 缓解：轻量级关键词 + 5秒超时

  风险5：前端性能
  - 缓解：30秒轮询 + 懒加载 + 分页

  ---
  总结

  整个方案基于现有架构渐进式增强，总工期
  17-19天，分三阶段独立交付。充分复用现有组件（PluginHealthService、adaptiveTimeoutCalculator、worker_pool），降低开
  发风险。监控先行奠定数据基础，熔断降级保障核心稳定性，负载均衡优化资源利用率。