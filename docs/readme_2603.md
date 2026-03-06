# 开发日志 - 2026年03月

## 2026-03-02

### feat(admin): 新增插件和频道统一排序及状态筛选功能

**Body**: 实现插件和频道列表的统一排序逻辑(异常优先、禁用靠后),新增状态筛选器(全部/启用/禁用/异常),优化预览对话框交互体验,移除冗余的统计卡片和"进入编辑模式"按钮,新增管理对话框的批量测试和状态切换功能,完善测试覆盖。

**Files**:
- backend/api/admin_handler.go
- backend/api/router.go
- backend/config/custom_plugins.go
- backend/database/migration.go
- backend/main.go
- backend/model/plugin_state.go
- backend/service/plugin_state_service.go
- backend/service/search_service.go
- backend/util/cache/cache_key.go
- frontend/src/components/admin/ApplePluginTable.tsx
- frontend/src/components/admin/ChannelManageDialog.tsx
- frontend/src/components/admin/ChannelPreviewDialog.tsx
- frontend/src/components/admin/PluginManageDialog.tsx
- frontend/src/components/admin/PluginPreviewDialog.tsx
- frontend/src/components/admin/SystemInfoView.tsx
- frontend/src/components/admin/__tests__/ChannelManageDialog.test.tsx
- frontend/src/components/admin/__tests__/ChannelPreviewDialog.test.tsx
- frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
- frontend/src/components/admin/__tests__/PluginPreviewDialog.test.tsx
- frontend/src/components/admin/__tests__/SystemInfoView.test.tsx
- frontend/src/components/admin/adminListSort.ts
- frontend/src/components/admin/previewFilters.ts
- frontend/src/types/api.ts

---

### refactor(admin): 优化异常状态统计口径并移除频道手动排序功能

**时间**: 2026-03-02

**Body**: 
1. 统一异常状态统计口径：插件和频道的异常状态现在包含启用和禁用的所有异常项，不再仅统计已启用的异常
2. 移除频道管理对话框中的手动上下移动排序功能，简化交互逻辑
3. 优化排序算法：禁用状态下按 healthy → untested → error 排序
4. 修复插件状态显示逻辑：禁用插件测试失败后正确显示为异常状态
5. 更新所有相关测试用例以覆盖新的排序和状态逻辑

**Files**:
- frontend/src/components/admin/ChannelManageDialog.tsx
- frontend/src/components/admin/PluginManageDialog.tsx
- frontend/src/components/admin/PluginPreviewDialog.tsx
- frontend/src/components/admin/SystemInfoView.tsx
- frontend/src/components/admin/__tests__/ChannelManageDialog.test.tsx
- frontend/src/components/admin/__tests__/ChannelPreviewDialog.test.tsx
- frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
- frontend/src/components/admin/__tests__/PluginPreviewDialog.test.tsx
- frontend/src/components/admin/__tests__/SystemInfoView.test.tsx
- frontend/src/components/admin/adminListSort.ts
- frontend/src/components/admin/previewFilters.ts

---

---

## 2026-03-02 15:58:59

### Commit
```
fix(search): 修复工作池超时死锁并优化搜索超时提示
```

### Body
修复工作池在超时场景下可能发生的死锁问题,优化插件搜索的并发控制逻辑,并改进前端超时错误提示。后端增加详细的超时日志记录,前端将 ECONNABORTED 错误映射为用户友好的搜索超时提示。

### Files
- backend/service/search_service.go
- backend/service/search_service_test.go
- backend/util/pool/worker_pool.go
- backend/util/pool/worker_pool_test.go
- frontend/src/lib/__tests__/api.test.ts
- frontend/src/lib/api.ts


## 2026-03-02 16:58:04

### Commit
```
feat(admin): 新增插件和频道批量操作功能并优化会话内排序逻辑
```

### Body
新增插件和频道的批量启用/停用/删除功能，支持多选操作。新增批量操作确认对话框，失败项自动保留在选中状态。优化会话内排序逻辑，切换状态后保持原有顺序不变。修复系统信息视图中插件统计文案（移除"含自定义"）。新增批量操作相关 API 类型定义和测试用例。

### Files
- backend/api/admin_handler.go
- backend/api/router.go
- backend/api/tg_channel_handler.go
- backend/custom_plugins.json
- frontend/src/components/admin/ChannelManageDialog.tsx
- frontend/src/components/admin/PluginManageDialog.tsx
- frontend/src/components/admin/SystemInfoView.tsx
- frontend/src/components/admin/__tests__/ChannelManageDialog.test.tsx
- frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
- frontend/src/types/api.ts

---

## 2026-03-02 19:48:50

### Commit
```
refactor(admin): 统一插件和频道管理对话框为双模式并优化工作区状态管理
```

### Body
将插件和频道管理对话框重构为支持查看/编辑双模式，移除独立的预览对话框组件。新增 `useAdminWorkspaceState` 自定义 Hook 统一管理工作区状态（搜索、筛选、分页、选择），并抽取 `adminWorkspaceApi` 工具模块封装通用 API 逻辑。优化了测试用例以适配新的双模式交互。

### Files
- frontend/src/components/Navbar.tsx
- frontend/src/components/admin/ChannelManageDialog.tsx
- frontend/src/components/admin/PluginManageDialog.tsx
- frontend/src/components/admin/SystemInfoView.tsx
- frontend/src/components/admin/__tests__/ChannelManageDialog.test.tsx
- frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
- frontend/src/components/admin/__tests__/SystemInfoView.test.tsx
- frontend/src/components/admin/adminWorkspaceApi.ts
- frontend/src/components/admin/useAdminWorkspaceState.ts
- frontend/src/types/api.ts

---

## 2026-03-02 20:42:43

### Commit
```
refactor(plugin): 移除失效插件
```

### Body
删除 zhizhen 插件及其文档,清理 yunsou 插件中的冗余辅助函数(网盘类型判断、密码提取、HTTP 重试等),同时优化前端 BubbleLoader 组件的暗色模式样式。

### Files
- .env.example
- backend/main.go
- backend/plugin/yunsou/yunsou.go
- backend/plugin/zhizhen/json结构分析.md (deleted)
- backend/plugin/zhizhen/zhizhen.go (deleted)
- frontend/src/components/BubbleLoader.tsx

---

## 2026-03-02 21:24:59

### Commit
```
feat(admin): 新增自定义插件添加功能并支持 URL 连通性测试
```

### Body
在插件管理对话框中新增"添加插件"功能，支持自定义插件名称、URL、优先级和描述；新增 URL 连通性测试接口，允许用户在添加前验证插件 URL 可用性；后端支持通过环境变量 CUSTOM_PLUGINS_PATH 配置自定义插件文件路径，并在 Docker 环境中自动回退到默认路径；新增完整的单元测试覆盖添加、验证和测试流程。

### Files
- .env.example
- backend/Dockerfile
- backend/config/custom_plugins.go
- frontend/src/components/admin/PluginManageDialog.tsx
- frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
- frontend/src/types/api.ts

---

## 2026-03-02 23:30:18

### Commit
```
fix(admin): 修正密钥文案错别字并调整频道默认顺序
```

### Body
修正管理后台统计卡片中"密鑰"为正确的"密钥"，同时调整 .env.example 中频道列表的默认顺序以优化加载优先级。

### Files
- .env.example
- frontend/src/pages/Admin.tsx

---

## 2026-03-02 23:45:32

### Commit
```
refactor(scripts): 优化备份管理脚本并新增手动清理功能
```

### Body
移除颜色输出以适配不支持 ANSI 的环境，调整备份保留天数默认值为 7 天，新增手动清理过期备份功能（含确认交互和空间统计），修复部署脚本中镜像名称加载时序问题。

### Files
- scripts/backup-manager.sh
- scripts/deploy-update.sh

---

## 2026-03-04 14:25:21

### Commit
```
feat(frontend): 新增免责声明页面及底部链接组件
```

### Body
新增 DisclaimerPage 页面展示平台免责声明，包含服务性质、版权归属、用户义务、风险提示、侵权处理及条款更新等 6 个核心条款。新增 DisclaimerFooter 组件在非管理员路由底部显示免责声明链接。重构 App.tsx 将路由逻辑提取为 AppLayout 组件，支持条件渲染底部组件。新增 disclaimer.ts 工具函数判断路由是否显示免责声明。包含完整的单元测试覆盖。

### Files
- frontend/src/App.tsx
- frontend/src/components/DisclaimerFooter.tsx
- frontend/src/components/__tests__/DisclaimerFooter.test.tsx
- frontend/src/components/__tests__/DisclaimerFooterVisibility.test.tsx
- frontend/src/lib/disclaimer.ts
- frontend/src/pages/DisclaimerPage.tsx
- frontend/src/pages/__tests__/DisclaimerPage.test.tsx

---

## 2026-03-05 14:32:51

### Commit
```
feat(search): 新增搜索时同步更新用户最后登录时间功能
```

### Body
在搜索接口中新增逻辑，当 API Key 绑定用户时，同步更新用户的 last_login_at 字段，确保用户活跃度统计的准确性。同时优化了错误日志输出格式。

### Files
- backend/api/handler.go
- backend/service/auth_service.go

---

## 2026-03-06 16:09:39

### Commit
```
refactor(frontend): 重构 Admin 页面并优化路由和构建配置
```

### Body
将 Admin 页面拆分为独立的视图组件和视图模型，提升代码可维护性；新增路由守卫和滚动管理；优化 Vite 构建配置实现代码分割；修复 UserApiKeySettings 的 finally 块逻辑；优化本地开发脚本支持 .env.local 覆盖配置。

### Files
- .github/workflows/ci.yml
- .gitignore
- README.md
- backend/plugin/http_helpers.go
- backend/plugin/kkmao/kkmao.go
- backend/plugin/kkmao/kkmao_test.go
- backend/plugin/xuexizhinan/xuexizhinan.go
- backend/plugin/xuexizhinan/xuexizhinan_test.go
- backend/service/search_cache.go
- backend/service/search_executor.go
- backend/service/search_executor_test.go
- backend/service/search_metrics.go
- backend/service/search_plugin_selector.go
- backend/service/search_plugin_selector_test.go
- backend/service/search_request.go
- backend/service/search_request_test.go
- backend/service/search_response_builder.go
- backend/service/search_response_builder_test.go
- backend/service/search_result_merger.go
- backend/service/search_result_merger_test.go
- backend/service/search_service.go
- frontend/src/App.tsx
- frontend/src/components/admin/AdminApiKeysView.tsx
- frontend/src/components/admin/AdminUsersView.tsx
- frontend/src/components/admin/AdminWorkspaceFooter.tsx
- frontend/src/components/admin/AdminWorkspaceToolbar.tsx
- frontend/src/components/admin/ChannelAddDialog.tsx
- frontend/src/components/admin/ChannelManageDialog.tsx
- frontend/src/components/admin/ChannelManageWorkspace.tsx
- frontend/src/components/admin/ChannelPreviewDialog.tsx
- frontend/src/components/admin/PluginAddDialog.tsx
- frontend/src/components/admin/PluginManageDialog.tsx
- frontend/src/components/admin/PluginManageWorkspace.tsx
- frontend/src/components/admin/PluginPreviewDialog.tsx
- frontend/src/components/admin/__tests__/ChannelManageDialog.test.tsx
- frontend/src/components/admin/__tests__/PluginManageDialog.test.tsx
- frontend/src/components/admin/adminWorkspaceApi.ts
- frontend/src/components/admin/channelManageDialogShared.ts
- frontend/src/components/admin/channelManageStateUtils.ts
- frontend/src/components/admin/pluginManageDialogShared.ts
- frontend/src/components/admin/pluginManageStateUtils.ts
- frontend/src/components/admin/workspaceSelection.ts
- frontend/src/hooks/useAdminPageController.ts
- frontend/src/hooks/useChannelManageController.ts
- frontend/src/hooks/usePagedListScrollReset.ts
- frontend/src/hooks/usePluginManageController.ts
- frontend/src/hooks/usePluginManageDialogState.ts
- frontend/src/hooks/useWorkspaceTestStatus.ts
- frontend/src/hooks/useWorkspaceTimeoutManager.ts
- frontend/src/pages/Admin.tsx
- frontend/src/pages/UserApiKeySettings.tsx
- frontend/src/routes/AppRoutes.tsx
- frontend/src/routes/RouteGuards.tsx
- frontend/src/routes/ScrollToTop.tsx
- frontend/vite.config.ts
- scripts/local.sh

---

## 2026-03-06 20:08:47

### Commit
```
feat(user): 新增搜索权限状态管理并优化 API Key 绑定流程
```

### Body
新增 searchAccessStore 统一管理用户搜索权限状态（anonymous/session_only/search_ready/api_key_only），优化 API Key 绑定页面 UI 和交互流程，增强错误处理机制，并新增相关单元测试。

### Files
- backend/api/admin_handler.go
- backend/api/handler.go
- backend/api/user_handler.go
- backend/config/config.go
- backend/plugin/aikanzy/aikanzy.go
- backend/plugin/baseasyncplugin.go
- backend/plugin/daishudj/daishudj.go
- backend/plugin/erxiao/erxiao.go
- backend/plugin/feikuai/feikuai.go
- backend/plugin/lou1/lou1.go
- backend/plugin/muou/muou.go
- backend/plugin/ouge/ouge.go
- backend/plugin/thepiratebay/thepiratebay.go
- backend/plugin/wanou/wanou.go
- backend/service/auth_service.go
- backend/service/search_cache.go
- backend/service/search_cache_test.go
- backend/service/search_executor.go
- backend/service/search_executor_test.go
- backend/service/search_metrics.go
- backend/service/search_plugin_selector.go
- backend/service/search_plugin_selector_test.go
- backend/service/search_response_builder.go
- backend/service/search_response_builder_test.go
- backend/service/search_result_merger.go
- backend/service/search_service.go
- backend/service/search_service_test.go
- backend/service/user_service.go
- backend/util/cache/redis_cache.go
- backend/util/cache/redis_cache_test.go
- frontend/src/components/MobileMenu.tsx
- frontend/src/components/Navbar.tsx
- frontend/src/components/SearchBox.tsx
- frontend/src/components/__tests__/SearchBox.test.tsx
- frontend/src/components/admin/ConfirmDialog.tsx
- frontend/src/components/admin/CreateUserDialog.tsx
- frontend/src/components/admin/__tests__/CreateUserDialog.test.tsx
- frontend/src/components/ui/AppleInput.tsx
- frontend/src/components/ui/confirm-dialog.tsx
- frontend/src/lib/__tests__/api.test.ts
- frontend/src/lib/__tests__/error.test.ts
- frontend/src/lib/api.ts
- frontend/src/lib/error.ts
- frontend/src/pages/Home.tsx
- frontend/src/pages/RegisterPage.tsx
- frontend/src/pages/UserApiKeySettings.tsx
- frontend/src/pages/__tests__/Home.test.tsx
- frontend/src/services/__tests__/searchService.test.ts
- frontend/src/services/searchService.ts
- frontend/src/services/systemSettingsService.ts
- frontend/src/services/userService.ts
- frontend/src/stores/__tests__/searchAccessStore.test.ts
- frontend/src/stores/searchAccessStore.ts
- frontend/src/stores/searchStore.ts
- frontend/src/types/api.ts

---

## 2026-03-06 20:35:12

### Commit
```
feat(frontend): 新增统一站点底部组件并重构 Button 为标准 shadcn/ui 实现
```

### Body
新增 SiteFooter 和 Footer 通用组件，替换原有的 DisclaimerFooter；重构 Button 组件从 AppleButton 兼容层改为标准 shadcn/ui 实现，支持 loading 状态和多种变体；调整首页底部间距以适配新底部组件。

### Files
- frontend/src/components/SiteFooter.tsx
- frontend/src/components/ui/button.tsx
- frontend/src/components/ui/demo.tsx
- frontend/src/components/ui/footer.tsx
- frontend/src/pages/Home.tsx
- frontend/src/routes/AppRoutes.tsx

---
