# 2026年04月 开发日志

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
