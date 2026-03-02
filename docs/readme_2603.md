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
