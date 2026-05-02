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
