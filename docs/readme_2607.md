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

[2026-07-06 11:27] feat(frontend-ui): 完成全站前端设计优化
  Body: 完成全站导航分流、表面层级、按钮层级、移动端压缩、认证与账号页微调、动效降级、免责声明和 404 收尾优化。同步补充前端优化计划文档、分页辅助逻辑、页面与组件测试，保证后台和公共页面视觉层级一致。
  Files:
    - docs/frontend-ui-optimization-development-plan.md
    - docs/frontend-ui-optimization-plan.md
    - frontend/e2e/test-helpers.ts
    - frontend/src/components/Navbar.tsx
    - frontend/src/components/__tests__/Navbar.test.tsx
    - frontend/src/components/account/AccountWorkspaceShell.tsx
    - frontend/src/components/account/accountDesign.ts
    - frontend/src/components/admin/ChannelPerformancePanel.tsx
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - frontend/src/components/admin/Sidebar.tsx
    - frontend/src/components/admin/__tests__/ChannelPerformancePanel.test.tsx
    - frontend/src/components/admin/__tests__/PluginPerformanceDashboard.test.tsx
    - frontend/src/components/admin/adminDesign.ts
    - frontend/src/components/admin/useAdminClientPagination.ts
    - frontend/src/components/auth/authEntryLayout.ts
    - frontend/src/components/home/FeatureCard.tsx
    - frontend/src/components/home/PlatformMarquee.tsx
    - frontend/src/components/home/__tests__/PlatformMarquee.test.tsx
    - frontend/src/components/home/__tests__/TrendingCategories.test.tsx
    - frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx
    - frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx
    - frontend/src/components/resource-detail/ResourceDetailMetaSection.tsx
    - frontend/src/components/search/SearchEmptyWorkbench.tsx
    - frontend/src/components/trending/HotToolbar.tsx
    - frontend/src/components/ui/__tests__/Button.test.tsx
    - frontend/src/components/ui/button.tsx
    - frontend/src/components/ui/card.tsx
    - frontend/src/components/ui/page-not-found.tsx
    - frontend/src/components/ui/tubelight-navbar.tsx
    - frontend/src/index.css
    - frontend/src/lib/accountPreferences.ts
    - frontend/src/pages/AccountPage.tsx
    - frontend/src/pages/Admin.tsx
    - frontend/src/pages/AdminLogin.tsx
    - frontend/src/pages/DisclaimerPage.tsx
    - frontend/src/pages/Home.tsx
    - frontend/src/pages/ResourceDetailPage.tsx
    - frontend/src/pages/SearchPage.tsx
    - frontend/src/pages/__tests__/AccountPage.test.tsx
    - frontend/src/pages/__tests__/Admin.test.tsx
    - frontend/src/pages/__tests__/AdminNavigation.test.tsx
    - frontend/src/pages/__tests__/AuthEntryPages.test.tsx
    - frontend/src/pages/__tests__/DisclaimerPage.test.tsx
    - frontend/src/pages/__tests__/Home.test.tsx
    - frontend/src/pages/__tests__/HotPage.test.tsx
    - frontend/src/routes/AppRoutes.tsx
    - frontend/src/routes/__tests__/AppRoutes.test.tsx
    - docs/readme_2607.md

[2026-07-09 13:49] docs(trellis): 更新项目代理说明与本地目录忽略
  Body: 将 AGENTS 开发准则替换为 Trellis 管理说明，指向 .trellis 工作流、规范、任务和技能目录。同步忽略 .agents 与 .trellis 本地目录，避免代理运行资料进入版本控制。
  Files:
    - .gitignore
    - AGENTS.md
    - docs/readme_2607.md

[2026-07-09 14:53] fix(admin-ui): 修复后台详情抽屉默认占位交互
  Body: 将后台详情抽屉改为按需浮层渲染，移除页面右侧默认占位列，并改为通过行内详情按钮打开。同步调整公告编辑、插件管理、频道管理和性能监控面板的详情交互与测试，避免误触整行打开详情。
  Files:
    - frontend/src/components/admin/AdminDataTable.tsx
    - frontend/src/components/admin/AdminWorkspacePageFrame.tsx
    - frontend/src/components/admin/AnnouncementManagement.tsx
    - frontend/src/components/admin/ChannelManagementView.tsx
    - frontend/src/components/admin/ChannelPerformancePanel.tsx
    - frontend/src/components/admin/PluginManagementView.tsx
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - frontend/src/components/admin/__tests__/AdminWorkspacePageFrame.test.tsx
    - frontend/src/components/admin/__tests__/AnnouncementManagement.test.tsx
    - frontend/src/components/admin/__tests__/ChannelManagementView.test.tsx
    - frontend/src/components/admin/__tests__/ChannelPerformancePanel.test.tsx
    - frontend/src/components/admin/__tests__/PluginManagementView.test.tsx
    - frontend/src/components/admin/__tests__/PluginPerformanceDashboard.test.tsx
    - frontend/src/hooks/__tests__/useChannelMetricsController.test.tsx
    - frontend/src/hooks/useChannelMetricsController.ts
    - frontend/src/hooks/usePluginMetricsController.ts
    - docs/readme_2607.md

[2026-07-09 15:53] refactor(admin-ui): 统一插件管理与后台表格布局
  Body: 将插件管理列表迁移到统一后台数据表格，移除分类和能力筛选，保留状态、标签和搜索筛选。同步调整用户表、插件和频道性能表列宽、行测试标识与相关测试，让后台列表布局更一致。
  Files:
    - frontend/src/components/admin/AdminDataTable.tsx
    - frontend/src/components/admin/AppleUserTable.tsx
    - frontend/src/components/admin/ChannelPerformancePanel.tsx
    - frontend/src/components/admin/PluginManagementView.tsx
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - frontend/src/components/admin/__tests__/AppleUserTable.test.tsx
    - frontend/src/components/admin/__tests__/PluginManagementView.test.tsx
    - docs/readme_2607.md

[2026-07-09 15:58] refactor(admin-ui): 统一后台筛选工具栏样式
  Body: 新增后台筛选工具栏和字段容器，支持搜索、状态、下拉和标签选择的 toolbar 变体。将公告、频道、插件和性能监控页面筛选区改为统一紧凑布局，减少重复样式并保持筛选行为不变。
  Files:
    - frontend/src/components/admin/AdminSearchInput.tsx
    - frontend/src/components/admin/AdminSelectField.tsx
    - frontend/src/components/admin/AdminStatusFilter.tsx
    - frontend/src/components/admin/AdminTagMultiSelect.tsx
    - frontend/src/components/admin/AdminWorkspacePageFrame.tsx
    - frontend/src/components/admin/AnnouncementManagement.tsx
    - frontend/src/components/admin/ChannelManagementView.tsx
    - frontend/src/components/admin/ChannelPerformancePanel.tsx
    - frontend/src/components/admin/PluginManagementView.tsx
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - docs/readme_2607.md

[2026-07-10 14:08] feat(sidhub): 新增详情增强降级与指标观测
  Body: 新增 SeedHub 详情页并发解析、单详情超时、总预算和域名策略配置，并在详情增强失败时返回可打开的详情页 fallback。同步扩展插件指标采集与后台观测展示，记录后台处理中、部分成功、详情成功和 fallback 计数。
  Files:
    - backend/model/plugin_metrics.go
    - backend/plugin/sidhub/sidhub.go
    - backend/plugin/sidhub/sidhub_test.go
    - backend/service/plugin_health_service_test.go
    - backend/service/plugin_metrics_collector.go
    - backend/service/plugin_metrics_collector_test.go
    - backend/service/search_executor.go
    - backend/service/search_executor_test.go
    - docs/sidhub-timeout-development-plan.md
    - docs/sidhub-timeout-optimization-plan.md
    - frontend/src/components/admin/PluginManageDialog.tsx
    - frontend/src/components/admin/PluginManagementView.tsx
    - frontend/src/components/admin/PluginPerformanceDashboard.tsx
    - frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
    - frontend/src/components/admin/__tests__/PluginManagementView.test.tsx
    - frontend/src/components/admin/__tests__/PluginPerformanceDashboard.test.tsx
    - frontend/src/hooks/usePluginMetricsController.ts
    - frontend/src/types/pluginMetrics.ts
    - docs/readme_2607.md

[2026-07-10 20:30] feat(resource-detail): 新增资源详情页柔和界面
  Body: 将资源详情页从深色玻璃风格调整为柔和浅色卡片布局，简化英雄区、操作面板和空状态样式。同步补充改版计划与开发记录文档，并更新资源详情页测试。
  Files:
    - docs/resource-detail-page-soft-ui-redesign-development-plan.md
    - docs/resource-detail-page-soft-ui-redesign-plan.md
    - frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx
    - frontend/src/components/resource-detail/ResourceDetailEmptyState.tsx
    - frontend/src/components/resource-detail/ResourceDetailHero.tsx
    - frontend/src/index.css
    - frontend/src/pages/ResourceDetailPage.tsx
    - frontend/src/pages/__tests__/ResourceDetailPage.test.tsx
    - docs/readme_2607.md

[2026-07-10 20:49] fix(scan-transfer): 区分扫码刷新超时并轮换会话
  Body: 区分扫码刷新服务端超时与客户端取消场景，返回更明确的超时错误并让前端展示统一错误文案。同步定期重建 SeedHub Cloudflare 会话，降低扫码刷新和资源解析卡住风险。
  Files:
    - backend/api/scan_transfer_handler.go
    - backend/api/scan_transfer_handler_test.go
    - backend/plugin/sidhub/sidhub.go
    - backend/plugin/sidhub/sidhub_test.go
    - frontend/src/components/PasswordModal.tsx
    - frontend/src/components/__tests__/PasswordModal.test.tsx
    - frontend/src/lib/__tests__/api.test.ts
    - frontend/src/lib/api.ts
    - docs/readme_2607.md

[2026-07-10 21:47] fix(resource-detail): 移除详情页主链接复制入口
  Body: 移除资源详情页操作面板中的主链接复制按钮，只保留主资源打开和提取码复制能力。同步更新资源详情页测试，确保扫码转存等场景不再暴露主链接复制入口。
  Files:
    - frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx
    - frontend/src/pages/__tests__/ResourceDetailPage.test.tsx
    - docs/readme_2607.md

[2026-07-10 23:26] fix(search-results): 隐藏普通搜索回退提示
  Body: 移除搜索结果工具栏中的普通搜索回退状态展示，避免普通用户看到内部搜索降级提示。同步更新搜索结果测试，覆盖 fallback 状态下不展示回退提示的行为。
  Files:
    - frontend/src/components/SearchResults.tsx
    - frontend/src/components/__tests__/SearchResults.test.tsx
    - frontend/src/components/home/SearchResultsToolbar.tsx
    - frontend/src/components/search-results/SearchResultsHeader.tsx
    - docs/readme_2607.md

[2026-07-11 22:01] fix(resource-id): 生成独立公开资源 ID 并隐藏内部详情字段
  Body: 通过独立密钥为资源对象生成不可反推的公开 ID，并移除公开响应中的内部详情 URL 与插件私有标识。同步更新配置示例、生产密钥脚本与相关前后端测试，避免公开资源链接泄露内部数据。
  Footer: 破坏性变更: 资源详情响应移除了 URL、message_id、unique_id 等内部字段，且旧公开资源 URL 在资源密钥轮换后会失效。Migration: 生产环境必须配置 RESOURCE_PUBLIC_ID_SECRET，并确保其与 JWT 密钥独立且稳定。
  Files:
    - .env.example
    - README.md
    - backend/api/filter.go
    - backend/config/config.go
    - backend/config/config_auth.go
    - backend/config/config_test.go
    - backend/model/response.go
    - backend/service/search_response_builder.go
    - backend/service/search_response_builder_test.go
    - frontend/src/components/__tests__/SearchResults.test.tsx
    - frontend/src/lib/__tests__/resourceSnapshot.test.ts
    - frontend/src/lib/resourceSnapshot.ts
    - frontend/src/pages/__tests__/ResourceDetailPage.test.tsx
    - frontend/src/stores/__tests__/searchStore.test.ts
    - frontend/src/types/resource.ts
    - frontend/src/utils/__tests__/resourceDisplay.test.ts
    - frontend/src/utils/__tests__/searchResultSorter.test.ts
    - frontend/src/utils/resourceDisplay.ts
    - frontend/src/utils/searchResultSorter.ts
    - scripts/build.sh
    - scripts/gen-production-secrets.sh
    - docs/readme_2607.md
