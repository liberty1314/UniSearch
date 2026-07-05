- [2026-07-04 10:59] feat(search): 实现搜索插件自适应超时调整与降级机制
  - Body: 引入自适应超时感知和降级策略，根据插件历史健康状况与平均耗时动态调整超时时间，并补充监控日志、部署指南和效果验证脚本，以优化并发搜索场景下的性能与稳定性。
  - Files:
    - IMPLEMENTATION_SUMMARY.md
    - QUICK_REFERENCE.md
    - backend/plugin/baseasyncplugin.go
    - backend/service/search_adaptive_timeout.go
    - backend/service/search_executor.go
    - backend/service/search_progressive.go
    - docs/deployment-optimization-guide.md
    - docs/plugin-timeout-solution.md
    - docs/readme_2607.md
    - scripts/verify-optimization.sh
[2026-07-04 20:59] feat(plugin-health): 完善插件健康服务的错误处理和日志记录
  Body: 更新插件健康服务，实现更稳健的错误处理并记录关键操作。
  Files:
    - backend/model/plugin_health_status.go
    - backend/service/plugin_health_service.go
    - backend/service/plugin_health_service_test.go

[2026-07-04 21:51] feat(plugin-metrics): 新增插件性能指标采集与查询接口
  Body: 新增插件性能指标采集器、持久化模型和后台查询接口，并将指标记录接入搜索执行流程。同步补充处理器与采集器测试，以及插件监控与优化方案文档。
  Files:
    - .env.example
    - backend/api/plugin_metrics_handler.go
    - backend/api/plugin_metrics_handler_test.go
    - backend/api/router_admin.go
    - backend/api/router_deps.go
    - backend/cmd/bootstrap/app.go
    - backend/cmd/bootstrap/server.go
    - backend/database/migration.go
    - backend/model/plugin_health_status.go
    - backend/model/plugin_metrics.go
    - backend/service/plugin_health_service.go
    - backend/service/plugin_metrics_collector.go
    - backend/service/plugin_metrics_collector_test.go
    - backend/service/search_executor.go
    - backend/service/search_executor_test.go
    - backend/service/search_progressive.go
    - backend/service/search_service.go
    - docs/deployment-optimization-guide.md
    - docs/plugin-development-plan.md
    - docs/plugin-timeout-solution.md
    - docs/plugin.md
    - docs/readme_2607.md

[2026-07-04 22:11] feat(plugin-circuit): 新增插件熔断降级与健康探测
  Body: 新增插件熔断器和主动健康检查器，将熔断准入、超时降级和恢复探测接入搜索执行流程。同步补充熔断状态转换、跳过故障插件和探测失败场景测试，并更新插件开发计划。
  Files:
    - backend/cmd/bootstrap/app.go
    - backend/cmd/bootstrap/server.go
    - backend/service/plugin_circuit_breaker.go
    - backend/service/plugin_circuit_breaker_test.go
    - backend/service/plugin_health_checker.go
    - backend/service/search_executor.go
    - backend/service/search_executor_test.go
    - backend/service/search_progressive.go
    - backend/service/search_service.go
    - docs/plugin-development-plan.md
    - docs/readme_2607.md

[2026-07-04 22:26] feat(plugin-priority): 新增插件智能优先级调度
  Body: 新增插件优先级计算器，基于健康状态、响应时间、成功率和用户显式选择对插件分级排序。将排序与延迟调度接入渐进式搜索，让快速和关键插件优先返回，并补充优先级与渐进式调度测试。
  Files:
    - backend/service/plugin_priority_calculator.go
    - backend/service/plugin_priority_calculator_test.go
    - backend/service/search_progressive.go
    - docs/plugin-development-plan.md
    - docs/readme_2607.md

[2026-07-04 22:56] feat(plugin-observability): 新增插件性能监控后台视图
  Body: 新增插件性能监控页面、指标数据 Hook、前端类型和后台导航入口，并透出插件熔断状态快照。同步补充组件、导航、页面与健康快照测试，并更新插件开发计划。
  Files:
    - backend/model/plugin_catalog.go
    - backend/service/plugin_health_service.go
    - backend/service/plugin_health_service_test.go
    - backend/service/search_executor_test.go
    - docs/plugin-development-plan.md
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - frontend/src/components/admin/Sidebar.tsx
    - frontend/src/components/admin/__tests__/PluginPerformanceDashboard.test.tsx
    - frontend/src/hooks/__tests__/useAdminPageController.test.tsx
    - frontend/src/hooks/usePluginMetricsController.ts
    - frontend/src/lib/adminRoute.ts
    - frontend/src/pages/Admin.tsx
    - frontend/src/pages/__tests__/Admin.test.tsx
    - frontend/src/pages/__tests__/AdminNavigation.test.tsx
    - frontend/src/types/plugin.ts
    - frontend/src/types/pluginMetrics.ts
    - docs/readme_2607.md

[2026-07-05 00:45] feat(plugin-metrics): 新增插件指标清理与监控兜底
  Body: 新增插件指标清理器，定时删除过期性能指标和错误日志，并接入服务启动流程。优化性能监控页在访问令牌恢复和实时窗口为空时的展示兜底，并补充清理与监控测试。
  Files:
    - backend/cmd/bootstrap/app.go
    - backend/cmd/bootstrap/server.go
    - backend/service/plugin_metrics_cleaner.go
    - backend/service/plugin_metrics_cleaner_test.go
    - docs/plugin-development-plan.md
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - frontend/src/components/admin/__tests__/PluginPerformanceDashboard.test.tsx
    - frontend/src/hooks/usePluginMetricsController.ts
    - docs/readme_2607.md

[2026-07-05 01:23] fix(plugin-observability): 修复插件监控表格列宽溢出
  Body: 调整后台数据表格管理网格的横向滚动与最小宽度能力，并压缩插件性能监控表格指标列展示。避免状态、响应、质量和熔断信息在桌面表格中换行挤压或溢出。
  Files:
    - frontend/src/components/admin/AdminDataTable.tsx
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - docs/readme_2607.md

[2026-07-05 18:03] feat(channel-observability): 新增频道性能观测与管理视图
  Body: 新增 TG 频道性能指标采集、聚合模型、后台查询接口和清理复用逻辑，并将频道指标记录接入搜索执行流程。同步新增频道性能面板、观测导航、数据 Hook、类型定义、测试覆盖和实施文档。
  Files:
    - backend/api/channel_metrics_handler.go
    - backend/api/channel_metrics_handler_test.go
    - backend/api/router_admin.go
    - backend/api/router_deps.go
    - backend/cmd/bootstrap/app.go
    - backend/cmd/bootstrap/server.go
    - backend/database/migration.go
    - backend/model/tg_channel_metrics.go
    - backend/service/plugin_metrics_cleaner.go
    - backend/service/plugin_metrics_cleaner_test.go
    - backend/service/search_executor.go
    - backend/service/search_executor_test.go
    - backend/service/search_progressive.go
    - backend/service/search_service.go
    - backend/service/tg_channel_health_service.go
    - backend/service/tg_channel_metrics_collector.go
    - backend/service/tg_channel_metrics_collector_test.go
    - docs/channel-observability-development-plan.md
    - docs/channel-observability-plan.md
    - frontend/src/components/admin/ChannelPerformancePanel.tsx
    - frontend/src/components/admin/PerformanceObservabilityView.tsx
    - frontend/src/components/admin/PerformanceSectionNav.tsx
    - frontend/src/components/admin/PluginPerformancePanel.tsx
    - frontend/src/components/admin/__tests__/ChannelPerformancePanel.test.tsx
    - frontend/src/components/admin/__tests__/PerformanceObservabilityView.test.tsx
    - frontend/src/hooks/__tests__/useChannelMetricsController.test.tsx
    - frontend/src/hooks/useChannelMetricsController.ts
    - frontend/src/pages/Admin.tsx
    - frontend/src/types/channelMetrics.ts
    - docs/readme_2607.md
