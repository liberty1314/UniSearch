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

---

### [2026-01-19 23:35] refactor(auth): 引入数据库用户系统和 Controller 架构
**内容说明**：将用户认证系统从环境变量哈希密码模式重构为完整的数据库用户管理体系。新增 MySQL 数据库连接、自动迁移和种子数据功能，实现用户注册、登录、JWT 双 Token 机制（Access/Refresh）。引入 Controller 层以分离业务逻辑，支持普通用户和管理员双重认证流程。更新所有插件以适配新的日志和缓存架构。

**备注/详情**：
- **破坏性变更**：移除了 ADMIN_PASSWORD_HASH 环境变量，改为数据库存储用户凭证
- **数据库**：新增 MySQL 依赖（GORM），支持自动建表和种子数据初始化
- **认证流程**：支持用户名密码登录 + API Key 登录（sk- 开头），JWT Token 携带用户角色
- **中间件升级**：新增独立的 JWTAuthMiddleware 和 AdminAuthMiddleware 替代旧的验证逻辑
- **API 文档更新**：新增用户注册、登录、管理员登录等 10+ 个接口说明
- **部署配置**：docker-compose 和生产部署脚本新增数据库服务配置，脚本自动生成 JWT 密钥

**涉及文件**：
- .env.example
- README.md
- backend/Dockerfile
- backend/api/admin_handler.go
- backend/api/auth_handler.go
- backend/api/controller/apikey_controller.go
- backend/api/controller/auth_controller.go
- backend/api/controller/user_apikey_controller.go
- backend/api/filter.go
- backend/api/handler.go
- backend/api/middleware.go
- backend/api/middleware/admin_auth.go
- backend/api/middleware/jwt_auth.go
- backend/api/refresh_token_handler.go
- backend/api/router.go
- backend/config/config.go
- backend/config/custom_plugins.go
- backend/coverage.out
- backend/database/connection.go
- backend/database/json_migrator.go
- backend/database/migration.go
- backend/database/migration_test_manual.go
- backend/database/seed.go
- backend/go.mod
- backend/go.sum
- backend/main.go
- backend/model/apikey.go
- backend/model/plugin_result.go
- backend/model/refresh_token.go
- backend/model/request.go
- backend/model/response.go
- backend/model/user.go
- backend/plugin/baseasyncplugin.go
- backend/plugin/cyg/cyg.go
- backend/plugin/duoduo/duoduo.go
- backend/plugin/fox4k/fox4k.go
- backend/plugin/hdr4k/hdr4k.go
- backend/plugin/huban/huban.go
- backend/plugin/hunhepan/hunhepan.go
- backend/plugin/jikepan/jikepan.go
- backend/plugin/labi/labi.go
- backend/plugin/muou/muou.go
- backend/plugin/ouge/ouge.go
- backend/plugin/pan666/pan666.go
- backend/plugin/pansearch/pansearch.go
- backend/plugin/panta/panta.go
- backend/plugin/panyq/panyq.go
- backend/plugin/plugin.go
- backend/plugin/qupansou/qupansou.go
- backend/plugin/shandian/shandian.go
- backend/plugin/susu/susu.go
- backend/plugin/thepiratebay/thepiratebay.go
- backend/plugin/wanou/wanou.go
- backend/plugin/xuexizhinan/xuexizhinan.go
- backend/plugin/zhizhen/zhizhen.go
- backend/service/apikey_service.go
- backend/service/auth_service.go
- backend/service/cache_integration.go
- backend/service/search_service.go
- backend/unisearch
- backend/util/cache/adaptive_tuning_engine.go
- backend/util/cache/advanced_data_merger.go
- backend/util/cache/buffer_status_monitor.go
- backend/util/cache/cache_key.go
- backend/util/cache/delayed_batch_write_manager.go
- backend/util/cache/disk_cache.go
- backend/util/cache/enhanced_two_level_cache.go
- backend/util/cache/global_buffer_manager.go
- backend/util/cache/memory_cache.go
- backend/util/cache/metric_collector.go
- backend/util/cache/performance_analyzer.go
- backend/util/cache/predictive_model.go
- backend/util/cache/search_pattern_analyzer.go
- backend/util/cache/serializer.go
- backend/util/cache/sharded_disk_cache.go
- backend/util/cache/sharded_memory_cache.go
- backend/util/cache/tuning_strategy.go
- backend/util/cache/utils.go
- backend/util/compression.go
- backend/util/convert.go
- backend/util/crypto.go
- backend/util/http_util.go
- backend/util/json/json.go
- backend/util/jwt.go
- backend/util/keygen.go
- backend/util/parser_util.go
- backend/util/pool/object_pool.go
- backend/util/pool/worker_pool.go
- backend/util/regex_util.go
- deploy/README.md
- deploy/docker-compose.prod.yml
- deploy/env.prod
- docker-compose.yml
- docs/api_reference.md
- frontend/src/App.tsx
- frontend/src/components/Navbar.tsx
- frontend/src/components/SearchBox.tsx
- frontend/src/components/admin/ApiKeyTableRow.tsx
- frontend/src/components/admin/BatchActionsBar.tsx
- frontend/src/components/admin/ModernApiKeyTable.tsx
- frontend/src/components/admin/TableFilterDropdown.tsx
- frontend/src/lib/api.ts
- frontend/src/pages/Admin.tsx
- frontend/src/pages/AdminLogin.tsx
- frontend/src/pages/Login.tsx
- frontend/src/pages/UserApiKeySettings.tsx
- frontend/src/pages/UserAuth.tsx
- frontend/src/services/authService.ts
- frontend/src/stores/authStore.ts
- frontend/src/stores/searchStore.ts
- frontend/src/types/api.ts
- scripts/build.sh
- scripts/deploy.sh
- scripts/docker.sh
- scripts/gen_admin_password.sh
- scripts/local.sh
- scripts/sync-config.sh

---

---

## [2026-01-19 14:41] feat(admin): 新增完整的用户管理功能模块

**Body**: 实现了管理员用户管理的完整功能，包括用户的增删改查、批量操作、角色管理和密码重置。后端新增用户管理接口和参数验证中间件，前端实现了用户表格、对话框组件和服务层，完善了 API 文档。

**Footer**: 无

**Files**:
- .gitignore
- backend/api/controller/auth_controller.go
- backend/api/router.go
- backend/api/user_handler.go
- backend/api/validation_middleware.go
- backend/main.go
- backend/model/user.go
- backend/service/auth_service.go
- backend/service/user_service.go
- backend/unisearch
- docs/api_reference.md
- frontend/package.json
- frontend/pnpm-lock.yaml
- frontend/src/components/admin/BatchDeleteDialog.tsx
- frontend/src/components/admin/BatchDeleteKeysDialog.tsx
- frontend/src/components/admin/BatchUpdateRoleDialog.tsx
- frontend/src/components/admin/CreateUserDialog.tsx
- frontend/src/components/admin/EditUserDialog.tsx
- frontend/src/components/admin/ResetPasswordDialog.tsx
- frontend/src/components/admin/Sidebar.tsx
- frontend/src/components/admin/UserTable.tsx
- frontend/src/components/admin/UserTableRow.tsx
- frontend/src/components/ui/scroll-area.tsx
- frontend/src/pages/Admin.tsx
- frontend/src/services/userService.ts
- frontend/src/types/api.ts

## [2026-01-19 16:53] fix(config): 修复本地和 Docker 环境配置自动检测与错误消息处理

**Body**: 修复了本地和 Docker 环境启动脚本中的数据库主机配置自动检测和修正逻辑，确保本地环境使用 localhost，Docker 环境使用 mysql。同时优化了前端 API 错误处理，优先使用后端返回的错误消息。

**Files**:
- docker-compose.yml
- frontend/src/lib/api.ts
- scripts/docker.sh
- scripts/local.sh


---

## [2026-01-29 15:30] docs(admin): 完善系统设置和管理后台文档

**Body**: 新增管理后台使用指南文档,详细说明系统设置、用户管理、API Key 管理等功能的使用方法。更新 README.md 添加管理后台功能特性说明和文档链接。完善 Apple UI 组件库需求文档的验收标准。

**Footer**: 
- 新增文档: docs/admin_guide.md - 管理后台完整使用指南
- 更新文档: README.md - 添加管理后台功能模块说明
- 更新文档: .kiro/specs/apple-ui-components/requirements.md - 标记文档验收标准为已完成

**Files**:
- README.md
- docs/admin_guide.md
- .kiro/specs/apple-ui-components/requirements.md
- frontend/src/pages/Admin.tsx

**功能说明**:
- 📚 新增管理后台使用指南,包含所有功能模块的详细操作说明
- 🛡️ 完善系统设置功能文档,说明用户认证开关的使用场景
- 📝 更新 README.md,添加管理后台功能特性和文档链接
- ✅ 标记 Apple UI 组件库文档验收标准为已完成

**文档内容**:
1. **管理后台使用指南** (`docs/admin_guide.md`):
   - 系统信息查看
   - API Key 管理（生成、编辑、批量操作）
   - 用户管理（创建、编辑、批量操作）
   - 系统设置（用户认证开关）
   - 统计数据展示
   - 搜索和筛选功能
   - 响应式设计说明
   - 安全建议和常见问题

2. **README.md 更新**:
   - 新增"管理后台"功能模块章节
   - 详细说明用户管理、API Key 管理、系统设置、系统监控功能
   - 添加管理后台使用指南文档链接

3. **需求文档更新**:
   - 标记管理后台使用指南已创建
   - 标记系统设置功能文档已完善
   - 更新验收标准为已完成状态


[2026-01-29 13:25] feat(system-settings): 新增系统设置功能并重构 UI 组件为 Apple 风格
  - Body: 新增系统设置功能，支持动态控制用户认证、登录、注册开关；重构前端 UI 组件为 Apple 风格（AppleButton、AppleCard、AppleInput、AppleTable 系列），提升视觉一致性和用户体验；移除前端调试日志，优化代码质量。
  - Files:
    - README.md
    - backend/api/middleware.go
    - backend/api/router.go
    - backend/api/system_settings_handler.go
    - backend/database/migration.go
    - backend/database/migration_test_manual.go
    - backend/main.go
    - backend/model/system_settings.go
    - backend/service/system_settings_service.go
    - backend/unisearch
    - docs/api_reference.md
    - docs/readme_2601.md
    - docs/系统开发设计文档.md
    - frontend/package.json
    - frontend/pnpm-lock.yaml
    - frontend/src/App.tsx
    - frontend/src/components/AppleTable.tsx
    - frontend/src/components/admin/ApiKeyTableRow.tsx
    - frontend/src/components/admin/AppleApiKeyTable.tsx
    - frontend/src/components/admin/ApplePluginTable.tsx
    - frontend/src/components/admin/AppleUserTable.tsx
    - frontend/src/components/admin/BatchCreateDialog.tsx
    - frontend/src/components/admin/BatchExtendDialog.tsx
    - frontend/src/components/admin/CreateUserDialog.tsx
    - frontend/src/components/admin/EditKeyDialog.tsx
    - frontend/src/components/admin/EditUserDialog.tsx
    - frontend/src/components/admin/ModernApiKeyTable.tsx
    - frontend/src/components/admin/Sidebar.tsx
    - frontend/src/components/admin/StatsCard.tsx
    - frontend/src/components/admin/SystemInfoView.tsx
    - frontend/src/components/admin/SystemSettingsView.tsx
    - frontend/src/components/admin/UserTable.tsx
    - frontend/src/components/admin/UserTableRow.tsx
    - frontend/src/components/ui/AppleButton.tsx
    - frontend/src/components/ui/AppleCard.tsx
    - frontend/src/components/ui/AppleInput.tsx
    - frontend/src/components/ui/button.tsx
    - frontend/src/components/ui/input.tsx
    - frontend/src/hooks/useAutoRefreshToken.ts
    - frontend/src/lib/api.ts
    - frontend/src/pages/Admin.tsx
    - frontend/src/pages/UserApiKeySettings.tsx
    - frontend/src/pages/UserAuth.tsx
    - frontend/src/services/systemSettingsService.ts


---

## [2026-01-29 16:00] feat(user): 优化用户 API Key 设置页面 UI 为 Apple 风格

**Body**: 重构用户 API Key 设置页面，采用 Apple 风格设计语言，提升视觉体验和交互友好度。主要改进包括：使用渐变背景和毛玻璃效果卡片；优化表单布局和输入框样式（圆角、阴影、过渡动画）；改进状态显示（有效/失效）的视觉呈现；添加解绑确认对话框，替换原生 confirm；优化日期格式显示（YYYY/MM/DD）；统一按钮和交互元素的 Apple 风格；修正 API 文档中的参数名（api_key -> key）。

**Footer**: 无

**Files**:
- docs/api_reference.md
- frontend/src/pages/UserApiKeySettings.tsx

[2026-01-29 23:14] fix(docker): 修正数据库名称从 pansou 改为 unisearch
  - Body: 将 Dockerfile 中的默认数据库名称从 pansou 更正为 unisearch，确保与项目名称保持一致。
  - Files:
    - backend/Dockerfile
