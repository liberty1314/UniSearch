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


---

## 2026-02-15 09:51:15

**Commit**: `refactor(frontend): 移除 styled-components 依赖并新增 Vitest 测试环境`

**详细说明**:

重构 BubbleLoader 组件，使用 Framer Motion 和 Tailwind CSS 替代 styled-components，减少依赖体积。删除示例文件 AnnouncementProvider.refactored.example.tsx。新增 Vitest 测试环境配置，支持 jsdom 和 @testing-library/react，为前端单元测试奠定基础。更新 Dockerfile 以优化构建流程。

**主要改动**:

1. 依赖优化:
   - 从 package.json 中移除 styled-components 依赖
   - 新增 Vitest 相关依赖：@testing-library/jest-dom、@testing-library/react、jsdom、vitest
   - 更新 pnpm-lock.yaml，移除 styled-components 相关包

2. BubbleLoader 组件重构:
   - 移除 styled-components，改用 Framer Motion 的 motion 组件
   - 使用 Tailwind CSS 类名替代 CSS-in-JS
   - 使用 motion.div 的 variants 和 animate 属性实现动画
   - 保持原有的视觉效果和动画逻辑
   - 优化代码结构，提升可维护性

3. 测试环境配置:
   - 新增 vite.config.ts 中的 test 配置块
   - 配置 jsdom 环境模拟浏览器 DOM
   - 启用 globals 模式，支持全局测试 API（describe、it、expect 等）
   - 新增 src/test/setup.ts 作为测试初始化文件
   - 导入 @testing-library/jest-dom 提供额外的 DOM 断言方法

4. 测试文件:
   - 新增 src/components/__tests__/Env.test.tsx 作为测试环境验证
   - 包含基础的 truthy 测试和 jsdom 环境测试
   - 验证 @testing-library/react 和 jest-dom 的集成

5. Dockerfile 优化:
   - 更新根目录 Dockerfile 和 backend/Dockerfile
   - 优化构建流程和依赖安装

6. 清理:
   - 删除 AnnouncementProvider.refactored.example.tsx 示例文件
   - 更新 .gitignore 规则

**技术要点**:

- Framer Motion 提供更强大的动画能力和更好的性能
- Tailwind CSS 减少运行时 CSS-in-JS 的性能开销
- Vitest 提供快速的单元测试执行和 Vite 原生集成
- jsdom 提供完整的浏览器 DOM 模拟环境

**涉及文件**:
- .gitignore (修改)
- Dockerfile (修改)
- backend/Dockerfile (修改)
- frontend/package.json (修改)
- frontend/pnpm-lock.yaml (修改)
- frontend/src/components/AnnouncementProvider.refactored.example.tsx (删除)
- frontend/src/components/BubbleLoader.tsx (重构)
- frontend/src/components/__tests__/Env.test.tsx (新增)
- frontend/src/test/setup.ts (新增)
- frontend/vite.config.ts (修改)


---

## 2026-02-15 10:32:46

**Commit**: `feat(frontend): 新增移动端菜单组件并优化响应式导航栏`

**详细说明**:

新增 MobileMenu 组件，提供移动端友好的导航菜单。重构 Navbar 组件，优化移动端布局和交互体验。调整 SearchBox 和 SearchResults 的响应式样式，优化 Home 页面的移动端适配。更新 Tailwind 配置，新增移动端相关的 CSS 动画和样式。

**主要改动**:

1. 新增 MobileMenu 组件:
   - 创建独立的移动端菜单组件，支持滑入/滑出动画
   - 使用 Framer Motion 实现流畅的过渡效果
   - 支持用户登录状态显示和快捷操作
   - 提供导航链接（首页、管理后台、用户设置等）
   - 支持点击外部区域或 ESC 键关闭菜单

2. Navbar 组件优化:
   - 重构移动端布局，新增汉堡菜单按钮
   - 优化桌面端和移动端的显示逻辑
   - 调整公告图标和用户菜单的响应式显示
   - 优化导航栏的间距和对齐方式

3. SearchBox 和 SearchResults 优化:
   - 调整移动端的输入框和按钮样式
   - 优化搜索结果的卡片布局和间距
   - 改进响应式断点和显示效果

4. Home 页面优化:
   - 调整移动端的页面布局和内边距
   - 优化搜索框容器的响应式样式
   - 改进页面整体的移动端体验

5. Tailwind 配置更新:
   - 重新组织配置文件结构
   - 新增移动端相关的动画和过渡效果
   - 优化主题配置和扩展设置

6. CSS 样式新增:
   - 新增移动端菜单的滑入动画（mobileMenuSlideIn）
   - 添加相关的动画关键帧定义

**涉及文件**:
- frontend/src/App.tsx (修改)
- frontend/src/components/MobileMenu.tsx (新增)
- frontend/src/components/Navbar.tsx (修改)
- frontend/src/components/SearchBox.tsx (修改)
- frontend/src/components/SearchResults.tsx (修改)
- frontend/src/index.css (修改)
- frontend/src/pages/Home.tsx (修改)
- frontend/tailwind.config.js (修改)


---

## 2026-02-15 15:25:45

**Commit**: `refactor(frontend): 重构用户认证页面并优化全局 UI 体验`

**详细说明**:

拆分 UserAuth 页面为独立的登录、注册和 API Key 登录页面，优化代码结构和用户体验。重构 Navbar、PageLoader 等核心组件，统一使用 Framer Motion 动画。新增 animated-theme-toggler 组件，优化暗黑模式切换体验。更新全局样式和 Tailwind 配置，提升整体 UI 一致性和流畅度。

**主要改动**:

1. 用户认证页面重构:
   - 拆分 UserAuth.tsx 为三个独立页面：LoginPage.tsx、RegisterPage.tsx、ApiKeyLoginPage.tsx
   - 每个页面独立管理状态和逻辑，提升代码可维护性
   - 优化表单布局和交互体验
   - 统一错误提示和加载状态处理
   - 改进响应式设计，优化移动端体验

2. 核心组件优化:
   - Navbar: 重构布局和样式，优化移动端菜单交互
   - PageLoader: 简化加载动画，使用 Framer Motion 替代复杂的 CSS 动画
   - AnimatedButton: 优化按钮动画效果
   - AnnouncementDialog/Panel: 调整样式和动画
   - BubbleLoader: 微调动画参数
   - LoadingSpinner: 优化加载指示器
   - PageTransition: 统一页面过渡动画

3. 新增组件:
   - animated-theme-toggler.tsx: 创意暗黑模式切换器，支持流畅的主题切换动画
   - 提供视觉反馈和交互体验

4. 管理后台优化:
   - Sidebar: 优化侧边栏样式和响应式布局
   - StatsCard: 调整卡片样式和动画
   - SystemInfoView: 微调信息展示
   - Admin: 优化整体布局
   - AdminLogin: 改进登录页面样式

5. 其他页面优化:
   - Home: 重构首页布局，优化搜索框和结果展示
   - UserApiKeySettings: 优化 API Key 设置页面的布局和交互
   - SearchBox: 调整搜索框样式

6. 全局样式更新:
   - index.css: 新增多个动画关键帧和工具类
   - 优化暗黑模式样式
   - 新增渐变和过渡效果
   - 改进滚动条样式

7. Tailwind 配置优化:
   - 新增自定义动画配置
   - 扩展颜色和间距系统
   - 优化主题配置

8. 配置文件更新:
   - components.json: 更新 shadcn/ui 配置
   - dialog.tsx: 优化对话框组件

**技术要点**:

- 页面拆分提升代码可维护性和复用性
- 统一使用 Framer Motion 实现流畅动画
- 优化响应式设计，提升移动端体验
- 改进暗黑模式支持和主题切换体验
- 统一组件样式和交互规范

**涉及文件**:
- frontend/components.json (修改)
- frontend/src/App.tsx (修改)
- frontend/src/components/AnimatedButton.tsx (修改)
- frontend/src/components/AnnouncementDialog.tsx (修改)
- frontend/src/components/AnnouncementPanel.tsx (修改)
- frontend/src/components/BubbleLoader.tsx (修改)
- frontend/src/components/LoadingSpinner.tsx (修改)
- frontend/src/components/MobileMenu.tsx (修改)
- frontend/src/components/Navbar.tsx (修改)
- frontend/src/components/PageLoader.tsx (修改)
- frontend/src/components/PageTransition.tsx (修改)
- frontend/src/components/SearchBox.tsx (修改)
- frontend/src/components/admin/Sidebar.tsx (修改)
- frontend/src/components/admin/StatsCard.tsx (修改)
- frontend/src/components/admin/SystemInfoView.tsx (修改)
- frontend/src/components/ui/animated-theme-toggler.tsx (新增)
- frontend/src/components/ui/dialog.tsx (修改)
- frontend/src/index.css (修改)
- frontend/src/pages/Admin.tsx (修改)
- frontend/src/pages/AdminLogin.tsx (修改)
- frontend/src/pages/ApiKeyLoginPage.tsx (新增)
- frontend/src/pages/Home.tsx (修改)
- frontend/src/pages/LoginPage.tsx (新增)
- frontend/src/pages/RegisterPage.tsx (新增)
- frontend/src/pages/UserApiKeySettings.tsx (修改)
- frontend/src/pages/UserAuth.tsx (修改)
- frontend/tailwind.config.js (修改)


---

## 2026-02-15 17:34:37

**Commit**: `feat(plugin): 新增 Telegram 频道管理功能并优化插件配置`

**详细说明**:

实现 Telegram 频道管理功能，支持频道的增删改查和启用/禁用操作。新增后端 API 接口和数据库模型，前端新增 ChannelManageDialog 组件。优化插件管理对话框，支持 Telegram 频道配置。更新系统信息视图，展示 Telegram 频道配置状态。完善 API 文档，新增 Telegram 频道管理相关接口说明。

**主要改动**:

1. 后端实现:
   - 新增 tg_channel_handler.go，提供 Telegram 频道的 CRUD 接口
   - 新增 tg_channel_service.go，实现频道业务逻辑
   - 新增 tg_channel.go 数据模型，定义频道数据结构
   - 在 router.go 中注册频道管理路由
   - 在 handler.go 中集成频道处理器
   - 在 migration.go 中添加频道表的数据库迁移
   - 在 config.go 中新增 Telegram 相关配置项

2. 前端管理界面:
   - 新增 ChannelManageDialog.tsx，提供频道管理对话框
   - 支持频道列表展示、创建、编辑、删除操作
   - 支持频道启用/禁用状态切换
   - 优化 PluginManageDialog.tsx，集成频道管理功能
   - 更新 ApplePluginTable.tsx，优化插件表格展示
   - 更新 SystemInfoView.tsx，展示 Telegram 频道配置状态

3. API 文档更新:
   - 新增 Telegram 频道管理接口文档
   - 包含获取频道列表、创建频道、更新频道、删除频道、设置频道状态等接口
   - 详细说明请求参数、返回格式和错误码

4. 类型定义:
   - 在 api.ts 中新增 TelegramChannel 相关类型定义
   - 定义频道数据结构和请求/响应类型

5. 配置文件更新:
   - 更新 .env.example，新增 Telegram 相关配置示例
   - 更新 .gitignore，忽略敏感配置文件

6. 主程序优化:
   - 在 main.go 中初始化 Telegram 频道服务
   - 优化服务启动流程

**功能特性**:

- 支持多个 Telegram 频道配置
- 支持频道的启用/禁用控制
- 支持频道信息的增删改查
- 提供友好的管理界面
- 完善的错误处理和验证

**涉及文件**:
- .env.example (修改)
- .gitignore (修改)
- backend/api/handler.go (修改)
- backend/api/router.go (修改)
- backend/api/tg_channel_handler.go (新增)
- backend/config/config.go (修改)
- backend/database/migration.go (修改)
- backend/main.go (修改)
- backend/model/tg_channel.go (新增)
- backend/service/tg_channel_service.go (新增)
- docs/api_reference.md (修改)
- frontend/src/components/admin/ApplePluginTable.tsx (修改)
- frontend/src/components/admin/ChannelManageDialog.tsx (新增)
- frontend/src/components/admin/PluginManageDialog.tsx (修改)
- frontend/src/components/admin/SystemInfoView.tsx (修改)
- frontend/src/types/api.ts (修改)


---

## 2026-02-17 16:33:34

**Commit**: `refactor(announcement): 优化公告对话框和面板组件代码结构`

**详细说明**:

重构 AnnouncementDialog 和 AnnouncementPanel 组件，优化代码格式和结构。统一缩进和换行风格，提升代码可读性和维护性。

**主要改动**:

1. AnnouncementDialog 组件优化:
   - 统一代码缩进和换行格式
   - 优化 JSX 结构和属性排列
   - 改进代码可读性

2. AnnouncementPanel 组件优化:
   - 统一代码格式和风格
   - 优化组件结构
   - 提升代码一致性

**涉及文件**:
- frontend/src/components/AnnouncementDialog.tsx (修改)
- frontend/src/components/AnnouncementPanel.tsx (修改)


---

## 2026-02-17 20:50:41

**Commit**: `refactor(search): 优化搜索界面和结果展示体验`

**详细说明**:

重构搜索相关组件，优化搜索框、结果展示和云盘类型筛选器的交互体验。改进 Home 页面布局，新增搜索结果的加载动画和空状态提示。优化移动端适配，提升整体用户体验。新增相关 CSS 动画和样式。

**主要改动**:

1. SearchResults 组件重构:
   - 优化搜索结果卡片布局和样式
   - 新增加载动画和骨架屏效果
   - 改进空状态提示和错误处理
   - 优化移动端响应式布局
   - 提升结果展示的视觉效果

2. CloudTypeFilter 组件优化:
   - 重构筛选器布局和交互逻辑
   - 优化选中状态的视觉反馈
   - 改进移动端适配
   - 提升筛选器的易用性

3. SearchBox 组件优化:
   - 调整搜索框样式和布局
   - 优化输入体验和按钮交互
   - 改进响应式设计

4. Home 页面重构:
   - 优化整体布局和间距
   - 改进搜索区域的视觉层次
   - 优化移动端体验
   - 提升页面加载性能

5. App.tsx 优化:
   - 调整路由配置和页面结构
   - 优化全局状态管理

6. CSS 样式新增:
   - 新增搜索相关的动画效果
   - 优化加载状态的视觉反馈
   - 改进响应式断点和样式

**涉及文件**:
- frontend/src/App.tsx (修改)
- frontend/src/components/CloudTypeFilter.tsx (修改)
- frontend/src/components/SearchBox.tsx (修改)
- frontend/src/components/SearchResults.tsx (修改)
- frontend/src/index.css (修改)
- frontend/src/pages/Home.tsx (修改)


---

## 2026-02-17 21:15:32

**Commit**: `style(home): 优化首页标题渐变动画和视觉效果`

**详细说明**:

优化首页标题和副标题的视觉呈现，移除背景极光装饰效果，简化视觉层次。新增 gradient-breath 和 gradient-breath-slow 呼吸动画，提升标题的动态效果。调整渐变色方案为 indigo-purple-fuchsia，增强发光效果。优化搜索框背景光晕配色，提升整体视觉一致性。

**主要改动**:

1. 首页视觉优化:
   - 移除背景极光装饰效果（三个浮动的彩色圆球）
   - 优化标题渐变色方案：from-indigo-700 via-purple-600 to-fuchsia-600
   - 新增标题发光效果：drop-shadow-[0_0_30px_rgba(99,102,241,0.35)]
   - 调整副标题为渐变文字效果，使用 bg-clip-text
   - 优化搜索框背景光晕配色：from-indigo-500/20 via-purple-500/20 to-fuchsia-500/20

2. CSS 动画新增:
   - 新增 gradient-breath 动画（4s ease-in-out infinite）
   - 新增 gradient-breath-slow 动画（6s ease-in-out infinite）
   - 支持背景位置和透明度的呼吸效果

3. Tailwind 配置更新:
   - 在 tailwind.config.js 中注册新动画
   - 定义动画关键帧和过渡效果

**涉及文件**:
- frontend/src/index.css (修改)
- frontend/src/pages/Home.tsx (修改)
- frontend/tailwind.config.js (修改)


---

## 2026-02-17 22:05:18

**Commit**: `refactor(home): 使用 GradientText 组件替换标题渐变实现`

**详细说明**:

将首页标题从原生 CSS 渐变改为使用 GradientText 组件实现，提供更流畅的动画效果和更好的可配置性。调整字体大小和样式，优化视觉呈现。

**主要改动**:

1. 组件替换:
   - 移除原有的 h1 标签和复杂的 Tailwind CSS 渐变类名
   - 使用 GradientText 组件替代，提供更好的动画控制
   - 配置渐变颜色：["#3b82f6", "#8b5cf6", "#3b82f6"]（蓝色-紫色-蓝色）
   - 设置动画速度为 6 秒，提供平滑的渐变过渡

2. 样式调整:
   - 字体大小从 text-6xl md:text-8xl 调整为 text-5xl md:text-7xl
   - 字重从 font-black 调整为 font-bold
   - 保持 tracking-tight 字间距
   - 禁用边框效果（showBorder={false}）

**涉及文件**:
- frontend/src/pages/Home.tsx (修改)


---

## 2026-02-17 22:25:43

**Commit**: `refactor(home): 优化特性卡片为 Apple 风格并简化动画`

**详细说明**:

重构首页特性卡片，采用 Apple 风格设计语言。简化卡片结构和动画效果，使用渐变背景和悬停效果。优化图标、标题和描述的布局，提升视觉一致性和交互体验。移除复杂的 3D 玻璃效果，改用简洁的毛玻璃和阴影效果。

**主要改动**:

1. 卡片结构优化:
   - 移除复杂的 glass-card-3d 和多层嵌套结构
   - 采用简洁的双层背景设计（渐变光晕 + 毛玻璃卡片）
   - 使用 backdrop-blur-apple 实现 Apple 风格毛玻璃效果
   - 优化边框和阴影效果（shadow-card / shadow-hover）

2. 动画简化:
   - 简化 motion.div 的 animate 属性配置
   - 统一使用 transition 属性控制动画时长
   - 优化悬停动画：-translate-y-3、scale-125、rotate-3
   - 移除冗余的内部装饰光效果

3. 图标优化:
   - 图标容器改用渐变背景（from-apple-blue to-apple-green 等）
   - 图标居中显示（mx-auto）
   - 悬停时图标放大并旋转（scale-125 rotate-3）
   - 添加阴影效果增强立体感

4. 文字布局优化:
   - 标题和描述改为居中对齐（text-center）
   - 标题悬停时改变颜色（text-apple-blue / text-apple-purple / text-apple-orange）
   - 描述文字悬停时颜色加深，提升可读性
   - 标题和描述添加 -translate-y-1 悬停动画

5. 配色方案:
   - 多平台搜索：apple-blue / apple-green 渐变
   - 智能匹配：apple-purple / apple-pink 渐变
   - 实时更新：apple-orange / apple-yellow 渐变

6. 内容精简:
   - 简化卡片标题文字（"多平台聚合" → "多平台搜索"）
   - 精简描述内容，更加简洁明了
   - 移除冗余的装饰元素

**涉及文件**:
- frontend/src/pages/Home.tsx (修改)


---

## 2026-02-19 03:17:55

**Commit**: `feat(scripts): 新增备份管理和更新部署脚本`

**改动说明**:
新增两个生产环境运维脚本：backup-manager.sh 提供完整的数据备份和恢复功能（支持增量/完整备份、定时任务配置、状态检查），deploy-update.sh 实现滚动更新部署流程（包含备份、镜像拉取、容器更新、服务验证和回滚机制）。

**涉及文件**:
- scripts/backup-manager.sh
- scripts/deploy-update.sh


---

## 2026-02-18 16:32:15

**Commit**: `refactor(search): 优化搜索历史下拉菜单为 Apple 风格`

**详细说明**:

重构搜索历史下拉菜单，采用 Apple 风格设计语言。优化毛玻璃效果、阴影和边框样式，提升视觉层次感。改进历史记录 chip 的交互体验，新增悬停动画和删除按钮。简化标题样式，使用更现代的排版设计。

**主要改动**:

1. 下拉菜单容器优化:
   - 背景透明度调整：bg-white/70 dark:bg-gray-900/70
   - 增强毛玻璃效果：backdrop-blur-2xl
   - 使用 ring 替代 border：ring-1 ring-black/5 dark:ring-white/10
   - 优化阴影效果：shadow-[0_8px_32px_rgba(0,0,0,0.08)]
   - 增加最大高度：max-h-72
   - 使用 Tailwind 动画类：animate-in fade-in slide-in-from-top-4

2. 标题栏优化:
   - 简化布局和样式
   - 标题改为小写字母 + 大写样式：text-xs uppercase tracking-wider
   - 标题文字：text-gray-500 dark:text-gray-400
   - 背景色：bg-black/[0.02] dark:bg-white/[0.02]
   - 边框：border-black/5 dark:border-white/5
   - 清空按钮优化：opacity-60 hover:opacity-100

3. 历史记录 chip 重构:
   - 从 button 改为 div + button 结构，提升语义化
   - 圆角从 rounded-2xl 改为 rounded-full
   - 背景和悬停效果：
     - bg-white/50 hover:bg-nebula-50/80
     - dark:bg-gray-800/50 dark:hover:bg-nebula-500/20
   - 边框优化：border-black/5 hover:border-nebula-200/80
   - 阴影效果：shadow-sm hover:shadow-md hover:shadow-nebula-500/10
   - 悬停动画：hover:scale-105 active:scale-95
   - 文字颜色悬停变化：group-hover/chip:text-nebula-600

4. 删除按钮优化:
   - 位置从左上角改为右上角（-top-1.5 -right-1.5）
   - 独立的 button 元素，提升可访问性
   - 背景：bg-white/90 dark:bg-gray-800/90
   - 边框：border-black/5 dark:border-white/10
   - 初始状态：opacity-0 scale-75
   - 悬停显示：group-hover/chip:opacity-100 group-hover/chip:scale-100
   - 悬停变红：hover:text-red-500 hover:border-red-200
   - 添加 aria-label 提升可访问性

5. 动画优化:
   - chip 动画延迟从 40ms 调整为 30ms
   - 使用 Tailwind 内置动画类替代自定义动画
   - 优化过渡效果的 duration 和 ease

**涉及文件**:
- frontend/src/components/SearchBox.tsx (修改)


---

## 2026-02-18 16:35:27

**Commit**: `feat(admin): 新增 API Key 状态切换和最后登录时间功能`

**详细说明**:

新增 API Key 启用/禁用状态切换功能，支持管理员快速控制密钥可用性。新增最后登录时间字段，记录 API Key 的登录活动。优化管理表格，新增状态切换按钮和最后登录时间列。更新后端服务和前端接口，完善 API Key 管理功能。

**主要改动**:

1. 后端功能新增:
   - 在 APIKey 模型中新增 last_login_at 字段，记录最后登录时间
   - 新增 UpdateLastLoginAt 方法，更新 API Key 的最后登录时间
   - 在 auth_handler.go 中调用更新最后登录时间的逻辑
   - 更新 Go 依赖包（go.mod / go.sum）

2. 前端类型定义:
   - 在 APIKeyInfo 接口中新增 id 和 last_login_at 字段
   - 完善类型定义，支持新功能的数据结构

3. 前端服务层:
   - 新增 updateApiKeyStatus 方法，支持启用/禁用 API Key
   - 优化代码格式和缩进
   - 完善错误处理

4. 管理表格优化:
   - AppleApiKeyTable 新增"最后登录"列，显示登录时间和相对时间
   - 新增状态切换按钮（Power / PowerOff 图标）
   - 优化描述列显示，超过 4 个字符时截断并显示省略号
   - 移动端卡片新增最后登录时间展示
   - 优化按钮布局和交互体验
   - 永久密钥不可修改状态（禁用状态切换按钮）

5. AppleTable 组件优化:
   - 优化表格列的响应式显示逻辑
   - 改进排序和筛选功能
   - 提升表格性能和用户体验

6. Admin 页面优化:
   - 集成状态切换功能，新增 handleToggleStatus 方法
   - 优化 API Key 管理流程
   - 改进加载状态和错误处理

7. 其他组件优化:
   - CreateKeyDialog: 优化对话框样式和交互
   - BatchCreateDialog: 改进批量创建流程
   - ApplePagination: 优化分页组件

**功能特性**:

- 管理员可快速启用/禁用 API Key，无需删除
- 记录并展示 API Key 的最后登录时间
- 支持按最后登录时间排序
- 永久密钥受保护，不可修改状态
- 移动端完整支持新功能

**涉及文件**:
- backend/api/auth_handler.go (修改)
- backend/go.mod (修改)
- backend/go.sum (修改)
- backend/model/apikey.go (修改)
- backend/service/apikey_service.go (修改)
- frontend/src/components/AppleTable.tsx (修改)
- frontend/src/components/CreateKeyDialog.tsx (修改)
- frontend/src/components/admin/AppleApiKeyTable.tsx (修改)
- frontend/src/components/admin/ApplePagination.tsx (修改)
- frontend/src/components/admin/BatchCreateDialog.tsx (修改)
- frontend/src/pages/Admin.tsx (修改)
- frontend/src/services/authService.ts (修改)
- frontend/src/types/api.ts (修改)

---
## 2026-02-26 23:45

**Commit**: `feat(admin): 新增日活月活统计功能并优化系统信息展示`

**详细说明**:
- 后端新增 DAU/MAU 统计逻辑，统计 users 表和 api_keys 表的活跃用户
- 在系统信息接口中返回日活/月活数据
- 前端新增两个统计卡片展示日活和月活数据
- 优化登录流程，更新 API Key 最后登录时间
- 更新 API 文档，补充 DAU/MAU 字段说明

**涉及文件**:
- backend/api/admin_handler.go
- backend/api/controller/auth_controller.go
- backend/api/refresh_token_handler.go
- backend/api/router.go
- backend/service/user_service.go
- docs/api_reference.md
- frontend/src/components/admin/SystemInfoView.tsx
- frontend/src/types/api.ts


---
## 2026-02-26 23:58

**Commit**: `feat(admin): 新增 API Key 搜索和状态筛选功能并优化分页逻辑`

**详细说明**:
- 后端新增关键词搜索（模糊匹配 api_key 和 description）和状态筛选（enabled/disabled/pending/expired）
- 前端改为服务端真实分页，移除客户端过滤逻辑，新增防抖搜索（500ms）
- 优化排序规则：按最后登录时间降序，未登录的排在后面
- 修复统计卡片数据源，确保与分页数据一致

**涉及文件**:
- backend/api/controller/apikey_controller.go
- backend/service/apikey_service.go
- backend/service/user_service.go
- frontend/src/pages/Admin.tsx
- frontend/src/services/authService.ts
