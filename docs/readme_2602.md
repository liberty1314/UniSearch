# UniSearch 开发日志 - 2026年2月

---

## 2026-02-02 00:06:28

**Commit**: `docs(deploy): 完善部署脚本和插件开发文档`

**改动说明**:
- 将文档中的 PanSou 品牌名称统一更新为 UniSearch
- 重构 build.sh 脚本，新增交互式菜单和多架构构建支持
- 优化 deploy.sh 脚本，新增数据库密码配置和连接验证功能
- 支持 linux/amd64 和 linux/arm64 双架构镜像构建
- 新增本地测试环境自动化流程

**涉及文件**:
- Dockerfile
- README.md
- backend/Dockerfile
- docs/插件开发指南.md
- scripts/build.sh
- scripts/deploy.sh
- deploy/README.md
- deploy/docker-compose.prod.yml
- deploy/env.prod

---

## 2026-02-03 17:30:00

**Commit**: `feat(ui): 重构系统缓存并优化前端界面`

**改动说明**:
- 前端：为 AppleCard、AppleTable 等组件新增暗黑模式样式适配
- 前端：统一登录成功提示信息为"登录成功，欢迎访问 UniSearch！"
- 前端：新增 API Key 的 is_permanent 和 is_unlimited 字段类型定义
- 后端：新增高级缓存系统（自适应调优、预测模型、性能分析等模块）
- 后端：新增缓存集成服务 cache_integration.go
- 后端：新增 refresh_token 和 secret 数据模型及相关服务
- 部署：删除旧的 deploy.sh 脚本，新增部署文档和 Docker Compose 配置
- 配置：更新环境变量示例和 .gitignore 规则

**涉及文件**:
- frontend/src/components/ui/AppleCard.tsx
- frontend/src/components/AppleTable.tsx
- frontend/src/components/admin/AppleApiKeyTable.tsx
- frontend/src/pages/AdminLogin.tsx
- frontend/src/pages/UserAuth.tsx
- frontend/src/types/api.ts
- backend/util/cache/* (多个新增缓存模块)
- backend/service/cache_integration.go
- backend/model/refresh_token.go
- backend/model/secret.go
- backend/service/refresh_token_service.go
- backend/service/secret_manager*.go
- deploy/* (新增部署配置)
- scripts/deploy.sh (删除)
- .env.example, .gitignore

## 2026-02-05 20:00:20

**Commit**: `feat(deploy): 完善生产环境部署脚本并优化系统设置服务`

**改动说明**:
- 新增 deploy.sh 生产环境部署脚本，支持完整的部署流程（环境检查、SSL 配置、Docker Compose 生成、服务编排、健康检查等）
- 优化 build.sh 构建脚本，增强错误处理和日志输出
- 修复 systemSettingsService.ts 中的类型定义和 API 调用逻辑

**涉及文件**:
- scripts/deploy.sh (新增)
- scripts/build.sh (修改)
- frontend/src/services/systemSettingsService.ts (修改)


## 2026-02-06 11:01:10

**Commit**: `refactor(scripts): 整合部署脚本并移除独立的监控和SSL管理脚本`

**改动说明**:
- 将原本分散的 monitor.sh 和 ssl.sh 功能整合到统一的 deploy.sh 部署脚本中，简化运维流程
- 更新了 Nginx 配置文件以适配新的部署架构
- 删除独立的监控服务管理脚本（monitor.sh）
- 删除独立的 SSL 证书管理脚本（ssl.sh）

**涉及文件**:
- deploy/nginx/nginx.conf (修改)
- scripts/deploy.sh (修改)
- scripts/monitor.sh (删除)
- scripts/ssl.sh (删除)

---

## 2026-02-08 16:27:45

**Commit**: `refactor(admin): 简化 API Key 创建和批量操作对话框`

**改动说明**:
简化前端 API Key 管理界面，移除单个创建对话框中的批量生成功能，优化批量删除流程，并为批量创建对话框新增自定义复制格式功能。

**主要改动**:
1. **CreateKeyDialog**: 移除批量生成 Tab，专注于单个 Key 创建
2. **BatchDeleteKeysDialog**: 简化删除流程，移除结果展示对话框，直接使用 toast 提示
3. **BatchCreateDialog**: 新增自定义复制格式功能，支持 `{key}` 占位符
4. **PageLoader**: 优化 Logo 显示，使用图片替代渐变背景
5. **API 文档**: 更新批量操作接口文档，调整返回字段说明

**涉及文件**:
- backend/api/admin_handler.go
- docs/api_reference.md
- frontend/src/components/CreateKeyDialog.tsx
- frontend/src/components/PageLoader.tsx
- frontend/src/components/admin/BatchCreateDialog.tsx
- frontend/src/components/admin/BatchDeleteKeysDialog.tsx

---

## 2026-02-11 00:22:14

**Commit**: `refactor(api): 统一前端 API 响应处理并完善类型文档`

**类型**: refactor  
**范围**: api

### 改动说明

移除前端 API 客户端中的手动响应包装逻辑，统一由响应拦截器自动解包 data 字段。简化所有 Service 层方法的返回值处理，直接返回业务数据对象。为 API 类型定义添加详细的 JSDoc 注释，说明响应格式和数据结构。

### 主要变更

- **frontend/src/lib/api.ts**: 移除 POST/PUT/PATCH/DELETE 方法中的手动包装逻辑，统一返回类型为泛型 T
- **frontend/src/services/authService.ts**: 简化所有方法的响应处理，移除 `response.data` 访问，直接返回响应对象
- **frontend/src/services/searchService.ts**: 统一响应处理逻辑
- **frontend/src/services/userService.ts**: 统一响应处理逻辑
- **frontend/src/types/api.ts**: 
  - 为所有 API 类型添加详细的 JSDoc 注释
  - 新增 `APIKeyInfoResponse` 类型定义
  - 完善 `ApiResponse`、`RegisterResponse`、`LoginResponse` 等类型的文档说明
- **backend**: Controller 架构重构、中间件优化、数据库迁移等后端改进
- **清理**: 删除项目根目录的临时文件（gen_hash.go, package.json, pnpm-lock.yaml）

### 影响的文件

```
.gitignore
backend/api/controller/apikey_controller.go
backend/api/controller/auth_controller.go
backend/api/controller/user_apikey_controller.go
backend/api/filter.go
backend/api/handler.go
backend/api/middleware.go
backend/api/middleware/admin_auth.go
backend/api/middleware/deprecated.go
backend/api/middleware/jwt_auth.go
backend/api/refresh_token_handler.go
backend/api/router.go
backend/api/user_handler.go
backend/api/validation_middleware.go
backend/config/config.go
backend/coverage.out
backend/database/connection.go
backend/database/json_migrator.go
backend/database/migration.go
backend/go.mod
backend/go.sum
backend/main.go
backend/model/apikey.go
backend/model/refresh_token.go
backend/model/secret.go
backend/model/system_settings.go
backend/plugin/duoduo/duoduo.go
backend/plugin/jikepan/jikepan.go
backend/plugin/labi/labi.go
backend/plugin/muou/muou.go
backend/plugin/pansearch/pansearch.go
backend/plugin/panta/panta.go
backend/plugin/panyq/panyq.go
backend/plugin/shandian/shandian.go
backend/service/apikey_service.go
backend/service/auth_service.go
backend/service/search_service.go
backend/service/secret_manager.go
backend/service/secret_manager_db.go
backend/service/secret_manager_env.go
backend/service/system_settings_service.go
backend/service/user_service.go
backend/unisearch
backend/util/cache/redis_cache.go
backend/util/jwt.go
backend/util/keygen.go
docs/api_reference.md
frontend/.vite/deps/chunk-3W6WHVWM.js
frontend/src/components/magicui/cool-mode.tsx
frontend/src/hooks/useAutoRefreshToken.ts
frontend/src/lib/api.ts
frontend/src/services/authService.ts
frontend/src/services/searchService.ts
frontend/src/services/userService.ts
frontend/src/types/api.ts
gen_hash.go (已删除)
package.json (已删除)
pnpm-lock.yaml (已删除)
```

**总计**: 56 个文件变更

### 技术要点

1. **响应拦截器统一处理**: 所有 API 响应由 axios 响应拦截器自动解包 `data` 字段
2. **类型安全**: Service 层方法直接返回业务数据类型，无需手动类型断言
3. **文档完善**: 为所有 API 类型添加详细的 JSDoc 注释，提升代码可维护性
4. **代码简化**: 移除冗余的响应包装逻辑，减少代码行数约 100+ 行


---
**时间**: 2026-02-12 (周四)
**Commit**: `feat(admin): 新增 Apple 风格分页组件并应用到管理页面`

**Body**: 创建可复用的 ApplePagination 组件,提供简洁优雅的分页交互体验,支持自定义每页显示数量和流畅动画效果。在管理页面的 API Key 和用户管理模块中应用该组件,替换原有的内联分页实现,提升代码复用性和用户体验。

**Files**:
- frontend/src/components/admin/ApplePagination.tsx (新增)
- frontend/src/pages/Admin.tsx (修改)


---

## 2026-02-13 15:30

**Commit**: `feat(apikey): 优化 API Key 激活逻辑并完善用户绑定功能`

**详细说明**:

1. 后端优化:
   - 统一使用 ActivateIfNeeded() 方法处理 API Key 首次激活逻辑
   - 修复 API Key 登录用户无法绑定的问题（user_id = 0 时返回 400）
   - 在 JWT 中间件中传递 api_key 到上下文，支持 API Key 登录用户查询自己的信息
   - 增强 GetAPIKey 接口的日志输出，便于调试

2. 前端优化:
   - 在管理页面和批量创建对话框中显示"待激活"状态（first_used_at 为空时）
   - 优化状态图标的样式，添加 flex-shrink-0 防止图标被压缩
   - 修复 UserApiKeySettings 页面的 API 调用逻辑，正确处理 apiClient 自动解包的响应

3. 文档更新:
   - 完善 API Key 激活机制的说明文档
   - 新增用户 API Key 管理 API 文档（绑定/查询/解绑）
   - 详细说明 API Key 登录用户的限制和业务场景

**涉及文件**:
- backend/api/controller/user_apikey_controller.go
- backend/api/middleware/jwt_auth.go
- backend/service/apikey_service.go
- docs/api_reference.md
- frontend/src/components/admin/AppleApiKeyTable.refactored.example.tsx
- frontend/src/components/admin/AppleApiKeyTable.tsx
- frontend/src/components/admin/BatchCreateDialog.tsx
- frontend/src/components/admin/EditKeyDialog.tsx
- frontend/src/pages/UserApiKeySettings.tsx


---

## 2026-02-13 16:45

**Commit**: `feat(admin): 新增 API Key 批量导出功能并优化全选逻辑`

**详细说明**:

1. 新增批量导出功能:
   - 创建 BatchExportDialog 组件，支持批量导出选中的 API Key
   - 支持自定义复制格式，使用 {key} 作为占位符（例如：卡密：{key}，网址：https://unisearchso.xyz/）
   - 支持一键复制全部 API Key（可选择是否应用自定义格式）
   - 支持导出为 CSV 文件，包含 API Key、描述、创建时间、过期时间、状态、每日限额等信息
   - 在 BatchActionsBar 中新增"批量导出"按钮

2. 优化全选逻辑:
   - 修改全选逻辑，仅选择非永久密钥的 API Key（排除管理员永久密钥）
   - 在 AppleApiKeyTable 的表头新增全选复选框
   - AppleTable 组件支持 ReactNode 类型的列标题，以支持复选框等复杂组件
   - 全选复选框会根据可选择的 Key 数量自动判断是否全选状态

3. 代码优化:
   - 新增 BatchActionsBar.refactored.example.tsx 作为重构示例（展示更优雅的实现方式）
   - 优化批量操作按钮的样式和交互体验

**涉及文件**:
- frontend/src/components/AppleTable.tsx
- frontend/src/components/admin/AppleApiKeyTable.tsx
- frontend/src/components/admin/BatchActionsBar.refactored.example.tsx (新增)
- frontend/src/components/admin/BatchActionsBar.tsx
- frontend/src/components/admin/BatchExportDialog.tsx (新增)
- frontend/src/pages/Admin.tsx


---

## 2026-02-14 22:34:17

**Commit**: `feat(announcement): 新增公告管理功能并完善前后端交互`

**详细说明**:

实现完整的公告管理系统，包括后端 CRUD 接口、数据库迁移、前端管理界面和用户端展示组件。支持公告优先级、生效时间控制、HTML 内容渲染和已读状态本地存储。新增系统设置中的公告功能开关，优化用户体验。

**主要功能**:

1. 后端实现:
   - 新增 announcement_handler.go，提供公告的增删改查接口
   - 新增 announcement_service.go，实现公告业务逻辑（包括有效公告筛选、优先级排序）
   - 新增 announcement.go 数据模型，支持优先级、生效时间、失效时间、启用状态等字段
   - 在 system_settings.go 中新增公告功能开关（announcement_enabled）
   - 数据库迁移脚本自动创建 announcements 表和系统设置默认值
   - 路由注册公告管理接口（需管理员权限）和用户端接口（需登录认证）

2. 前端管理界面:
   - 新增 AnnouncementManagement.tsx，提供公告列表、创建、编辑、删除功能
   - 支持公告优先级设置（高/中/低）
   - 支持生效时间和失效时间配置（失效时间可选，留空表示永久有效）
   - 支持 HTML 内容编辑和预览
   - 支持启用/禁用公告状态切换
   - 在管理侧边栏新增"公告管理"菜单项

3. 前端用户端展示:
   - 新增 AnnouncementProvider.tsx，全局管理公告状态和已读记录
   - 新增 AnnouncementDialog.tsx，弹窗展示有效公告
   - 新增 AnnouncementPanel.tsx，导航栏公告面板（支持点击外部关闭、ESC 键关闭）
   - 在 Navbar 中新增公告图标和未读数量徽章
   - 支持"不再提示"功能，已读状态存储在 localStorage
   - 支持 HTML 内容渲染（使用 dangerouslySetInnerHTML）

4. 状态管理:
   - 新增 announcementStore.ts，使用 Zustand 管理公告列表、已读状态、功能开关
   - 新增 announcementService.ts，封装公告相关 API 调用
   - 在 api.ts 中新增公告相关类型定义（Announcement、CreateAnnouncementRequest 等）

5. 工具函数和 Hooks:
   - 新增 useClickOutside.ts，检测点击外部区域
   - 新增 useEscapeKey.ts，检测 ESC 键按下
   - 新增 text.ts，提供文本处理工具函数（移除 HTML 标签、截断文本、高亮关键词）

6. 样式优化:
   - 在 index.css 中新增 userMenuFadeIn 动画，优化公告面板的展开效果

**涉及文件**:
- backend/api/announcement_handler.go (新增)
- backend/api/router.go (修改)
- backend/database/migration.go (修改)
- backend/main.go (修改)
- backend/model/announcement.go (新增)
- backend/model/system_settings.go (修改)
- backend/service/announcement_service.go (新增)
- backend/service/system_settings_service.go (修改)
- docs/api_reference.md (修改)
- frontend/package.json (修改)
- frontend/pnpm-lock.yaml (修改)
- frontend/src/App.tsx (修改)
- frontend/src/components/AnnouncementDialog.tsx (新增)
- frontend/src/components/AnnouncementPanel.tsx (新增)
- frontend/src/components/AnnouncementProvider.refactored.example.tsx (新增)
- frontend/src/components/AnnouncementProvider.tsx (新增)
- frontend/src/components/Navbar.tsx (修改)
- frontend/src/components/admin/AnnouncementManagement.tsx (新增)
- frontend/src/components/admin/Sidebar.tsx (修改)
- frontend/src/hooks/useClickOutside.ts (新增)
- frontend/src/hooks/useEscapeKey.ts (新增)
- frontend/src/index.css (修改)
- frontend/src/pages/Admin.tsx (修改)
- frontend/src/services/announcementService.ts (新增)
- frontend/src/stores/announcementStore.ts (新增)
- frontend/src/types/api.ts (修改)
- frontend/src/utils/text.ts (新增)


---

## 2026-02-15 00:12:47

**Commit**: `refactor(admin): 优化管理界面响应式布局并新增移动端适配`

**详细说明**:

重构管理页面的响应式布局，优化移动端用户体验。新增 adminStore 管理侧边栏状态，优化 API Key 和用户管理表格的移动端卡片渲染，调整批量操作按钮和分页组件的响应式显示。修复代码格式问题，提升整体 UI 一致性。

**主要改动**:

1. 状态管理优化:
   - 新增 adminStore.ts，使用 Zustand 管理移动端侧边栏状态
   - 移除 Admin.tsx 中的本地侧边栏状态，统一使用 store 管理
   - Sidebar 组件改用 store 状态，支持全局控制

2. 移动端适配:
   - AppleApiKeyTable 新增 renderMobileItem 方法，提供移动端卡片布局
   - AppleUserTable 新增 renderMobileItem 方法，优化移动端用户信息展示
   - 移动端卡片包含完整的操作按钮（编辑、删除、状态切换等）
   - 优化移动端的信息层级和视觉呈现

3. 响应式布局优化:
   - Admin.tsx 中的 CardHeader 改用 flex-col 布局，移动端垂直排列
   - BatchActionsBar 按钮文字在小屏幕隐藏，仅显示图标
   - ApplePagination 在移动端隐藏显示信息和每页数量选择
   - StatsCard 调整内边距和字体大小，适配小屏幕
   - SystemInfoView 中的长文本添加 break-all 防止溢出

4. 侧边栏优化:
   - 移动端侧边栏从顶部导航栏下方开始（top-20），避免遮挡导航栏
   - 侧边栏高度调整为 calc(100vh-6rem)，适配移动端布局
   - 新增圆角和阴影效果（rounded-r-3xl shadow-2xl）

5. 代码格式修复:
   - 统一代码缩进和换行格式
   - 修复 AnnouncementManagement 中的 className 格式
   - 优化 AppleUserTable 和 AppleApiKeyTable 的代码结构

**涉及文件**:
- frontend/src/components/AnnouncementDialog.tsx (格式修复)
- frontend/src/components/AnnouncementPanel.tsx (格式修复)
- frontend/src/components/AppleTable.tsx (格式修复)
- frontend/src/components/Navbar.tsx (格式修复)
- frontend/src/components/admin/AdminLayout.tsx (格式修复)
- frontend/src/components/admin/AnnouncementManagement.tsx (格式修复)
- frontend/src/components/admin/AppleApiKeyTable.tsx (新增移动端渲染)
- frontend/src/components/admin/ApplePagination.tsx (响应式优化)
- frontend/src/components/admin/AppleUserTable.tsx (新增移动端渲染)
- frontend/src/components/admin/BatchActionsBar.tsx (响应式优化)
- frontend/src/components/admin/Sidebar.tsx (状态管理重构)
- frontend/src/components/admin/StatsCard.tsx (响应式优化)
- frontend/src/components/admin/SystemInfoView.tsx (文本溢出修复)
- frontend/src/pages/Admin.tsx (布局优化)
- frontend/src/stores/adminStore.ts (新增)
