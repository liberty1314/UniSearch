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

[2026-07-12 09:31] fix(plugins): 提升网盘插件搜索稳定性
  Body: 混合盘改为只调用当前稳定主 API，串行分页请求并在部分页面失败时保留已有结果。盘友圈增强 Next.js 脚本和 Action ID 提取逻辑，减少页面结构变化导致的搜索失败。
  Files:
    - backend/plugin/hunhepan/hunhepan.go
    - backend/plugin/hunhepan/hunhepan_test.go
    - backend/plugin/panyq/panyq.go
    - backend/plugin/panyq/panyq_test.go
    - docs/readme_2607.md

[2026-07-12 09:33] fix(admin-ui): 修正插件与频道统计口径
  Body: 将插件和频道管理页统计卡片统一为总数、启用、停用和异常，并让异常仅统计启用项。同步更新后台管理测试，覆盖停用项不计入异常统计的展示行为。
  Files:
    - frontend/src/components/admin/ChannelManagementView.tsx
    - frontend/src/components/admin/PluginManagementView.tsx
    - frontend/src/components/admin/__tests__/ChannelManagementView.test.tsx
    - frontend/src/components/admin/__tests__/PluginManagementView.test.tsx
    - docs/readme_2607.md

[2026-07-14 19:59] feat(search): 完成 SeedHub 搜索质量治理与按需解析
  Body: 修正 SeedHub 时间与解析状态，使用加密 token 提供点击按需解析，并在首屏应用可配置来源配额。补充限流、并发、缓存、指标、前端交互以及确定性和真实后端验收，确保响应不暴露来源地址。
  Footer: 破坏性变更: SeedHub deferred 候选不再返回来源地址，改为 `link_id` 与 `resolve_token`。
  Migration: 客户端需在用户点击时调用 `/api/resources/resolve` 获取真实目标；来源配额需在前后端联合发布后由管理员启用。
  Files:
    - backend/api/rate_limiter.go
    - backend/api/resource_resolve_handler.go
    - backend/api/resource_resolve_handler_test.go
    - backend/api/resource_resolve_metrics_handler.go
    - backend/api/router.go
    - backend/api/router_admin.go
    - backend/api/scan_transfer_handler.go
    - backend/api/scan_transfer_handler_test.go
    - backend/api/system_settings_handler.go
    - backend/api/system_settings_handler_test.go
    - backend/model/response.go
    - backend/model/system_settings.go
    - backend/plugin/sidhub/sidhub.go
    - backend/plugin/sidhub/sidhub_test.go
    - backend/service/resource_resolve_metrics.go
    - backend/service/resource_resolve_metrics_test.go
    - backend/service/resource_resolve_token.go
    - backend/service/resource_resolve_token_test.go
    - backend/service/search_response_builder.go
    - backend/service/search_response_builder_test.go
    - backend/service/system_settings_service.go
    - backend/service/system_settings_service_test.go
    - backend/util/cache/cache_key.go
    - backend/util/cache/cache_key_test.go
    - docs/readme_2607.md
    - docs/seedhub-search-quality-development-plan.md
    - frontend/e2e/real-backend.spec.ts
    - frontend/e2e/search-quality.spec.ts
    - frontend/src/components/SearchResults.tsx
    - frontend/src/components/__tests__/SearchResults.test.tsx
    - frontend/src/components/admin/SystemSettingsView.tsx
    - frontend/src/components/admin/__tests__/SystemSettingsView.test.tsx
    - frontend/src/components/admin/system-settings/SearchExperienceSettingsPanel.tsx
    - frontend/src/components/home/SearchResultGridCard.tsx
    - frontend/src/components/home/SearchResultListItem.tsx
    - frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx
    - frontend/src/components/search-results/SearchResultsList.tsx
    - frontend/src/components/search-results/searchResultsPresentation.test.ts
    - frontend/src/components/search-results/searchResultsPresentation.ts
    - frontend/src/components/search-results/useSearchResultsPresentation.ts
    - frontend/src/hooks/__tests__/useSystemSettingsController.test.tsx
    - frontend/src/hooks/useSystemSettingsController.ts
    - frontend/src/lib/searchSourceDiversity.ts
    - frontend/src/pages/ResourceDetailPage.tsx
    - frontend/src/pages/__tests__/ResourceDetailPage.test.tsx
    - frontend/src/services/__tests__/searchService.test.ts
    - frontend/src/services/__tests__/systemSettingsService.test.ts
    - frontend/src/services/searchService.ts
    - frontend/src/services/systemSettingsService.ts
    - frontend/src/stores/__tests__/searchStore.test.ts
    - frontend/src/stores/searchStore.ts
    - frontend/src/types/resource.ts
    - frontend/src/utils/__tests__/resourceDisplay.test.ts
    - frontend/src/utils/__tests__/searchResultSorter.test.ts
    - frontend/src/utils/resourceDisplay.ts
    - frontend/src/utils/resourceTime.ts
    - frontend/src/utils/searchResultSorter.ts

- [2026-07-15 09:50] feat(sidhub): 完善每类资源限量与同名去重
  - Body: 新增 SeedHub 每类资源数量配置、同名最新候选选择和缓存隔离，并在插件详情窗口提供统一校验。
  - Footer: 破坏性变更: SeedHub 同名资源不再返回多个备用候选，且每种资源类型默认仅保留前 10 条。
  - Footer: Migration: 如需更多候选，请在插件详情窗口调整每类资源获取数量并重新搜索。
  - Files:
    - backend/api/plugin_runtime_config_handler_test.go
    - backend/go.mod
    - backend/model/plugin_manifest.go
    - backend/plugin/sidhub/sidhub.go
    - backend/plugin/sidhub/sidhub_test.go
    - backend/service/plugin_runtime_config_service.go
    - backend/service/plugin_runtime_config_service_test.go
    - docs/seedhub-per-type-limit-and-latest-dedup-development-plan.md
    - frontend/src/components/admin/PluginManageDialog.tsx
    - frontend/src/components/admin/PluginManagementView.tsx
    - frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
    - frontend/src/components/admin/__tests__/PluginManagementView.test.tsx
    - frontend/src/components/admin/pluginRuntimeConfig.test.ts
    - frontend/src/components/admin/pluginRuntimeConfig.ts
    - frontend/src/hooks/usePluginManageController.ts
    - frontend/src/types/plugin.ts

- [2026-07-16 16:52] fix(search): 修复同匹配层级结果未按可信时间优先排序
  - Body: 调整搜索结果排序顺序，在匹配等级相同时先比较可信时间，再以 SeedHub 可操作状态作为兜底；补充新旧 SeedHub 结果的回归用例。
  - Files:
    - docs/readme_2607.md
    - frontend/src/utils/__tests__/searchResultSorter.test.ts
    - frontend/src/utils/searchResultSorter.ts

[2026-07-17 16:49] feat(home): 优化首页卡片即时悬浮动画
  Body: 为首页功能卡片、使用建议和热门分类入口抽取统一悬浮动画配置，将入场动画与悬浮层分离，减少 hover 延迟并保持动效一致。同步更新首页相关测试，并补充 AGENTS 开发准则与 openspec 本地目录忽略。
  Files:
    - .gitignore
    - AGENTS.md
    - frontend/src/components/home/FeatureCard.tsx
    - frontend/src/components/home/TrendingCategories.tsx
    - frontend/src/components/home/__tests__/TrendingCategories.test.tsx
    - frontend/src/components/home/homeCardHoverMotion.ts
    - frontend/src/pages/Home.tsx
    - frontend/src/pages/__tests__/Home.test.tsx
    - docs/readme_2607.md

[2026-07-17 19:03] feat(home): 优化热榜控制台布局与状态展示
  Body: 将热榜筛选项统一收拢到单层控制轨道，补充当前榜单模式、时间维度和内容分类的口径摘要，并优化移动端调整入口与重置按钮。同步增加热榜控制台和分区摘要的回归测试。
  Files:
    - frontend/src/components/trending/HotToolbar.tsx
    - frontend/src/components/trending/__tests__/HotSectionSummary.test.tsx
    - frontend/src/components/trending/__tests__/HotToolbar.test.tsx
    - docs/readme_2607.md

- [2026-07-23 16:41] docs(docs): 清理已过时的开发计划与设计规格文档
  - Body: 清理 docs 目录中已完成或过期的历史开发计划与设计规格文件，保持文档目录整洁。
  - Files:
    - docs/channel-observability-development-plan.md
    - docs/channel-observability-plan.md
    - docs/frontend-ui-optimization-development-plan.md
    - docs/frontend-ui-optimization-plan.md
    - docs/plugin-development-plan.md
    - docs/plugin.md
    - docs/readme_2607.md
    - docs/resource-detail-page-soft-ui-redesign-development-plan.md
    - docs/resource-detail-page-soft-ui-redesign-plan.md
    - docs/seedhub-per-type-limit-and-latest-dedup-development-plan.md
    - docs/seedhub-search-quality-development-plan.md
    - docs/sidhub-timeout-development-plan.md
    - docs/sidhub-timeout-optimization-plan.md
    - docs/superpowers/specs/2026-07-18-search-prism-design.md
    - docs/superpowers/specs/2026-07-19-search-transition-continuity-design.md

- [2026-07-23 16:42] feat(auth): 增加用户注册功能的开关校验与控制
  - Body: 在 AuthService 注册入口注入 SystemSettingsService，校验系统设置中的注册开关与用户认证开关状态，若关闭则禁止注册并返回 403 错误。
  - Files:
    - backend/api/controller/auth_controller.go
    - backend/cmd/bootstrap/app.go
    - backend/service/auth_errors.go
    - backend/service/auth_service.go
    - docs/readme_2607.md

- [2026-07-25 01:07] feat(auth): 新增注册防刷多层防护与 IP 自动封禁能力
  - Body: 针对生产环境恶意批量注册，重构限流为纯 IP 维度并支持 Redis 分布式计数，新增 IP 自动封禁与后台管理、人机验证（Turnstile）、注册总量熔断与可观测性；配套系统设置开关、配置项与前端管理界面，均可通过配置或后台开关快速回退。
  - Footer:
    - 破坏性变更: 注册限流 key 由 IP+username 改为纯 IP，限流计数语义变化；新增 banned_ip 表需执行迁移
    - Migration: 启动时自动执行 AutoMigrate 创建 banned_ip 表；新增 Turnstile/限流/熔断相关环境变量参见 .env.example
  - Files:
    - .Codex/context-summary-用户管理跨页批量操作.md
    - .env.example
    - backend/api/banned_ip_handler.go
    - backend/api/controller/auth_controller.go
    - backend/api/rate_limiter.go
    - backend/api/rate_limiter_store.go
    - backend/api/rate_limiter_store_test.go
    - backend/api/rate_limiter_test.go
    - backend/api/router.go
    - backend/api/router_admin.go
    - backend/api/router_auth.go
    - backend/api/router_deps.go
    - backend/api/signup_circuit_breaker.go
    - backend/api/signup_circuit_breaker_test.go
    - backend/api/signup_observability.go
    - backend/api/system_settings_handler.go
    - backend/cmd/bootstrap/app.go
    - backend/config/config.go
    - backend/config/config_auth.go
    - backend/config/config_env.go
    - backend/database/migration.go
    - backend/model/banned_ip.go
    - backend/model/system_settings.go
    - backend/service/auth_service.go
    - backend/service/banned_ip_service.go
    - backend/service/banned_ip_service_test.go
    - backend/service/captcha_service.go
    - backend/service/captcha_service_test.go
    - backend/service/system_settings_service.go
    - backend/util/cache/redis_cache.go
    - backend/util/cache/redis_cache_test.go
    - backend/util/cache/redis_ratelimit.go
    - docs/design_register_anti_abuse.md
    - docs/plan_register_anti_abuse.md
    - frontend/src/components/admin/BanIPDialog.tsx
    - frontend/src/components/admin/BannedIPView.tsx
    - frontend/src/components/admin/Sidebar.tsx
    - frontend/src/components/admin/SystemSettingsView.tsx
    - frontend/src/components/admin/system-settings/AccountAccessSettingsPanel.tsx
    - frontend/src/components/auth/TurnstileWidget.tsx
    - frontend/src/hooks/useSystemSettingsController.ts
    - frontend/src/lib/adminRoute.ts
    - frontend/src/pages/Admin.tsx
    - frontend/src/pages/RegisterPage.tsx
    - frontend/src/services/authService.ts
    - frontend/src/services/bannedIPService.ts
    - frontend/src/services/systemSettingsService.ts
    - frontend/src/types/auth.ts
    - frontend/src/types/bannedIP.ts
    - docs/readme_2607.md

- [2026-07-25 01:07] feat(auth): 新增注册防滥用能力（限流/验证码/封禁IP/熔断）
  - Body: 为注册流程新增 IP 限流、Turnstile 人机验证、封禁 IP 管理与注册熔断保护，配套可观测性统计、系统设置项与后台管理界面，防止批量恶意注册。
  - Footer: 破坏性变更: 新增注册相关环境变量与系统设置项；Migration: 参照 .env.example 补充配置并执行数据库迁移创建 banned_ip 表
  - Files:
    - .Codex/context-summary-用户管理跨页批量操作.md
    - .env.example
    - backend/api/banned_ip_handler.go
    - backend/api/controller/auth_controller.go
    - backend/api/rate_limiter.go
    - backend/api/rate_limiter_store.go
    - backend/api/rate_limiter_store_test.go
    - backend/api/rate_limiter_test.go
    - backend/api/router.go
    - backend/api/router_admin.go
    - backend/api/router_auth.go
    - backend/api/router_deps.go
    - backend/api/signup_circuit_breaker.go
    - backend/api/signup_circuit_breaker_test.go
    - backend/api/signup_observability.go
    - backend/api/system_settings_handler.go
    - backend/cmd/bootstrap/app.go
    - backend/config/config.go
    - backend/config/config_auth.go
    - backend/config/config_env.go
    - backend/database/migration.go
    - backend/model/banned_ip.go
    - backend/model/system_settings.go
    - backend/service/auth_service.go
    - backend/service/banned_ip_service.go
    - backend/service/banned_ip_service_test.go
    - backend/service/captcha_service.go
    - backend/service/captcha_service_test.go
    - backend/service/system_settings_service.go
    - backend/util/cache/redis_cache.go
    - backend/util/cache/redis_cache_test.go
    - backend/util/cache/redis_ratelimit.go
    - docs/design_register_anti_abuse.md
    - docs/plan_register_anti_abuse.md
    - frontend/src/components/admin/BanIPDialog.tsx
    - frontend/src/components/admin/BannedIPView.tsx
    - frontend/src/components/admin/Sidebar.tsx
    - frontend/src/components/admin/SystemSettingsView.tsx
    - frontend/src/components/admin/system-settings/AccountAccessSettingsPanel.tsx
    - frontend/src/components/auth/TurnstileWidget.tsx
    - frontend/src/hooks/useSystemSettingsController.ts
    - frontend/src/lib/adminRoute.ts
    - frontend/src/pages/Admin.tsx
    - frontend/src/pages/RegisterPage.tsx
    - frontend/src/services/authService.ts
    - frontend/src/services/bannedIPService.ts
    - frontend/src/services/systemSettingsService.ts
    - frontend/src/types/auth.ts
    - frontend/src/types/bannedIP.ts

- [2026-07-25 09:56] test(auth): 更新注册防滥用相关测试用例
  - Body: 为系统设置控制器测试补充注册自动封禁与验证码默认值 Mock，并同步注册接口调用签名新增的验证码令牌参数断言。
  - Files:
    - frontend/src/hooks/__tests__/useSystemSettingsController.test.tsx
    - frontend/src/pages/__tests__/AuthEntryPages.test.tsx
    - docs/readme_2607.md

- [2026-07-25 10:27] feat(bootstrap): 应用启动时自动执行数据库结构迁移
  - Body: 在 bootstrap 启动流程接入 database.AutoMigrate，应用启动即自动建表，避免生产部署后遗漏运行独立迁移命令导致 banned_ips 等新表缺失。迁移为幂等非破坏性操作，破坏性清理仍保留在独立迁移命令中。
  - Files:
    - backend/cmd/bootstrap/app.go
    - docs/readme_2607.md

- [2026-07-25 18:01] feat(auth): 迁移 Refresh Token 至 HttpOnly Cookie 并增加登录锁定防护
  - Body: 前端将刷新令牌移出 localStorage 投递至 HttpOnly Cookie 存储，后端补充 Login Lockout 暴击与登录锁定防护机制，升级 Token 撤销与失效状态校验。
  - Footer:
    - 破坏性变更: Refresh Token 接口不再通过 JSON Body 返回 refresh_token，改由 HttpOnly Cookie 自动管理。
    - Migration: 客户端需配合升级，不再从本地存储或响应体读写 Refresh Token。
  - Files:
    - .env.example
    - backend/api/account_auth_flow_test.go
    - backend/api/admin_routes_test.go
    - backend/api/auth_handler.go
    - backend/api/controller/auth_controller.go
    - backend/api/handler.go
    - backend/api/login_lockout.go
    - backend/api/login_lockout_test.go
    - backend/api/middleware.go
    - backend/api/rate_limiter.go
    - backend/api/rate_limiter_store.go
    - backend/api/rate_limiter_test.go
    - backend/api/refresh_token_handler.go
    - backend/api/router.go
    - backend/api/router_deps.go
    - backend/api/token_invalidation_test.go
    - backend/api/token_state.go
    - backend/api/user_handler.go
    - backend/cmd/bootstrap/app.go
    - backend/config/config.go
    - backend/config/config_auth.go
    - backend/config/config_env.go
    - backend/model/user.go
    - backend/service/auth_service.go
    - backend/service/auth_service_test.go
    - backend/service/password_policy.go
    - backend/service/token_revocation.go
    - backend/service/user_service.go
    - backend/util/jwt.go
    - backend/util/refresh_cookie.go
    - docs/readme_2607.md
    - frontend/src/components/MobileMenu.tsx
    - frontend/src/components/Navbar.tsx
    - frontend/src/components/__tests__/AnnouncementProvider.test.tsx
    - frontend/src/components/__tests__/MobileMenu.test.tsx
    - frontend/src/components/__tests__/Navbar.test.tsx
    - frontend/src/components/__tests__/SearchResults.test.tsx
    - frontend/src/components/admin/__tests__/ChannelPerformancePanel.test.tsx
    - frontend/src/components/admin/__tests__/PluginPerformanceDashboard.test.tsx
    - frontend/src/hooks/__tests__/useAutoRefreshToken.test.tsx
    - frontend/src/hooks/__tests__/useChannelMetricsController.test.tsx
    - frontend/src/hooks/useAutoRefreshToken.ts
    - frontend/src/hooks/useChannelMetricsController.ts
    - frontend/src/hooks/usePluginMetricsController.ts
    - frontend/src/lib/__tests__/authRefreshManager.test.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/authRefreshManager.ts
    - frontend/src/pages/Admin.tsx
    - frontend/src/pages/AdminLogin.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/pages/RegisterPage.tsx
    - frontend/src/pages/__tests__/AccountPage.test.tsx
    - frontend/src/pages/__tests__/AdminNavigation.test.tsx
    - frontend/src/pages/__tests__/AuthEntryPages.test.tsx
    - frontend/src/services/authService.ts
    - frontend/src/stores/__tests__/authStore.test.ts
    - frontend/src/stores/__tests__/searchAccessStore.test.ts
    - frontend/src/stores/authStore.ts
    - frontend/src/stores/searchAccessStore.ts

- [2026-07-25 21:54] refactor(auth): 抽取前端登录表单 Hook 并完善 JWT 解析逻辑
  - Body: 抽离 useLoginForm 通用 Hook 统一普通用户与管理员登录表单的状态管理与提交逻辑，新增 jwt 工具模块实现客户端解析与验证，并重构相关测试。
  - Files:
    - docs/readme_2607.md
    - frontend/src/hooks/useAutoRefreshToken.ts
    - frontend/src/hooks/useLoginForm.ts
    - frontend/src/lib/jwt.ts
    - frontend/src/pages/AdminLogin.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/pages/__tests__/AuthEntryPages.test.tsx

- [2026-07-26 09:45] fix(auth): 强化身份认证安全策略与重放检测机制
  - Body: 优化登录侧信道防护与密码长度校验，增加刷新令牌重放检测及全量吊销机制，同时完善安全响应头与防刷中间件。
  - Files:
    - .env.example
    - backend/api/account_auth_flow_test.go
    - backend/api/login_lockout.go
    - backend/api/login_lockout_test.go
    - backend/api/middleware.go
    - backend/api/rate_limiter.go
    - backend/api/refresh_token_handler.go
    - backend/api/router.go
    - backend/api/router_auth.go
    - backend/service/auth_service.go
    - backend/service/password_policy.go
    - backend/service/refresh_token_service.go
    - backend/util/crypto.go
    - docs/readme_2607.md

- [2026-07-26 11:41] feat(auth): 优化注册登录表单密码策略与输入安全校验
  - Body: 前端新增用户名字符集限制与确认密码防粘贴校验，支持密码复杂度动态提示并在提交时复位明文显示；后端透出密码复杂度配置并同步更新相关测试。
  - Files:
    - backend/api/controller/auth_controller.go
    - backend/api/system_settings_handler.go
    - backend/service/auth_service.go
    - backend/service/user_service.go
    - docs/readme_2607.md
    - frontend/src/components/account/passwordValidation.ts
    - frontend/src/components/admin/__tests__/CreateUserDialog.test.tsx
    - frontend/src/components/admin/__tests__/ResetPasswordDialog.test.tsx
    - frontend/src/lib/authPolicy.ts
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/pages/RegisterPage.tsx
    - frontend/src/pages/__tests__/AccountPage.test.tsx
    - frontend/src/pages/__tests__/AuthEntryPages.test.tsx
    - frontend/src/services/systemSettingsService.ts
