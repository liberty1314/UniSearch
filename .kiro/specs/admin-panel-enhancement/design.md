# 设计文档：后台管理面板增强

## 概述

本设计文档描述了如何增强 UniSearch 后台管理面板的功能和用户体验。主要改进包括：
1. 重构页面布局，添加侧边栏导航
2. 增强 API Key 管理功能（编辑、批量操作）
3. 新增后端 API 接口支持

## 架构

### 前端架构

```
Admin Page (重构)
├── Sidebar Component (新增)
│   ├── Navigation Items
│   └── Mobile Toggle
├── Content Area
│   ├── API Key Management View
│   │   ├── Toolbar (增强)
│   │   │   ├── Create Button
│   │   │   ├── Batch Create Button (新增)
│   │   │   └── Batch Actions Bar (新增)
│   │   ├── API Key Table (增强)
│   │   │   ├── Checkbox Column (新增)
│   │   │   ├── Edit Button (新增)
│   │   │   └── Remaining Time Display (新增)
│   │   └── Dialogs
│   │       ├── Create Dialog (现有)
│   │       ├── Edit Dialog (新增)
│   │       ├── Batch Create Dialog (新增)
│   │       └── Batch Extend Dialog (新增)
│   └── Plugin Status View (现有)
└── Export Utility (新增)
```

### 后端架构

```
API Layer
├── admin_handler.go (扩展)
│   ├── UpdateAPIKeyHandler (新增)
│   ├── BatchExtendAPIKeysHandler (新增)
│   └── BatchCreateAPIKeysHandler (新增)
└── Service Layer
    └── apikey_service.go (扩展)
        ├── UpdateKeyExpiry (新增)
        ├── BatchExtendKeys (新增)
        └── BatchGenerateKeys (新增)
```

## 组件和接口

### 前端组件

#### 1. Sidebar 组件

**文件**: `frontend/src/components/admin/Sidebar.tsx`

**Props**:
```typescript
interface SidebarProps {
  currentView: 'api-keys' | 'plugins';
  onViewChange: (view: 'api-keys' | 'plugins') => void;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}
```

**功能**:
- 显示导航项列表
- 高亮当前选中项
- 移动端支持折叠/展开
- 响应式设计

#### 2. EditKeyDialog 组件

**文件**: `frontend/src/components/admin/EditKeyDialog.tsx`

**Props**:
```typescript
interface EditKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: APIKeyInfo;
  onSuccess: () => void;
}
```

**功能**:
- 显示当前过期时间
- 提供两种编辑方式：
  - 设置新的过期日期时间
  - 延长指定小时数
- 表单验证
- 提交更新请求

#### 3. BatchCreateDialog 组件

**文件**: `frontend/src/components/admin/BatchCreateDialog.tsx`

**Props**:
```typescript
interface BatchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (keys: APIKeyInfo[]) => void;
}
```

**功能**:
- 输入创建数量（1-100）
- 输入统一有效期（小时）
- 可选描述前缀
- 显示创建进度
- 创建完成后显示结果列表
- 提供导出 CSV 功能

#### 4. BatchExtendDialog 组件

**文件**: `frontend/src/components/admin/BatchExtendDialog.tsx`

**Props**:
```typescript
interface BatchExtendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKeys: string[];
  onSuccess: () => void;
}
```

**功能**:
- 显示选中的密钥数量
- 输入延长小时数
- 显示操作进度
- 显示操作结果统计

#### 5. BatchActionsBar 组件

**文件**: `frontend/src/components/admin/BatchActionsBar.tsx`

**Props**:
```typescript
interface BatchActionsBarProps {
  selectedCount: number;
  onBatchExtend: () => void;
  onClearSelection: () => void;
}
```

**功能**:
- 显示选中数量
- 批量延长按钮
- 清除选择按钮

### 后端 API 接口

#### 1. 更新 API Key 有效期

**接口**: `PATCH /api/admin/keys/:key`

**请求体**:
```json
{
  "expires_at": "2026-02-05T10:30:00Z",  // 可选：直接设置过期时间
  "extend_hours": 720                     // 可选：延长小时数
}
```

**响应**:
```json
{
  "key": {
    "key": "sk-...",
    "created_at": "2026-01-05T10:30:00Z",
    "expires_at": "2026-02-05T10:30:00Z",
    "is_enabled": true,
    "description": "测试密钥"
  }
}
```

**错误响应**:
```json
{
  "error": "参数错误：必须提供 expires_at 或 extend_hours",
  "code": "INVALID_REQUEST"
}
```

#### 2. 批量延长 API Key 有效期

**接口**: `POST /api/admin/keys/batch-extend`

**请求体**:
```json
{
  "keys": ["sk-...", "sk-...", "sk-..."],
  "extend_hours": 720
}
```

**响应**:
```json
{
  "success_count": 3,
  "failed_count": 0,
  "results": [
    {
      "key": "sk-...",
      "success": true,
      "new_expires_at": "2026-02-05T10:30:00Z"
    }
  ]
}
```

#### 3. 批量创建 API Key

**接口**: `POST /api/admin/keys/batch-create`

**请求体**:
```json
{
  "count": 10,
  "ttl_hours": 720,
  "description_prefix": "批量生成-"
}
```

**响应**:
```json
{
  "success_count": 10,
  "failed_count": 0,
  "keys": [
    {
      "key": "sk-...",
      "created_at": "2026-01-05T10:30:00Z",
      "expires_at": "2026-02-05T10:30:00Z",
      "is_enabled": true,
      "description": "批量生成-1"
    }
  ]
}
```

## 数据模型

### 前端类型定义

```typescript
// 扩展现有的 APIKeyInfo 类型
interface APIKeyInfo {
  key: string;
  created_at: string;
  expires_at: string;
  is_enabled: boolean;
  description?: string;
}

// 批量操作结果
interface BatchOperationResult {
  success_count: number;
  failed_count: number;
  results: Array<{
    key: string;
    success: boolean;
    error?: string;
    new_expires_at?: string;
  }>;
}

// 批量创建结果
interface BatchCreateResult {
  success_count: number;
  failed_count: number;
  keys: APIKeyInfo[];
}

// 视图类型
type AdminView = 'api-keys' | 'plugins';
```

### 后端数据结构

```go
// UpdateAPIKeyRequest 更新API Key请求
type UpdateAPIKeyRequest struct {
    ExpiresAt   *time.Time `json:"expires_at"`   // 可选：直接设置过期时间
    ExtendHours *int       `json:"extend_hours"` // 可选：延长小时数
}

// BatchExtendRequest 批量延长请求
type BatchExtendRequest struct {
    Keys        []string `json:"keys" binding:"required"`
    ExtendHours int      `json:"extend_hours" binding:"required,min=1"`
}

// BatchCreateRequest 批量创建请求
type BatchCreateRequest struct {
    Count             int    `json:"count" binding:"required,min=1,max=100"`
    TTLHours          int    `json:"ttl_hours" binding:"required,min=1"`
    DescriptionPrefix string `json:"description_prefix"`
}

// BatchOperationResult 批量操作结果
type BatchOperationResult struct {
    SuccessCount int                    `json:"success_count"`
    FailedCount  int                    `json:"failed_count"`
    Results      []BatchOperationItem   `json:"results"`
}

// BatchOperationItem 批量操作单项结果
type BatchOperationItem struct {
    Key          string     `json:"key"`
    Success      bool       `json:"success"`
    Error        string     `json:"error,omitempty"`
    NewExpiresAt *time.Time `json:"new_expires_at,omitempty"`
}

// BatchCreateResult 批量创建结果
type BatchCreateResult struct {
    SuccessCount int              `json:"success_count"`
    FailedCount  int              `json:"failed_count"`
    Keys         []*model.APIKey  `json:"keys"`
}
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：侧边栏导航状态一致性

*对于任何*侧边栏导航项的点击操作，当前选中的导航项应该与显示的内容区域保持一致，且选中的导航项应该有高亮样式

**验证：需求 1.3, 1.4**

### 属性 2：编辑对话框内容正确性

*对于任何* API Key 的编辑操作，编辑对话框应该显示该密钥的当前过期时间

**验证：需求 2.1, 2.2**

### 属性 3：API Key 更新成功反馈

*对于任何*成功的 API Key 更新操作，系统应该刷新列表并显示成功提示

**验证：需求 2.5**

### 属性 4：API Key 更新失败反馈

*对于任何*失败的 API Key 更新操作，系统应该显示错误信息

**验证：需求 2.6**

### 属性 5：选择状态同步

*对于任何*非空的 API Key 选择，批量操作工具栏应该显示，且显示的选中数量应该等于实际选中的密钥数量

**验证：需求 3.3, 3.6**

### 属性 6：批量延长更新所有密钥

*对于任何*有效的批量延长请求，所有选中的 API Key 的过期时间都应该被更新

**验证：需求 3.8**

### 属性 7：批量操作结果统计正确性

*对于任何*批量操作，显示的成功数量加上失败数量应该等于操作的总数量

**验证：需求 3.9, 4.9**

### 属性 8：批量创建数量一致性

*对于任何*批量创建请求，系统生成的 API Key 数量应该等于请求的数量（在没有错误的情况下）

**验证：需求 4.6**

### 属性 9：批量创建结果显示完整性

*对于任何*批量创建操作，系统应该显示所有新创建的 API Key 列表

**验证：需求 4.7**

### 属性 10：CSV 导出完整性

*对于任何*批量创建的 API Key 列表，导出的 CSV 文件应该包含所有成功创建的密钥信息

**验证：需求 4.8**

### 属性 11：管理员权限验证

*对于任何*管理员 API 请求（更新、批量延长、批量创建），系统都应该验证请求者具有有效的管理员 Token

**验证：需求 5.4**

### 属性 12：批量操作参数验证

*对于任何*批量操作请求，系统应该验证请求参数的合法性（如数量范围、小时数为正数等）

**验证：需求 5.5**

### 属性 13：批量操作响应格式

*对于任何*批量操作，系统返回的响应应该包含成功数量、失败数量和详细的操作结果列表

**验证：需求 5.6**

### 属性 14：存储持久化一致性

*对于任何* API Key 的创建、更新或删除操作，操作成功后应该立即持久化到存储文件，且重新加载后数据应该一致

**验证：需求 5.7**

### 属性 15：批量操作进度显示

*对于任何*批量操作，在操作进行期间应该显示进度指示器

**验证：需求 6.1**

### 属性 16：操作完成通知

*对于任何*操作完成（成功或失败），系统应该使用 Toast 通知显示结果

**验证：需求 6.2**

### 属性 17：批量操作按钮禁用

*对于任何*正在进行的批量操作，相关的操作按钮应该被禁用以防止重复提交

**验证：需求 6.3**

### 属性 18：剩余时间显示准确性

*对于任何* API Key，显示的剩余有效时间应该准确反映过期时间与当前时间的差值

**验证：需求 6.5**

### 属性 19：有效期延长单调性

*对于任何* API Key，延长有效期操作后的过期时间应该晚于操作前的过期时间

**验证：需求 2.4, 3.8**

### 属性 20：批量操作原子性

*对于任何*批量操作，每个单独的 API Key 操作应该独立成功或失败，一个密钥的失败不应影响其他密钥的操作

**验证：需求 3.8, 4.9**

## 错误处理

### 前端错误处理

1. **网络错误**
   - 显示友好的错误提示
   - 提供重试选项
   - 记录错误日志

2. **验证错误**
   - 实时表单验证
   - 清晰的错误提示
   - 高亮错误字段

3. **批量操作错误**
   - 显示部分成功的结果
   - 列出失败的项目和原因
   - 提供导出错误报告选项

### 后端错误处理

1. **参数验证**
   - 验证请求参数的类型和范围
   - 返回详细的验证错误信息

2. **并发控制**
   - 使用读写锁保护共享数据
   - 避免竞态条件

3. **存储错误**
   - 操作失败时回滚内存状态
   - 记录详细的错误日志
   - 返回明确的错误码

4. **批量操作错误**
   - 每个操作独立处理
   - 收集所有错误信息
   - 返回详细的操作结果

## 测试策略

### 单元测试

**前端**:
- 测试 Sidebar 组件的导航切换
- 测试各个对话框的表单验证
- 测试批量操作的状态管理
- 测试 CSV 导出功能

**后端**:
- 测试 API Key 更新逻辑
- 测试批量操作的错误处理
- 测试存储持久化
- 测试并发安全性

### 集成测试

- 测试完整的编辑流程（前端 → 后端 → 存储）
- 测试批量创建流程
- 测试批量延长流程
- 测试权限验证

### 端到端测试

- 测试管理员登录后的完整工作流
- 测试侧边栏导航和内容切换
- 测试批量操作的用户体验
- 测试移动端响应式布局

### 性能测试

- 测试批量创建 100 个密钥的性能（< 5秒）
- 测试批量延长 100 个密钥的性能
- 测试大量密钥列表的渲染性能

## 实现注意事项

### 前端

1. **状态管理**
   - 使用 React useState 管理视图切换
   - 使用 useState 管理选中的密钥列表
   - 考虑使用 useReducer 管理复杂的批量操作状态

2. **性能优化**
   - 使用 React.memo 优化表格行组件
   - 虚拟滚动处理大量密钥列表
   - 防抖处理搜索和过滤

3. **用户体验**
   - 加载状态指示器
   - 操作确认对话框
   - 友好的错误提示
   - 键盘快捷键支持

### 后端

1. **并发安全**
   - 使用 sync.RWMutex 保护共享数据
   - 批量操作使用事务性思维

2. **性能优化**
   - 批量操作使用 goroutine 并发处理
   - 限制并发数量避免资源耗尽
   - 批量写入优化存储性能

3. **错误恢复**
   - 操作失败时回滚状态
   - 详细的错误日志
   - 优雅的错误响应

## 部署考虑

1. **向后兼容**
   - 新增 API 不影响现有功能
   - 前端渐进式增强

2. **数据迁移**
   - 无需数据迁移，使用现有存储格式

3. **配置更新**
   - 无需新增环境变量

4. **文档更新**
   - 更新 API 文档
   - 更新用户手册
