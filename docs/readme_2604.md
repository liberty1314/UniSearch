# 2026年04月 开发日志

## [2026-04-23 20:51:42] style(ui): 统一首页搜索与工作区视觉语言
- **Body**: 收敛首页、搜索框、来源筛选、平台跑马灯、热门分类和加载页的蓝青玻璃态设计语言，并补齐账户中心、后台统计卡片、用户表格与输入焦点态的视觉一致性；同步修复相关测试漂移，恢复前端全量测试基线。
- **Files**:
  - `frontend/src/components/CloudTypeFilter.tsx`
  - `frontend/src/components/PageLoader.tsx`
  - `frontend/src/components/SearchBox.tsx`
  - `frontend/src/components/account/AccountOverviewPanel.tsx`
  - `frontend/src/components/account/AccountSecurityPanel.tsx`
  - `frontend/src/components/account/AccountWorkspaceShell.tsx`
  - `frontend/src/components/admin/AppleUserTable.tsx`
  - `frontend/src/components/admin/StatsCard.tsx`
  - `frontend/src/components/home/PlatformMarquee.tsx`
  - `frontend/src/components/home/TrendingCategories.tsx`
  - `frontend/src/components/ui/AppleInput.tsx`
  - `frontend/src/pages/Admin.tsx`
  - `frontend/src/pages/Home.tsx`

## [2026-04-18 15:18:42] style(ui): 统一首页、账号页与认证页视觉层级
- **Body**: 收敛首页、账号页和认证页的玻璃拟态视觉，简化启动页为轻量加载态，并统一搜索框、热门分类、平台标签与账号面板的交互反馈，提升整体一致性。
- **Files**:
  - `README.md`
  - `frontend/src/App.tsx`
  - `frontend/src/components/PageLoader.tsx`
  - `frontend/src/components/SearchBox.tsx`
  - `frontend/src/components/account/AccountOverviewPanel.tsx`
  - `frontend/src/components/account/AccountSectionHero.tsx`
  - `frontend/src/components/account/AccountSecurityPanel.tsx`
  - `frontend/src/components/account/AccountWorkspaceShell.tsx`
  - `frontend/src/components/account/accountDesign.ts`
  - `frontend/src/components/home/PlatformMarquee.tsx`
  - `frontend/src/components/home/TrendingCategories.tsx`
  - `frontend/src/components/home/platformThemes.ts`
  - `frontend/src/pages/AccountPage.tsx`
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/RegisterPage.tsx`

## [2026-04-18 13:25:08] style(ui): 统一账号工作台与安全设置设计语言
- **Body**: 抽取账号区块的共享 hero 与表面样式 token，统一账号工作台与安全设置的标题层、徽章层、卡片层和交互层级，提升两块页面的一致性与可维护性。
- **Files**:
  - `frontend/src/components/account/AccountOverviewPanel.tsx`
  - `frontend/src/components/account/AccountSectionHero.tsx`
  - `frontend/src/components/account/AccountSecurityPanel.tsx`
  - `frontend/src/components/account/AccountWorkspaceShell.tsx`
  - `frontend/src/components/account/accountDesign.ts`
  - `frontend/src/pages/AccountPage.tsx`
  - `frontend/src/pages/__tests__/AccountPage.test.tsx`

## [2026-04-18 13:09:33] style(ui): 统一全站暗色曜石玻璃背景
- **Body**: 抽取全站暗色曜石玻璃语义层，统一公开页、认证页、后台页与页脚的深色基底，并同步收敛首页的跑马灯、热门分类与页脚视觉层级。
- **Files**:
  - `.gitignore`
  - `frontend/src/components/DisclaimerFooter.tsx`
  - `frontend/src/components/PublicPageShell.tsx`
  - `frontend/src/components/SiteFooter.tsx`
  - `frontend/src/components/__tests__/DisclaimerFooter.test.tsx`
  - `frontend/src/components/__tests__/SiteFooter.test.tsx`
  - `frontend/src/components/home/PlatformMarquee.tsx`
  - `frontend/src/components/home/TrendingCategories.tsx`
  - `frontend/src/components/ui/__tests__/motion-footer.test.tsx`
  - `frontend/src/components/ui/motion-footer.tsx`
  - `frontend/src/index.css`
  - `frontend/src/pages/Admin.tsx`
  - `frontend/src/pages/AdminLogin.tsx`
  - `frontend/src/pages/DisclaimerPage.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/RegisterPage.tsx`
  - `frontend/src/pages/__tests__/Admin.test.tsx`
  - `frontend/src/pages/__tests__/Home.test.tsx`
  - `frontend/src/routes/AppRoutes.tsx`
  - `frontend/src/routes/__tests__/AppRoutes.test.tsx`

## [2026-04-04 10:32:02] refactor(frontend): 重构登录页密码输入组件并优化测试
- **内容**: 将注册环节的密码与确认密码输入框替换为统一样式的 `AuthInput` 组件并补充多语言属性，提升视觉表现与无障碍交互；同时调整 Admin 页面测试，复用公共的 `ConfirmDialog` 桩组件以提高自动化测试健壮性。
- **文件**:
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/__tests__/Admin.test.tsx`

## [2026-04-04 13:03:38] refactor(admin): 提取并重构后台数据表格组件及完善单元测试
- **内容**: 抽象出通用的 AdminDataTable 基础组件，优化了 API Key 和用户管理页面的表格展示与操作逻辑，并完善了相关的交互测试用例。
- **文件**:
  - `frontend/src/components/admin/AdminApiKeysView.tsx`
  - `frontend/src/components/admin/AdminDataTable.tsx`
  - `frontend/src/components/admin/AdminUsersView.tsx`
  - `frontend/src/components/admin/AppleApiKeyTable.tsx`
  - `frontend/src/components/admin/AppleUserTable.tsx`
  - `frontend/src/components/admin/__tests__/AdminDataTable.test.tsx`
  - `frontend/src/components/admin/__tests__/AppleApiKeyTable.test.tsx`
  - `frontend/src/components/admin/__tests__/AppleUserTable.test.tsx`

## [2026-04-04 14:04] style(ui): 优化首页视觉布局与组件展示逻辑
- **Body**: 优化了首页的 PlatformMarquee 组件展示，调整了 Home 页面中热门分类与功能介绍的布局顺序，并同步更新了相应的测试用例。
- **Files**:
  - frontend/src/components/home/PlatformMarquee.tsx
  - frontend/src/pages/Home.tsx
  - frontend/src/pages/__tests__/Home.test.tsx

## [2026-04-04 17:18:40] style(ui): 优化首页视觉布局并引入统一章节标题组件
- **内容**: 引入 `HomeSectionHeader` 统一首页章节视觉，扩充支持平台（115、迅雷等）主题配置，并优化跑马灯组件与首页布局间距。
- **文件**:
  - `frontend/src/components/CloudTypeFilter.tsx`
  - `frontend/src/components/home/HomeSectionHeader.tsx`
  - `frontend/src/components/home/PlatformMarquee.tsx`
  - `frontend/src/components/home/TrendingCategories.tsx`
  - `frontend/src/components/home/__tests__/PlatformMarquee.test.tsx`
  - `frontend/src/components/home/platformThemes.ts`
  - `frontend/src/components/ui/marquee.tsx`
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/pages/__tests__/Home.test.tsx`

## [2026-04-04 23:22:02] feat(deploy): 优化 Dockerfile 插件复制并增强 build.sh 环境加载
- **内容**: 在 Dockerfile 中添加自定义插件配置的复制指令；同时重构 build.sh，新增环境变量自动加载机制，支持从 .env/.env.example 读取并传递业务配置到本地测试容器，提升容器化测试的灵活性。
- **文件**:
  - `Dockerfile`
  - `scripts/build.sh`

## [2026-04-05 13:27:02] feat(auth): 统一认证与账户管理入口
- **Body**: 重构后端认证与刷新令牌流程，统一前端登录、注册、账户与 API Key 入口，并清理旧页面与相关状态管理。
- **Files**:
  - `backend/api/account_auth_flow_test.go`
  - `backend/api/admin_handler.go`
  - `backend/api/auth_handler.go`
  - `backend/api/controller/auth_controller.go`
  - `backend/api/handler.go`
  - `backend/api/middleware.go`
  - `backend/api/middleware/jwt_auth.go`
  - `backend/api/refresh_token_handler.go`
  - `backend/api/router.go`
  - `backend/api/user_handler.go`
  - `backend/database/migration.go`
  - `backend/main.go`
  - `backend/model/user.go`
  - `backend/service/auth_service.go`
  - `backend/service/user_service.go`
  - `backend/util/jwt.go`
  - `frontend/src/components/CreateKeyDialog.tsx`
  - `frontend/src/components/MobileMenu.tsx`
  - `frontend/src/components/Navbar.tsx`
  - `frontend/src/components/SearchBox.tsx`
  - `frontend/src/components/SiteFooter.tsx`
  - `frontend/src/components/__tests__/DisclaimerFooterVisibility.test.tsx`
  - `frontend/src/components/__tests__/SearchBox.test.tsx`
  - `frontend/src/components/admin/AdminApiKeysView.tsx`
  - `frontend/src/components/admin/AppleApiKeyTable.tsx`
  - `frontend/src/components/admin/BatchCreateDialog.tsx`
  - `frontend/src/components/admin/BatchDeleteKeysDialog.tsx`
  - `frontend/src/components/admin/BatchExportDialog.tsx`
  - `frontend/src/components/admin/BatchExtendDialog.tsx`
  - `frontend/src/components/admin/EditKeyDialog.tsx`
  - `frontend/src/components/admin/Sidebar.tsx`
  - `frontend/src/components/admin/SystemSettingsView.tsx`
  - `frontend/src/components/admin/__tests__/AppleApiKeyTable.test.tsx`
  - `frontend/src/components/admin/__tests__/BatchExtendDialog.test.tsx`
  - `frontend/src/components/admin/__tests__/EditKeyDialog.test.tsx`
  - `frontend/src/components/admin/apiKeyExtensionOptions.ts`
  - `frontend/src/components/auth/__tests__/authRouteMotion.test.ts`
  - `frontend/src/components/auth/authRouteMotion.ts`
  - `frontend/src/hooks/useAdminPageController.ts`
  - `frontend/src/lib/api.ts`
  - `frontend/src/lib/authRefreshManager.ts`
  - `frontend/src/pages/AccountPage.tsx`
  - `frontend/src/pages/Admin.tsx`
  - `frontend/src/pages/AdminLogin.tsx`
  - `frontend/src/pages/ApiKeyLoginPage.tsx`
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/RegisterPage.tsx`
  - `frontend/src/pages/UserApiKeySettings.tsx`
  - `frontend/src/pages/__tests__/Admin.test.tsx`
  - `frontend/src/pages/__tests__/AuthEntryPages.test.tsx`
  - `frontend/src/pages/__tests__/Home.test.tsx`
  - `frontend/src/pages/__tests__/UserApiKeySettings.test.tsx`
  - `frontend/src/routes/AppRoutes.tsx`
  - `frontend/src/routes/__tests__/AppRoutes.test.tsx`
  - `frontend/src/services/__tests__/searchService.test.ts`
  - `frontend/src/services/authService.ts`
  - `frontend/src/services/systemSettingsService.ts`
  - `frontend/src/stores/__tests__/searchAccessStore.test.ts`
  - `frontend/src/stores/authStore.ts`
  - `frontend/src/stores/searchAccessStore.ts`
  - `frontend/src/stores/searchStore.ts`

## [2026-04-06 17:39:36] refactor(frontend): 重构管理员登录重定向逻辑并优化路由守卫测试
- **内容**: 移除了 AdminLogin 中冗余的客户端跳转逻辑，统一由 RouteGuards 处理管理员重定向；同步修复了 Admin、AuthEntryPages 和 Home 的单元测试，并新增了 RouteGuards 的测试用例。
- **文件**:
  - frontend/src/pages/AdminLogin.tsx
  - frontend/src/pages/__tests__/Admin.test.tsx
  - frontend/src/pages/__tests__/AuthEntryPages.test.tsx
  - frontend/src/pages/__tests__/Home.test.tsx
  - frontend/src/routes/RouteGuards.tsx
  - frontend/src/routes/__tests__/RouteGuards.test.tsx

## 2026-04-12
**Header**: `feat(ui): 引入首页独立底部运动组件 CinematicFooter`
**Body**: 新增基于 framer-motion 和 gsap 的动画底部，针对首页（`/`）独立渲染视觉效果更丰富的 CinematicFooter，其他路由保持使用普通 SiteFooter；并完善了相关组件的路由隔离与单元测试。
**Files**:
- frontend/package.json
- frontend/pnpm-lock.yaml
- frontend/src/components/ui/motion-footer.tsx
- frontend/src/components/ui/__tests__/motion-footer.test.tsx
- frontend/src/routes/AppRoutes.tsx
- frontend/src/routes/__tests__/AppRoutes.test.tsx
- frontend/src/components/__tests__/SiteFooter.test.tsx
- frontend/vite.config.ts

## [2026-04-18 23:02:24] style(admin): 统一后台管理页玻璃拟态设计语言
- **内容**: 抽离后台共享设计常量，统一侧边栏、卡片、表格、分页与输入框的玻璃拟态样式；让管理后台与账户工作区保持一致的视觉语言和交互动效。
- **文件**:
  - frontend/src/components/account/accountDesign.ts
  - frontend/src/components/admin/AdminDataTable.tsx
  - frontend/src/components/admin/AdminUsersView.tsx
  - frontend/src/components/admin/AnnouncementManagement.tsx
  - frontend/src/components/admin/ApplePagination.tsx
  - frontend/src/components/admin/AppleUserTable.tsx
  - frontend/src/components/admin/BatchActionsBar.tsx
  - frontend/src/components/admin/Sidebar.tsx
  - frontend/src/components/admin/StatsCard.tsx
  - frontend/src/components/admin/SystemInfoView.tsx
  - frontend/src/components/admin/SystemSettingsView.tsx
  - frontend/src/components/admin/TableFilterDropdown.tsx
  - frontend/src/components/admin/adminDesign.ts
  - frontend/src/components/ui/AppleInput.tsx
  - frontend/src/pages/Admin.tsx

## [2026-04-23 23:29:22] refactor(frontend): 重构个人中心页面工作台布局
- **内容**: 按“上横幅，下双栏”的新骨架重构个人中心页面，新增欢迎横幅、核心信息卡和展示型模块，并保持现有账号资料与密码修改数据流不变；同步补充设计文档、实施计划和页面测试。
- **文件**:
  - docs/superpowers/plans/2026-04-23-account-page-redesign.md
  - docs/superpowers/specs/2026-04-23-account-page-redesign-design.md
  - frontend/src/components/account/AccountHeroBanner.tsx
  - frontend/src/components/account/AccountOverviewHighlights.tsx
  - frontend/src/components/account/AccountOverviewPanel.tsx
  - frontend/src/components/account/AccountOverviewShowcase.tsx
  - frontend/src/components/account/AccountSecurityPanel.tsx
  - frontend/src/components/account/AccountWorkspaceShell.tsx
  - frontend/src/pages/AccountPage.tsx
  - frontend/src/pages/__tests__/AccountPage.test.tsx

## [2026-04-25 20:21:06 CST] feat(auth): 增加月度登录统计并统一认证与管理界面
- **内容**: 后端新增用户月度登录/活跃统计写入与查询，认证链路补充相关测试；前端统一登录、注册与管理员用户列表的展示结构，并增强后台表格交互体验。
- **文件**:
  - backend/api/account_auth_flow_test.go
  - backend/api/handler.go
  - backend/api/middleware.go
  - backend/api/router.go
  - backend/api/user_handler.go
  - backend/database/migration.go
  - backend/model/user_login_daily_stat.go
  - backend/service/auth_service.go
  - backend/service/user_service.go
  - backend/service/user_service_test.go
  - frontend/package.json
  - frontend/pnpm-lock.yaml
  - frontend/src/components/__tests__/AnnouncementDialog.test.tsx
  - frontend/src/components/account/AccountSectionHero.tsx
  - frontend/src/components/account/AccountWorkspaceShell.tsx
  - frontend/src/components/admin/AdminDataTable.tsx
  - frontend/src/components/admin/AdminUsersView.tsx
  - frontend/src/components/admin/AppleUserTable.tsx
  - frontend/src/components/admin/BatchDeleteDialog.tsx
  - frontend/src/components/admin/ChannelManageWorkspace.tsx
  - frontend/src/components/admin/CreateUserDialog.tsx
  - frontend/src/components/admin/PluginManageWorkspace.tsx
  - frontend/src/components/admin/__tests__/AdminDataTable.test.tsx
  - frontend/src/components/admin/__tests__/AdminUsersView.test.tsx
  - frontend/src/components/admin/__tests__/AppleUserTable.test.tsx
  - frontend/src/components/admin/__tests__/ChannelManageDialog.test.tsx
  - frontend/src/components/admin/__tests__/CreateUserDialog.test.tsx
  - frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
  - frontend/src/components/admin/__tests__/PluginManageWorkspace.test.tsx
  - frontend/src/components/auth/authEntryLayout.ts
  - frontend/src/components/ui/__tests__/ConfirmDialog.test.tsx
  - frontend/src/components/ui/alert-dialog.tsx
  - frontend/src/components/ui/confirm-dialog.tsx
  - frontend/src/components/ui/dialog-shell.ts
  - frontend/src/components/ui/dialog.tsx
  - frontend/src/components/ui/server-management-table.tsx
  - frontend/src/pages/LoginPage.tsx
  - frontend/src/pages/RegisterPage.tsx
  - frontend/src/pages/__tests__/AuthEntryPages.test.tsx
  - frontend/src/stores/searchAccessStore.ts
  - frontend/src/types/api.ts
