## 项目上下文摘要（用户管理跨页批量操作）

生成时间：2026-07-23 20:04:38 +0800

### 1. 需求与验收边界

- 用户管理页支持逐个勾选，并允许勾选结果跨分页保留。
- 提供“全选当前筛选结果”，范围覆盖搜索词、角色、注册开始时间、注册结束时间共同命中的全部分页。
- 注册时间使用开始时间与结束时间，精确到秒；前端按本地时间输入并转换为带时区的 RFC 3339，后端采用包含边界的比较。
- 全选后允许取消任意用户；取消项不参与批量删除和批量修改角色。
- 当前登录管理员不进入可选总数，不能被删除，也不能被批量修改角色。
- 批量删除和批量修改角色使用相同的跨页选择语义。

### 2. 相似实现分析

- **用户分页与显式选择**：`frontend/src/hooks/useAdminUsers.ts:37-43,94-143,177-191`
  - 模式：Hook 统一维护分页、筛选、加载状态和 `Set<number>` 选择状态。
  - 可复用：`loadUsers`、`handleSelectUser`、批量对话框打开逻辑。
  - 需注意：选择 ID 可跨页保留，但当前批量对话框只从当前页 `users` 反查用户，跨页数据会丢失。

- **后台工作区全选筛选结果**：`frontend/src/components/admin/useAdminWorkspaceState.ts:25-44,160-170`、`frontend/src/components/admin/workspaceSelection.ts:1-29`、`frontend/src/components/admin/ChannelManagementView.tsx:90-115`
  - 模式：共享工作区状态维护选择集合，工具函数判断筛选结果是否全选，选择栏提供“全选当前筛选/清空筛选选择”。
  - 可复用：选择栏交互文案、`Set` 更新方式、筛选变化后的分页归一化模式。
  - 需注意：频道和插件数据均已完整加载到前端，不能直接套用到近十万条服务端分页用户数据。

- **原生日期输入**：`frontend/src/components/trending/HotToolbar.tsx:77-145`
  - 模式：复用项目 `Input` 组件，通过原生日期类输入保持移动端和桌面端一致。
  - 可复用：`Input`、中文可访问标签、无额外日期依赖的实现方式。
  - 需注意：本任务需要 `datetime-local` 并设置 `step=1`，提交前必须完成本地时间到 RFC 3339 的转换。

- **批量用户操作**：`frontend/src/components/admin/BatchDeleteDialog.tsx:19-126`、`frontend/src/components/admin/BatchUpdateRoleDialog.tsx:26-141`、`backend/service/user_service.go:546-695`
  - 模式：前端确认并展示成功/失败结果，后端事务内逐项执行并返回计数和错误。
  - 可复用：结果提示、失败原因结构、当前用户保护规则。
  - 需注意：现有接口只接受显式 ID；对数万用户逐项查询和返回全部成功 ID 会产生明显 I/O、内存与响应体成本。

### 3. 项目约定

- **命名约定**：React 组件使用 PascalCase，Hook 和函数使用 camelCase；Go 导出类型和函数使用 PascalCase；错误提示、测试描述、注释使用简体中文。
- **文件组织**：用户页面控制器位于 `frontend/src/hooks`，管理组件位于 `frontend/src/components/admin`，请求类型位于 `frontend/src/types`，服务封装位于 `frontend/src/services`；Go HTTP 协议位于 `backend/api`，查询与批量事务位于 `backend/service`。
- **导入顺序**：沿用现有文件的 React/第三方依赖、项目别名、类型导入顺序，不进行无关格式重排。
- **代码风格**：前端 TypeScript、React 函数组件、Tailwind CSS、双引号或当前文件既有引号风格；后端使用 `gofmt`。

### 4. 可复用组件清单

- `frontend/src/components/ui/input.tsx`：注册时间秒级输入。
- `frontend/src/components/ui/checkbox.tsx`：逐行选择和全选状态。
- `frontend/src/components/admin/AdminSelectionBar.tsx` 或用户页现有批量操作区：跨页选择摘要与动作入口。
- `frontend/src/components/admin/ApplePagination.tsx`：分页保持不变。
- `frontend/src/components/admin/workspaceSelection.ts`：显式选择集合处理参考。
- `frontend/src/lib/error.ts`：批量操作错误信息提取。
- `backend/service/user_service.go`：用户列表、删除、角色更新和管理员约束。
- `backend/api/user_handler.go`：用户查询参数、批量请求与响应协议。

### 5. 测试策略

- **前端框架**：Vitest、Testing Library、jsdom。
- **后端框架**：Go `testing`，服务测试使用 SQLite 测试数据库，处理器测试使用 Gin `httptest`。
- **参考文件**：
  - `frontend/src/hooks/__tests__/useAdminUsers.test.tsx`
  - `frontend/src/components/admin/__tests__/AdminUsersView.test.tsx`
  - `frontend/src/components/admin/__tests__/AppleUserTable.test.tsx`
  - `frontend/src/services/__tests__/userService.test.ts`
  - `backend/service/user_service_test.go`
  - `backend/api/admin_routes_test.go`
- **覆盖要求**：正常流程、精确到秒的时间边界、开始时间晚于结束时间、跨页显式选择、全选筛选结果、取消个别用户、筛选变化清空选择、当前管理员排除、批量部分失败。

### 6. 依赖和集成点

- **输入协议**：列表查询增加 `created_from`、`created_to`；批量接口接受显式 ID 模式或筛选快照模式。
- **输出协议**：列表响应增加 `selectable_total`；批量响应保留成功/失败计数，并避免在全选大集合时返回全部成功 ID。
- **内部依赖**：前端筛选状态 -> `UserService` -> Gin 查询绑定 -> `UserService` 统一筛选构造器 -> GORM 查询。
- **配置需求**：无需新增环境变量或外部服务。

### 7. 技术选型理由

- **选择服务端筛选快照**：避免前端逐页拉取近十万条用户 ID，也避免把巨大 ID 数组往返传输。
- **统一筛选构造器**：列表、可选总数、删除和角色修改必须复用同一查询口径，防止界面显示范围与实际操作范围不一致。
- **选择模式使用联合类型**：显式选择与全选筛选结果具有不同的数据规模和取消语义，拆分状态比用单一巨大 `Set` 更清晰。
- **不新增日期库**：浏览器原生 `datetime-local` 已能满足秒级输入，项目已有 `Input` 封装可复用。

### 8. 关键风险点

- **并发变化**：全选后到提交前可能有用户新增或属性变化；批量请求按点击全选时保存的筛选快照执行，但数据库匹配集合在提交时计算，确认弹窗必须明确显示当前匹配数量。
- **管理员约束**：当前管理员必须由后端基于认证上下文排除，不能依赖当前页前端数据推断。
- **时间边界**：前端本地时间必须携带时区提交；后端拒绝无效时间和开始晚于结束的范围。
- **性能瓶颈**：全选批量操作不能逐个查询用户或返回数万成功 ID；应采用集合更新并只返回失败明细和计数。
- **选择过期**：搜索、角色或时间筛选变化时清空选择，避免旧筛选快照继续作用。

### 9. 工具可用性记录

- 当前会话未提供仓库规范指定的 `sequential-thinking`、`shrimp-task-manager`、`desktop-commander`、Context7 和 GitHub 代码搜索工具。
- 已使用本地 `rg`、带行号源码阅读、Git 历史和现有测试作为替代；未进行网页搜索或无证据推断。
