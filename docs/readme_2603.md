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
