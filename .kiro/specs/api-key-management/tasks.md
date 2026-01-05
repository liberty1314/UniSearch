# 实现计划: API Key 管理与认证系统

## 概述

本实现计划将 API Key 管理与认证系统分为后端核心、后端 API、前端架构和前端 UI 四个主要阶段。每个阶段包含具体的编码任务，测试任务标记为可选（*），以便快速实现 MVP。

## 任务列表

### 阶段 1: 后端核心层

- [x] 1. 实现 API Key 数据模型和配置扩展
  - [x] 1.1 创建 backend/model/apikey.go
    - 定义 APIKey 结构体（Key, CreatedAt, ExpiresAt, IsEnabled, Description）
    - 实现 IsValid() 和 IsExpired() 方法
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.2 扩展 backend/config/config.go
    - 在 Config 结构体中添加 APIKeyEnabled, APIKeyDefaultTTL, APIKeyStorePath, AdminPasswordHash 字段
    - 实现环境变量读取函数（getAPIKeyEnabled, getAPIKeyDefaultTTL, getAPIKeyStorePath, getAdminPasswordHash）
    - 在 Init() 函数中初始化新配置
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 1.3 编写 API Key 格式验证的属性测试
  - **属性 1: API Key 格式一致性**
  - **验证需求: 1.2, 3.1**
  - 生成 100 个 API Key，验证格式为 `sk-` + 40 位十六进制
  - 验证所有生成的 Key 都是唯一的

- [x] 2. 实现 API Key 服务层
  - [x] 2.1 创建 backend/service/apikey_service.go
    - 定义 APIKeyService 结构体（storePath, keys map, mutex）
    - 实现 NewAPIKeyService 构造函数
    - _需求: 3.5, 15.1_
  
  - [x] 2.2 实现密钥生成功能
    - 实现 GenerateKey(ttl, description) 方法
    - 使用 crypto/rand 生成 20 字节随机数
    - 转换为 40 位十六进制并添加 `sk-` 前缀
    - _需求: 3.1, 13.1_
  
  - [x] 2.3 实现密钥验证和管理功能
    - 实现 ValidateKey(key) 方法（检查存在、启用、未过期）
    - 实现 RevokeKey(key) 方法
    - 实现 ListKeys() 和 GetKey(key) 方法
    - _需求: 3.2, 3.3, 3.4_
  
  - [x] 2.4 实现 JSON 持久化
    - 实现 load() 方法（从文件加载）
    - 实现 save() 方法（保存到文件，使用互斥锁）
    - 处理文件不存在的情况（创建空数组）
    - _需求: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 2.5 编写 API Key 验证完整性的属性测试
  - **属性 2: API Key 验证完整性**
  - **验证需求: 3.2**
  - 生成各种状态的 Key（有效、禁用、过期）
  - 验证 ValidateKey 正确检查三个条件

- [ ]* 2.6 编写持久化 Round-Trip 的属性测试
  - **属性 9: 持久化 Round-Trip 一致性**
  - **验证需求: 15.1, 15.4**
  - 创建 Key 集合，保存到临时文件，再加载回来
  - 验证加载后的数据与原始数据等价

- [x] 3. 检查点 - 后端核心层完成
  - 确保所有测试通过，如有问题请向用户询问

### 阶段 2: 后端 API 层

- [x] 4. 改造认证中间件
  - [x] 4.1 修改 backend/api/middleware.go 中的 AuthMiddleware
    - 实现双层认证逻辑（JWT 优先，API Key 降级）
    - 实现 extractBearerToken 辅助函数
    - 实现 extractAPIKey 辅助函数（从 X-API-Key 头或 URL 参数读取）
    - 实现 isPublicPath 函数
    - _需求: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 4.2 创建 AdminMiddleware
    - 仅允许有效 JWT 访问
    - 检查 JWT 中的 IsAdmin 字段
    - 返回 403 如果非管理员
    - _需求: 4.5_

- [ ]* 4.3 编写认证降级正确性的属性测试
  - **属性 5: 认证降级正确性**
  - **验证需求: 4.1, 4.2, 4.4**
  - 测试各种认证组合（无认证、仅 JWT、仅 API Key、两者都有）
  - 验证认证优先级和结果正确

- [ ]* 4.4 编写管理员权限隔离性的属性测试
  - **属性 7: 管理员权限隔离性**
  - **验证需求: 4.5**
  - 尝试使用 API Key 访问管理员接口
  - 验证被拒绝

- [x] 5. 实现管理员 API Handler
  - [x] 5.1 创建 backend/api/admin_handler.go
    - 定义请求/响应结构体（AdminLoginRequest, AdminLoginResponse, APIKeyCreateRequest）
    - _需求: 6.1, 6.3_
  
  - [x] 5.2 实现速率限制器
    - 定义 RateLimiter 结构体
    - 实现 Allow(ip) 方法（内存速率限制）
    - _需求: 5.4_
  
  - [x] 5.3 实现 AdminLoginHandler
    - 验证请求参数
    - 检查速率限制
    - 使用 bcrypt 验证密码
    - 生成包含 IsAdmin=true 的 JWT
    - _需求: 5.1, 5.2, 5.3, 5.5, 13.2_
  
  - [x] 5.4 实现 API Key 管理接口
    - 实现 ListAPIKeysHandler
    - 实现 CreateAPIKeyHandler（接收 TTL 和描述）
    - 实现 DeleteAPIKeyHandler
    - 实现 GetPluginsStatusHandler
    - _需求: 6.2, 6.3, 6.4, 6.5_

- [ ]* 5.5 编写速率限制有效性的属性测试
  - **属性 8: 速率限制有效性**
  - **验证需求: 5.4**
  - 在时间窗口内发送超过阈值的请求
  - 验证后续请求被拒绝并返回 429

- [x] 6. 更新路由配置和文档
  - [x] 6.1 修改 backend/api/router.go
    - 添加 /api/admin 路由组，应用 AdminMiddleware
    - 注册管理员 API 路由（login, keys, plugins）
    - 更新 /api/health 接口，返回 auth_enabled 状态
    - _需求: 6.6, 7.1, 7.2, 7.3_
  
  - [x] 6.2 生成 API 文档
    - 在 docs/api_reference.md 中添加新接口文档
    - 使用中文编写，包含请求参数、返回示例、错误码
    - 接口：POST /api/admin/login, GET /api/admin/keys, POST /api/admin/keys, DELETE /api/admin/keys/:key
    - _需求: 14.1, 14.2, 14.3, 14.4_

- [x] 7. 检查点 - 后端 API 层完成
  - 确保所有测试通过，如有问题请向用户询问

### 阶段 3: 前端架构层

- [x] 8. 实现认证状态管理
  - [x] 8.1 创建 frontend/src/stores/authStore.ts
    - 定义 AuthState 接口（token, apiKey, isAuthenticated, isAdmin, username）
    - 实现 setToken, setApiKey, logout, checkAuth 方法
    - 使用 persist 中间件保存到 localStorage
    - _需求: 8.1, 8.2, 8.3, 8.4_

- [ ]* 8.2 编写认证状态持久化一致性的属性测试
  - **属性 11: 认证状态持久化一致性**
  - **验证需求: 8.3**
  - 设置认证状态，模拟页面刷新
  - 验证能够从 localStorage 恢复相同状态

- [x] 9. 改造 API 拦截器
  - [x] 9.1 修改 frontend/src/lib/api.ts
    - 在请求拦截器中注入认证信息（优先 JWT，降级 API Key）
    - 在响应拦截器中处理 401 错误（清除状态，跳转登录）
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 9.2 编写 401 响应自动登出的属性测试
  - **属性 12: 401 响应自动登出**
  - **验证需求: 9.4**
  - 模拟 401 响应
  - 验证认证状态被清除且跳转到登录页

- [x] 10. 创建认证服务和类型定义
  - [x] 10.1 扩展 frontend/src/types/api.ts
    - 添加 AdminLoginRequest, AdminLoginResponse, APIKeyInfo, CreateAPIKeyRequest 类型
    - _需求: 6.1, 6.2, 6.3_
  
  - [x] 10.2 创建 frontend/src/services/authService.ts
    - 实现 adminLogin(password) 方法
    - 实现 validateApiKey(apiKey) 方法
    - 实现 listApiKeys(), createApiKey(), deleteApiKey() 方法
    - _需求: 5.1, 6.2, 6.3, 6.4_

- [x] 11. 检查点 - 前端架构层完成
  - 确保所有功能正常工作

### 阶段 4: 前端 UI 层

- [ ] 12. 实现登录页面
  - [ ] 12.1 创建 frontend/src/pages/Login.tsx
    - 使用 Shadcn/UI Tabs 组件实现双模态切换
    - 实现用户登录 Tab（API Key 输入）
    - 实现管理员登录 Tab（密码输入）
    - 实现 handleUserLogin 和 handleAdminLogin 方法
    - 使用 Sonner 显示成功/失败提示
    - 登录成功后根据角色跳转
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 13. 实现后台管理页面
  - [ ] 13.1 创建 frontend/src/pages/Admin.tsx
    - 实现 Key 管理面板（使用 Shadcn/UI Table）
    - 显示 Key 列表（Key、描述、过期时间、状态）
    - 实现删除功能（使用 AlertDialog 二次确认）
    - 实现插件状态面板
    - _需求: 11.1, 11.2, 11.4, 11.5, 11.6_
  
  - [ ] 13.2 创建生成 Key 对话框组件
    - 实现 CreateKeyDialog 组件
    - 选择有效期（7天、30天、90天、1年）
    - 输入描述信息
    - 调用 AuthService.createApiKey
    - _需求: 11.3_

- [ ] 14. 增强导航栏和路由保护
  - [ ] 14.1 修改 frontend/src/components/Navbar.tsx
    - 根据 authStore 状态显示不同入口
    - 管理员显示"后台管理"
    - 普通用户显示"API Key 设置"
    - 未登录显示"登录"
    - 实现登出功能
    - _需求: 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 14.2 修改 frontend/src/App.tsx
    - 创建 AdminRoute 保护组件
    - 添加 /login 和 /admin 路由
    - 应用路由保护
    - _需求: 11.1_

- [ ] 15. 最终检查点
  - 测试完整的管理员工作流（登录→创建Key→删除Key→登出）
  - 测试完整的用户工作流（输入Key→搜索→查看结果）
  - 确保所有功能正常工作

## 注意事项

- 标记为 `*` 的任务为可选测试任务，可以跳过以加快 MVP 开发
- 每个检查点都应该确保当前阶段的功能完整且测试通过
- 前端组件应该保持与现有 Shadcn/UI 和 Tailwind 风格一致
- 所有错误信息应该使用 Sonner Toast 显示
- API 文档必须使用中文编写并与代码保持同步
