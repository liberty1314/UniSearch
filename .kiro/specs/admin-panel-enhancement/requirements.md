# 需求文档：后台管理面板增强

## 简介

本需求旨在增强 UniSearch 后台管理面板的功能和用户体验，主要包括：
1. 添加侧边栏导航，改善页面结构
2. 增强 API Key 管理功能（编辑、批量操作）

## 术语表

- **Admin_Panel**: 后台管理面板，管理员用于管理系统的 Web 界面
- **API_Key**: API 密钥，用于用户认证的字符串
- **Sidebar**: 侧边栏，用于导航不同管理模块的 UI 组件
- **Batch_Operation**: 批量操作，对多个项目同时执行相同操作

## 需求

### 需求 1：侧边栏导航

**用户故事**：作为管理员，我希望通过侧边栏导航在不同管理模块之间切换，以便更好地组织和访问管理功能。

#### 验收标准

1. WHEN 管理员访问后台管理页面 THEN THE Admin_Panel SHALL 显示左侧侧边栏和右侧内容区域
2. THE Sidebar SHALL 包含"API Key 管理"和"插件状态"两个导航项
3. WHEN 管理员点击侧边栏导航项 THEN THE Admin_Panel SHALL 切换到对应的内容视图
4. THE Sidebar SHALL 高亮显示当前选中的导航项
5. WHILE 在移动端设备上 THE Sidebar SHALL 可折叠以节省屏幕空间

### 需求 2：编辑 API Key 有效期

**用户故事**：作为管理员，我希望能够编辑单个 API Key 的有效期，以便灵活调整密钥的使用时长。

#### 验收标准

1. WHEN 管理员点击 API Key 列表中的"编辑"按钮 THEN THE Admin_Panel SHALL 显示编辑对话框
2. THE 编辑对话框 SHALL 显示当前 API Key 的过期时间
3. THE 编辑对话框 SHALL 提供输入框让管理员设置新的过期时间或延长小时数
4. WHEN 管理员提交编辑 THEN THE System SHALL 更新 API Key 的过期时间
5. WHEN 更新成功 THEN THE Admin_Panel SHALL 刷新 API Key 列表并显示成功提示
6. IF 更新失败 THEN THE Admin_Panel SHALL 显示错误信息

### 需求 3：批量延长 API Key 有效期

**用户故事**：作为管理员，我希望能够批量延长多个 API Key 的有效期，以便高效地管理大量密钥。

#### 验收标准

1. THE API Key 列表 SHALL 在每行前显示复选框
2. THE API Key 列表 SHALL 在表头显示全选复选框
3. WHEN 管理员选中一个或多个 API Key THEN THE Admin_Panel SHALL 显示批量操作工具栏
4. THE 批量操作工具栏 SHALL 包含"批量延长有效期"按钮
5. WHEN 管理员点击"批量延长有效期"按钮 THEN THE Admin_Panel SHALL 显示批量延长对话框
6. THE 批量延长对话框 SHALL 显示已选中的 API Key 数量
7. THE 批量延长对话框 SHALL 提供输入框让管理员输入延长的小时数
8. WHEN 管理员提交批量延长 THEN THE System SHALL 更新所有选中 API Key 的过期时间
9. WHEN 批量更新完成 THEN THE Admin_Panel SHALL 显示操作结果（成功数量、失败数量）

### 需求 4：批量创建 API Key

**用户故事**：作为管理员，我希望能够批量创建多个 API Key，以便快速为多个用户生成密钥。

#### 验收标准

1. THE API Key 管理面板 SHALL 包含"批量生成"按钮
2. WHEN 管理员点击"批量生成"按钮 THEN THE Admin_Panel SHALL 显示批量创建对话框
3. THE 批量创建对话框 SHALL 提供输入框让管理员输入创建数量（1-100）
4. THE 批量创建对话框 SHALL 提供输入框让管理员设置统一的有效期（小时）
5. THE 批量创建对话框 SHALL 提供可选的描述前缀输入框
6. WHEN 管理员提交批量创建 THEN THE System SHALL 生成指定数量的 API Key
7. WHEN 批量创建完成 THEN THE Admin_Panel SHALL 显示所有新创建的 API Key 列表
8. THE Admin_Panel SHALL 提供"导出为 CSV"按钮以便管理员导出新创建的密钥
9. IF 创建过程中出现错误 THEN THE Admin_Panel SHALL 显示已成功创建的数量和错误信息

### 需求 5：后端 API 支持

**用户故事**：作为系统，我需要提供后端 API 来支持新的管理功能，以便前端能够执行相应操作。

#### 验收标准

1. THE System SHALL 提供 `PATCH /api/admin/keys/:key` 接口用于更新单个 API Key 的有效期
2. THE System SHALL 提供 `POST /api/admin/keys/batch-extend` 接口用于批量延长 API Key 有效期
3. THE System SHALL 提供 `POST /api/admin/keys/batch-create` 接口用于批量创建 API Key
4. WHEN 接收到更新请求 THEN THE System SHALL 验证管理员权限
5. WHEN 接收到批量操作请求 THEN THE System SHALL 验证请求参数的合法性
6. WHEN 批量操作完成 THEN THE System SHALL 返回详细的操作结果（成功数量、失败数量、失败原因）
7. THE System SHALL 在 API Key 存储文件中持久化所有更改

### 需求 6：用户体验优化

**用户故事**：作为管理员，我希望界面响应迅速且操作流畅，以便高效地完成管理任务。

#### 验收标准

1. WHEN 执行批量操作 THEN THE Admin_Panel SHALL 显示进度指示器
2. WHEN 操作完成 THEN THE Admin_Panel SHALL 使用 Toast 通知显示结果
3. THE Admin_Panel SHALL 在批量操作期间禁用相关按钮以防止重复提交
4. WHEN 批量创建大量密钥时 THEN THE System SHALL 在合理时间内完成（100个密钥 < 5秒）
5. THE Admin_Panel SHALL 在表格中显示 API Key 的剩余有效时间（如"还剩 15 天"）
