# 2026年05月 开发日志

## [2026-05-01 11:36:09] refactor(deploy): 重构单容器部署并完善 Zeabur 教程
- **Body**: 将部署形态收敛为单容器 Nginx + Go API，补充 Zeabur 部署文档与环境变量示例，并清理旧的分散式部署脚本与配置。
- **Files**:
  - `.Codex/operations-log.md`
  - `Dockerfile`
  - `README.md`
  - `backend/.env.example`
  - `backend/Dockerfile`
  - `backend/database/connection.go`
  - `deploy/nginx/nginx.conf`
  - `deploy/nginx/nginx.conf.template`
  - `docker-compose.yml`
  - `docs/zeabur-deploy.md`
  - `frontend/Dockerfile`
  - `nginx.conf`
  - `scripts/sync-production-config.sh`
  - `supervisord.conf`

## [2026-05-01 12:06:39] refactor(deploy): 调整插件加载默认行为
- **Body**: 修正 `ENABLED_PLUGINS` 的默认语义，区分“未设置”与“显式为空”，避免 Zeabur 环境下因为变量缺省导致插件未加载。
- **Files**:
  - `README.md`
  - `backend/plugin/plugin.go`
  - `docs/zeabur-deploy.md`

## [2026-05-01 15:38:14] style(frontend): 统一公告与账户区视觉语言
- **Body**: 将公告弹窗与访问码弹窗切换为 Markdown 渲染并收敛交互样式，统一账户概览、搜索结果卡片与后台公告编辑的视觉语言，同时补充前端依赖与排版插件。
- **Files**:
  - `.playwright-mcp/page-2026-05-01T06-06-39-849Z.yml`
  - `frontend/package.json`
  - `frontend/pnpm-lock.yaml`
  - `frontend/src/components/AnnouncementDialog.tsx`
  - `frontend/src/components/PasswordModal.tsx`
  - `frontend/src/components/__tests__/PasswordModal.test.tsx`
  - `frontend/src/components/account/AccountOverviewHighlights.tsx`
  - `frontend/src/components/account/AccountOverviewShowcase.tsx`
  - `frontend/src/components/account/AccountWorkspaceShell.tsx`
  - `frontend/src/components/account/accountDesign.ts`
  - `frontend/src/components/admin/AnnouncementManagement.tsx`
  - `frontend/src/components/home/SearchResultGridCard.tsx`
  - `frontend/src/components/home/SearchResultListItem.tsx`
  - `frontend/tailwind.config.js`

## [2026-05-02 14:20:06] style(frontend): 统一首页与个人中心视觉结构
- **Body**: 抽取公共 SEO 与特性卡片组件，统一首页与个人中心的玻璃态视觉结构，并收敛路由常量与全局样式入口，降低页面级重复实现。
- **Files**:
  - `frontend/package.json`
  - `frontend/pnpm-lock.yaml`
  - `frontend/src/components/SEO.tsx`
  - `frontend/src/components/account/AccountHeroBanner.tsx`
  - `frontend/src/components/account/AccountSecurityPanel.tsx`
  - `frontend/src/components/home/FeatureCard.tsx`
  - `frontend/src/config/constants.ts`
  - `frontend/src/index.css`
  - `frontend/src/main.tsx`
  - `frontend/src/pages/AccountPage.tsx`
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/routes/AppRoutes.tsx`

## [2026-05-02 16:18:56] style(frontend): 重构后台管理页交互结构
- **Body**: 将后台用户与系统设置页面拆分为独立控制器和基础组件，新增苹果风开关与骨架屏样式，收敛页面入口和全局样式以统一后台管理体验。
- **Files**:
  - `.playwright-mcp/page-2026-05-01T06-06-39-849Z.yml`
  - `frontend/src/components/admin/AdminUsersView.tsx`
  - `frontend/src/components/admin/SystemSettingsView.tsx`
  - `frontend/src/components/admin/__tests__/AdminUsersView.test.tsx`
  - `frontend/src/components/ui/apple-switch.tsx`
  - `frontend/src/components/ui/skeleton.tsx`
  - `frontend/src/config/constants.ts`
  - `frontend/src/hooks/useAdminPageController.ts`
  - `frontend/src/hooks/useAdminUsers.ts`
  - `frontend/src/hooks/useSystemSettingsController.ts`
  - `frontend/src/index.css`
  - `frontend/src/pages/Admin.tsx`

## [2026-05-02 17:51:05] style(frontend): 统一按钮卡片与后台表单样式
- **Body**: 继续收敛前端基础 UI 组件的玻璃态和苹果风样式，统一按钮、卡片、输入框与公告表单的视觉表现，减少分散的局部样式实现。
- **Files**:
  - `frontend/src/components/admin/AnnouncementManagement.tsx`
  - `frontend/src/components/home/TrendingCategories.tsx`
  - `frontend/src/components/ui/apple-switch.tsx`
  - `frontend/src/components/ui/button.tsx`
  - `frontend/src/components/ui/card.tsx`
  - `frontend/src/components/ui/textarea.tsx`

## [2026-05-02 20:20:31] style(frontend): 收敛全站玻璃主题样式
- **Body**: 统一全站玻璃拟物化变量、按钮、卡片、对话框和输入框样式，并同步调整登录、注册、免责声明与空状态页面，保证视觉语言一致。
- **Files**:
  - `frontend/src/components/MobileMenu.tsx`
  - `frontend/src/components/SearchResults.tsx`
  - `frontend/src/components/__tests__/MobileMenu.test.tsx`
  - `frontend/src/components/admin/SystemSettingsView.tsx`
  - `frontend/src/components/admin/adminDesign.ts`
  - `frontend/src/components/auth/authEntryLayout.ts`
  - `frontend/src/components/ui/AppleInput.tsx`
  - `frontend/src/components/ui/animated-theme-toggler.tsx`
  - `frontend/src/components/ui/apple-switch.tsx`
  - `frontend/src/components/ui/button-variants.ts`
  - `frontend/src/components/ui/button.tsx`
  - `frontend/src/components/ui/card.tsx`
  - `frontend/src/components/ui/dialog-shell.ts`
  - `frontend/src/components/ui/page-not-found.tsx`
  - `frontend/src/components/ui/textarea.tsx`
  - `frontend/src/index.css`
  - `frontend/src/pages/AdminLogin.tsx`
  - `frontend/src/pages/DisclaimerPage.tsx`
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/RegisterPage.tsx`
  - `frontend/tailwind.config.js`

## [2026-05-02 21:08:13] refactor(frontend): 统一认证页表单提交流程并补强测试适配
- **Body**: 将登录、注册和后台登录改为标准表单提交，补充自动填充与禁用态处理，并同步修正相关测试与 Vite 超时配置。
- **Files**:
  - `frontend/index.html`
  - `frontend/src/components/admin/__tests__/ChannelPreviewDialog.test.tsx`
  - `frontend/src/components/home/__tests__/TrendingCategories.test.tsx`
  - `frontend/src/pages/AdminLogin.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/RegisterPage.tsx`
  - `frontend/src/pages/__tests__/AccountPage.test.tsx`
  - `frontend/src/pages/__tests__/Admin.test.tsx`
  - `frontend/src/pages/__tests__/AuthEntryPages.test.tsx`
  - `frontend/src/pages/__tests__/Home.test.tsx`
  - `frontend/vite.config.ts`

## [2026-05-03 09:38:20] chore(deploy): 收敛日志输出并调整仓库忽略规则
- **Body**: 将数据库连接的“查无记录”场景降噪，关闭静态资源缺失日志，并把 `.codex` 目录忽略规则收紧到具体子项；同时移除已暂存的旧操作记录文件。
- **Files**:
  - `.Codex/operations-log.md`
  - `.gitignore`
  - `backend/database/connection.go`
  - `nginx.conf`

## [2026-05-05 10:18:32] test(frontend): 补充角色下拉层级回归测试
- **Body**: 为编辑用户弹窗补充下拉浮层层级的回归测试，并将通用 select 浮层层级上调，避免被弹窗内容遮挡。
- **Files**:
  - `frontend/src/components/admin/__tests__/EditUserDialog.test.tsx`
  - `frontend/src/components/ui/select.tsx`

## [2026-05-05 19:43:52] refactor(frontend): 收敛搜索交互与路由恢复逻辑
- **Body**: 为搜索框、结果刷新、分类筛选和路由守卫统一补齐状态恢复逻辑，并同步完善相关回归测试，避免登录前后与切换视图时的状态丢失。
- **Files**:
  - `frontend/src/components/CloudTypeFilter.tsx`
  - `frontend/src/components/SearchBox.tsx`
  - `frontend/src/components/SearchResults.tsx`
  - `frontend/src/components/__tests__/CloudTypeFilter.test.tsx`
  - `frontend/src/components/__tests__/SearchBox.test.tsx`
  - `frontend/src/components/__tests__/SearchResults.test.tsx`
  - `frontend/src/components/home/SearchResultsToolbar.tsx`
  - `frontend/src/pages/AdminLogin.tsx`
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/RegisterPage.tsx`
  - `frontend/src/pages/__tests__/AuthEntryPages.test.tsx`
  - `frontend/src/routes/RouteGuards.tsx`
  - `frontend/src/routes/__tests__/RouteGuards.test.tsx`
  - `frontend/src/stores/searchStore.ts`

## [2026-05-09 08:14:55] chore(frontend): 清理旧设计文档并调整云类型筛选交互
- **Body**: 删除过时的个人中心设计方案文档，收紧仓库忽略规则，并优化云类型筛选的触控交互与回归测试。
- **Files**:
  - `.gitignore`
  - `docs/superpowers/plans/2026-04-23-account-page-redesign.md`
  - `docs/superpowers/specs/2026-04-23-account-page-redesign-design.md`
  - `frontend/src/components/CloudTypeFilter.tsx`
  - `frontend/src/components/__tests__/CloudTypeFilter.test.tsx`
  - `frontend/src/components/magicui/cool-mode.tsx`

## [2026-05-17 02:00:19] feat(plugin): 引入插件目录与统一资源结果模型
- **Body**: 新增插件目录、清单与校验能力，统一后端搜索结果与插件元数据结构，并同步重构前端插件管理与资源展示页面。
- **Files**:
  - `backend/api/admin_handler.go`
  - `backend/api/filter.go`
  - `backend/api/filter_test.go`
  - `backend/api/plugin_center_handler.go`
  - `backend/api/plugin_center_handler_test.go`
  - `backend/api/plugin_manifest_response_test.go`
  - `backend/api/router.go`
  - `backend/config/custom_plugins.go`
  - `backend/custom_plugins.json`
  - `backend/model/plugin_catalog.go`
  - `backend/model/plugin_manifest.go`
  - `backend/model/request.go`
  - `backend/model/response.go`
  - `backend/plugin/baseasyncplugin.go`
  - `backend/plugin/manifest.go`
  - `backend/plugin/manifest_test.go`
  - `backend/plugin/pansearch/pansearch.go`
  - `backend/plugin/thepiratebay/thepiratebay.go`
  - `backend/plugin_market.default.json`
  - `backend/service/plugin_catalog_service.go`
  - `backend/service/plugin_catalog_service_test.go`
  - `backend/service/plugin_health_service.go`
  - `backend/service/search_response_builder.go`
  - `backend/service/search_response_builder_test.go`
  - `backend/tools/validate_plugin_manifests.go`
  - `docs/插件开发指南.md`
  - `frontend/src/components/SearchResults.tsx`
  - `frontend/src/components/admin/AdminWorkspacePageFrame.tsx`
  - `frontend/src/components/admin/ChannelManagementView.tsx`
  - `frontend/src/components/admin/PluginManagementView.tsx`
  - `frontend/src/components/admin/PluginManageDialog.tsx`
  - `frontend/src/components/admin/PluginManageWorkspace.tsx`
  - `frontend/src/components/admin/__tests__/PluginManagementView.test.tsx`
  - `frontend/src/hooks/usePluginManageController.ts`
  - `frontend/src/pages/Admin.tsx`
  - `frontend/src/stores/searchStore.ts`
  - `frontend/src/types/api.ts`
  - `frontend/src/utils/searchResultSorter.ts`

## [2026-05-17 02:56:39] refactor(admin): 重构后台管理布局与公告管理状态
- **Body**: 抽离后台通用卡片与筛选输入，统一用户、公告、频道和插件管理视图，并把公告管理状态收敛到独立 hook，减少页面内重复逻辑。
- **Files**:
  - `frontend/src/components/admin/AdminContentCard.tsx`
  - `frontend/src/components/admin/AdminSearchInput.tsx`
  - `frontend/src/components/admin/AdminStatusFilter.tsx`
  - `frontend/src/components/admin/AdminUsersView.tsx`
  - `frontend/src/components/admin/AdminWorkspacePageFrame.tsx`
  - `frontend/src/components/admin/AnnouncementManagement.tsx`
  - `frontend/src/components/admin/ChannelManagementView.tsx`
  - `frontend/src/components/admin/PluginManagementView.tsx`
  - `frontend/src/components/admin/Sidebar.tsx`
  - `frontend/src/components/admin/SystemSettingsView.tsx`
  - `frontend/src/hooks/useAnnouncementManagement.ts`
  - `frontend/src/pages/Admin.tsx`

## [2026-05-17 03:17:20] refactor(admin): 收敛后台管理依赖与插件控制逻辑
- **Body**: 清理后台管理相关组件的冗余依赖，并补齐插件管理流程里的数据刷新关联，减少无效状态和重复导入。
- **Files**:
  - `frontend/src/components/CloudTypeFilter.tsx`
  - `frontend/src/components/admin/AdminContentCard.tsx`
  - `frontend/src/components/admin/AdminStatusFilter.tsx`
  - `frontend/src/components/admin/AdminUsersView.tsx`
  - `frontend/src/components/admin/AnnouncementManagement.tsx`
  - `frontend/src/components/admin/ChannelManagementView.tsx`
  - `frontend/src/components/admin/PluginManagementView.tsx`
  - `frontend/src/hooks/useAdminPageController.ts`
  - `frontend/src/hooks/usePluginManageController.ts`

## [2026-05-17 19:43:27] refactor(frontend): 优化资源排序与后台组件细节
- **Body**: 为资源排序增加关键词匹配层级，并收敛后台卡片、筛选器和插件控制中的细节依赖，提升列表命中和组件一致性。
- **Files**:
  - `frontend/src/components/CloudTypeFilter.tsx`
  - `frontend/src/components/admin/AdminContentCard.tsx`
  - `frontend/src/components/admin/AdminStatusFilter.tsx`
  - `frontend/src/components/admin/AdminUsersView.tsx`
  - `frontend/src/components/admin/AnnouncementManagement.tsx`
  - `frontend/src/components/admin/ChannelManagementView.tsx`
  - `frontend/src/components/admin/PluginManagementView.tsx`
  - `frontend/src/hooks/useAdminPageController.ts`
  - `frontend/src/hooks/usePluginManageController.ts`
  - `frontend/src/utils/searchResultSorter.ts`
  - `frontend/src/utils/__tests__/searchResultSorter.test.ts`

## [2026-05-17 19:49:24] feat(resource): 引入资源详情页与标签管理
- **Body**: 新增资源详情页、后台标签词库与相关接口，并同步优化资源排序、系统设置和管理页联动逻辑。
- **Files**:
  - `Dockerfile`
  - `backend/api/account_auth_flow_test.go`
  - `backend/api/admin_handler.go`
  - `backend/api/admin_tag_handler.go`
  - `backend/api/admin_tag_handler_test.go`
  - `backend/api/custom_plugins.json`
  - `backend/api/plugin_center_handler.go`
  - `backend/api/plugin_manifest_response_test.go`
  - `backend/api/router.go`
  - `backend/api/system_settings_handler.go`
  - `backend/api/system_settings_handler_test.go`
  - `backend/api/tg_channel_handler.go`
  - `backend/config/custom_plugins.go`
  - `backend/database/migration.go`
  - `backend/main.go`
  - `backend/model/admin_tag.go`
  - `backend/model/system_settings.go`
  - `backend/model/tg_channel.go`
  - `backend/service/admin_tag_service.go`
  - `backend/service/admin_tag_service_test.go`
  - `backend/service/plugin_catalog_service.go`
  - `backend/service/search_response_builder.go`
  - `backend/service/search_response_builder_test.go`
  - `backend/service/system_settings_service.go`
  - `backend/service/system_settings_service_test.go`
  - `backend/service/tg_channel_service.go`
  - `backend/util/tag_util.go`
  - `frontend/src/components/PasswordModal.tsx`
  - `frontend/src/components/SearchResults.tsx`
  - `frontend/src/components/admin/AdminSelectField.tsx`
  - `frontend/src/components/admin/AdminStatusFilter.tsx`
  - `frontend/src/components/admin/AdminTagMultiSelect.tsx`
  - `frontend/src/components/admin/AdminWorkspacePageFrame.tsx`
  - `frontend/src/components/admin/ApplePagination.tsx`
  - `frontend/src/components/admin/ChannelAddDialog.tsx`
  - `frontend/src/components/admin/ChannelManageDialog.tsx`
  - `frontend/src/components/admin/ChannelManagementView.tsx`
  - `frontend/src/components/admin/PluginAddDialog.tsx`
  - `frontend/src/components/admin/PluginManageDialog.tsx`
  - `frontend/src/components/admin/PluginManageWorkspace.tsx`
  - `frontend/src/components/admin/PluginManagementView.tsx`
  - `frontend/src/components/admin/Sidebar.tsx`
  - `frontend/src/components/admin/SystemSettingsView.tsx`
  - `frontend/src/components/admin/TableFilterDropdown.tsx`
  - `frontend/src/components/admin/adminDropdown.ts`
  - `frontend/src/components/admin/adminTagUtils.ts`
  - `frontend/src/components/admin/pluginManageDialogShared.ts`
  - `frontend/src/components/admin/pluginManageStateUtils.ts`
  - `frontend/src/components/home/SearchResultGridCard.tsx`
  - `frontend/src/components/home/SearchResultListItem.tsx`
  - `frontend/src/components/ui/AppleInput.tsx`
  - `frontend/src/components/ui/dialog-shell.ts`
  - `frontend/src/components/ui/select.tsx`
  - `frontend/src/config/constants.ts`
  - `frontend/src/hooks/useChannelManageController.ts`
  - `frontend/src/hooks/usePluginManageController.ts`
  - `frontend/src/hooks/usePluginManageDialogState.ts`
  - `frontend/src/hooks/useSystemSettingsController.ts`
  - `frontend/src/pages/ResourceDetailPage.tsx`
  - `frontend/src/pages/__tests__/AdminNavigation.test.tsx`
  - `frontend/src/pages/__tests__/ResourceDetailPage.test.tsx`
  - `frontend/src/routes/AppRoutes.tsx`
  - `frontend/src/routes/__tests__/AppRoutes.test.tsx`
  - `frontend/src/services/systemSettingsService.ts`
  - `frontend/src/test/setup.ts`
  - `frontend/src/types/api.ts`
  - `frontend/src/utils/__tests__/searchResultSorter.test.ts`
  - `frontend/src/utils/resourceDisplay.ts`
  - `frontend/src/utils/searchResultSorter.ts`
