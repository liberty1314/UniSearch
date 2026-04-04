# 2026年04月 开发日志

## [2026-04-04 10:32:02] refactor(frontend): 重构登录页密码输入组件并优化测试
- **内容**: 将注册环节的密码与确认密码输入框替换为统一样式的 `AuthInput` 组件并补充多语言属性，提升视觉表现与无障碍交互；同时调整 Admin 页面测试，复用公共的 `ConfirmDialog` 桩组件以提高自动化测试健壮性。
- **文件**:
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/__tests__/Admin.test.tsx`
