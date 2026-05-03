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
