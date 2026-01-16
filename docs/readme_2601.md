# UniSearch 开发日志 - 2026年01月

## 项目概述
本文档记录 UniSearch 项目在 2026年01月 的所有开发活动和代码变更。

---

### [2026-01-10 23:45] refactor(ui): 优化页面加载器与侧边栏导航交互体验
**内容说明**：改进 PageLoader 组件的进度算法，使其与实际加载状态同步；重构 Sidebar 导航项的动画效果，使用 layoutId 实现流畅的标签切换过渡。
**备注/详情**：
- 移除了 API Key 管理相关的 spec 文档（requirements.md 和 tasks.md），清理已完成的开发规划文件
- PageLoader 采用分阶段进度模拟（0-60%-85%-95%-100%），避免进度条过早到达 100%
- Sidebar 导航项使用 Framer Motion 的 layoutId 特性实现激活状态的平滑过渡动画
- 优化了移动端侧边栏的交互体验，统一了桌面端和移动端的动画效果

**涉及文件**：
- .gitignore
- .kiro/specs/admin-panel-enhancement/design.md
- .kiro/specs/admin-panel-enhancement/requirements.md
- .kiro/specs/admin-panel-enhancement/tasks.md
- .kiro/specs/api-key-management/design.md
- .kiro/specs/api-key-management/requirements.md
- .kiro/specs/api-key-management/tasks.md
- frontend/src/components/PageLoader.tsx
- frontend/src/components/admin/Sidebar.tsx

---

---

## [2026-01-10 23:51] feat(auth): 实现刷新令牌自动续期和"记住我"功能

**Body**: 新增刷新令牌机制,支持用户勾选"记住我"后 30 天内自动登录。后端实现 Token 轮转和设备指纹验证,前端实现自动刷新 hook 和设备指纹生成。更新部署脚本以自动生成加密密钥。

**Footer**: 
- 破坏性变更: 登录接口响应字段从 token 改为 access_token
- Migration: 前端需更新登录响应解析逻辑,使用 access_token 字段

**Files**:
- .env.example
- .gitignore
- backend/api/middleware.go
- backend/api/refresh_token_handler.go
- backend/api/router.go
- backend/config/config.go
- backend/main.go
- backend/model/refresh_token.go
- backend/refresh_tokens.dat
- backend/service/refresh_token_service.go
- deploy/docker-compose.prod.yml
- deploy/env.prod
- docker-compose.yml
- docs/api_reference.md
- frontend/src/App.tsx
- frontend/src/components/Navbar.tsx
- frontend/src/hooks/useAutoRefreshToken.ts
- frontend/src/index.css
- frontend/src/pages/AdminLogin.tsx
- frontend/src/pages/Login.tsx
- frontend/src/services/authService.ts
- frontend/src/stores/authStore.ts
- frontend/src/types/api.ts
- frontend/src/utils/deviceFingerprint.ts
- scripts/deploy.sh

## [2026-01-11 23:45] chore(config): 统一环境配置并清理冗余文档

**Body**: 将环境变量配置统一到根目录 .env 文件,删除后端重复的配置文件;移除前端冗余的动画和导航文档;优化本地启动脚本的环境变量加载逻辑和端口配置说明,提升开发体验。

**Footer**: 

**Files**:
- .env.example
- backend/.env.example (deleted)
- docs/SCRIPTS_GUIDE.md
- frontend/ANIMATION_README.md (deleted)
- frontend/NAVIGATION_FEATURES.md (deleted)
- scripts/local.sh

---

## [2026-01-15 10:56] feat(admin): 新增插件管理功能和 API Key 每日限额控制

**Body**: 
实现了完整的插件管理对话框，支持插件的查看、测试连通性、编辑、删除和新增功能。同时为 API Key 系统新增每日搜索次数限制功能，管理员可在创建或批量创建时设置限额。前端管理页面新增搜索框支持快速过滤 API Keys，用户设置页面增加返回首页按钮优化导航体验。

**Footer**: 
无

**Files**:
- CHANGELOG.md
- README.md
- backend/api/admin_handler.go
- backend/api/auth_handler.go
- backend/api/handler.go
- backend/api/middleware.go
- backend/api/refresh_token_handler.go
- backend/api/router.go
- backend/config/custom_plugins.go
- backend/custom_plugins.json
- backend/go.mod
- backend/model/apikey.go
- backend/service/apikey_service.go
- backend/util/jwt.go
- frontend/src/components/CreateKeyDialog.tsx
- frontend/src/components/admin/AddPluginDialog.tsx
- frontend/src/components/admin/ApiKeyTableRow.tsx
- frontend/src/components/admin/BatchCreateDialog.tsx
- frontend/src/components/admin/PluginManageDialog.tsx
- frontend/src/components/admin/SystemInfoView.tsx
- frontend/src/components/ui/textarea.tsx
- frontend/src/pages/Admin.tsx
- frontend/src/pages/UserApiKeySettings.tsx
- frontend/src/services/authService.ts
- frontend/src/types/api.ts
- gen_hash.go

[2026-01-15 13:07] feat(admin): 支持编辑 API Key 时修改每日搜索次数限制
  - Body: 在编辑 API Key 对话框中新增每日搜索次数限制字段，支持单独更新或与过期时间一起更新。后端接口和服务层同步支持该参数，前端显示当前限额并提供输入框修改。
  - Files:
    - backend/api/admin_handler.go
    - backend/service/apikey_service.go
    - docs/api_reference.md
    - frontend/src/components/admin/EditKeyDialog.tsx
    - frontend/src/services/authService.ts
    - frontend/src/types/api.ts

[2026-01-16 21:01] refactor(admin): 优化插件管理对话框和系统信息视图的状态显示逻辑
  Body: 为 AddPluginDialog 组件添加编辑模式支持，支持初始数据填充；优化 SystemInfoView 中插件状态的显示逻辑，简化状态判断并调整状态标签文案。
  Files:
    - frontend/src/components/admin/AddPluginDialog.tsx
    - frontend/src/components/admin/SystemInfoView.tsx

[2026-01-16 23:45] docs(api): 新增插件管理 API 文档
  - Body: 在 API 参考文档中新增插件管理相关接口的完整说明，包括创建、更新、删除、测试插件以及 URL 连通性测试等 5 个接口的详细文档。同时在 README 中添加插件管理接口的快速导航链接。
  - Files:
    - README.md
    - docs/api_reference.md
