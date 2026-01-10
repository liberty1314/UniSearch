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
