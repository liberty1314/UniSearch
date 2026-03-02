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
