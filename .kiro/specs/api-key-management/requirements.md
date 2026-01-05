# 需求文档 - API Key 管理与认证系统

## 简介

UniSearch 是一个网盘资源搜索系统，目前主要用于无需认证的公开搜索。本功能将引入 API Key 管理和管理员权限控制，实现双层认证机制：普通用户通过 API Key 访问搜索功能，管理员通过密码登录管理后台。

## 术语表

- **System**: UniSearch 网盘资源搜索系统
- **API_Key**: 以 `sk-` 开头的 40 位十六进制字符串，用于普通用户身份验证
- **Admin**: 管理员角色，拥有系统配置和 API Key 管理权限
- **JWT**: JSON Web Token，用于管理员会话管理
- **Key_Service**: API Key 管理服务模块
- **Auth_Middleware**: 认证中间件，负责请求鉴权
- **Admin_Middleware**: 管理员专用中间件，仅允许 JWT 认证
- **Key_Store**: API Key 持久化存储（JSON 文件）

## 需求

### 需求 1: API Key 数据模型

**用户故事**: 作为系统架构师，我希望定义清晰的 API Key 数据结构，以便系统能够存储和管理密钥信息。

#### 验收标准

1. THE System SHALL 定义 APIKey 结构体，包含 Key、CreatedAt、ExpiresAt、IsEnabled 和 Description 字段
2. WHEN 生成 API Key 时，THE System SHALL 使用 `sk-` 前缀加 40 位十六进制字符的格式
3. THE System SHALL 支持为每个 API Key 设置有效期（ExpiresAt）
4. THE System SHALL 支持启用/禁用 API Key（IsEnabled 字段）
5. THE System SHALL 允许为 API Key 添加可选的描述信息

### 需求 2: 系统配置扩展

**用户故事**: 作为系统管理员，我希望通过环境变量配置认证相关参数，以便灵活控制系统行为。

#### 验收标准

1. WHEN 系统启动时，THE System SHALL 从环境变量读取 API_KEY_ENABLED 配置
2. WHEN 系统启动时，THE System SHALL 从环境变量读取 API_KEY_DEFAULT_TTL 配置
3. WHEN 系统启动时，THE System SHALL 从环境变量读取 API_KEY_STORE_PATH 配置
4. WHEN 系统启动时，THE System SHALL 从环境变量读取 ADMIN_PASSWORD_HASH 配置
5. IF 必需的环境变量不存在，THEN THE System SHALL 报错或生成随机值并打印警告

### 需求 3: API Key 生成与管理

**用户故事**: 作为管理员，我希望能够生成、验证、撤销和列出 API Keys，以便管理用户访问权限。

#### 验收标准

1. WHEN 管理员请求生成新 Key 时，THE Key_Service SHALL 使用 crypto/rand 生成高强度随机密钥
2. WHEN 验证 API Key 时，THE Key_Service SHALL 检查 Key 是否存在、已启用且未过期
3. WHEN 管理员撤销 Key 时，THE Key_Service SHALL 删除或禁用该 Key
4. WHEN 管理员请求 Key 列表时，THE Key_Service SHALL 返回所有 API Keys 的信息
5. THE Key_Service SHALL 使用线程安全的 JSON 文件存储来持久化 Key 数据

### 需求 4: 双层认证中间件

**用户故事**: 作为系统开发者，我希望实现灵活的认证机制，支持 JWT 和 API Key 两种方式，以便满足不同用户的访问需求。

#### 验收标准

1. WHEN 请求包含有效 JWT 时，THE Auth_Middleware SHALL 解析 User claims 并放行
2. WHEN 请求不包含 JWT 但包含有效 API Key 时，THE Auth_Middleware SHALL 验证 API Key 并放行
3. WHEN 检查 API Key 时，THE Auth_Middleware SHALL 从 X-API-Key 请求头或 URL 参数 key 中读取
4. IF JWT 和 API Key 均无效，THEN THE Auth_Middleware SHALL 返回 401 Unauthorized
5. THE Admin_Middleware SHALL 仅允许包含管理员权限的有效 JWT 访问

### 需求 5: 管理员登录与认证

**用户故事**: 作为管理员，我希望通过密码登录后台，以便安全地管理系统。

#### 验收标准

1. WHEN 管理员提交登录密码时，THE System SHALL 使用 bcrypt 与 ADMIN_PASSWORD_HASH 进行比对
2. WHEN 密码验证成功时，THE System SHALL 颁发包含管理员权限的 JWT
3. WHEN 登录失败时，THE System SHALL 返回 401 错误
4. THE System SHALL 在登录接口实现内存速率限制，防止暴力破解
5. THE System SHALL 在 JWT 中包含管理员角色标识

### 需求 6: 管理员 API 接口

**用户故事**: 作为管理员，我希望通过 RESTful API 管理 API Keys 和查看系统状态，以便远程控制系统。

#### 验收标准

1. THE System SHALL 提供 POST /api/admin/login 接口用于管理员登录
2. THE System SHALL 提供 GET /api/admin/keys 接口列出所有 API Keys
3. THE System SHALL 提供 POST /api/admin/keys 接口生成新 API Key（参数：TTL、Description）
4. THE System SHALL 提供 DELETE /api/admin/keys/:key 接口删除指定 Key
5. THE System SHALL 提供 GET /api/admin/plugins 接口获取插件状态
6. THE System SHALL 在所有 /api/admin/* 路由上应用 Admin_Middleware

### 需求 7: 公开接口状态查询

**用户故事**: 作为前端开发者，我希望能够查询系统认证状态，以便动态调整 UI 显示。

#### 验收标准

1. THE System SHALL 提供 GET /api/health 接口
2. WHEN 请求 /api/health 时，THE System SHALL 返回 auth_enabled 布尔值
3. THE /api/health 接口 SHALL 无需认证即可访问

### 需求 8: 前端状态管理

**用户故事**: 作为前端开发者，我希望使用 Zustand 管理认证状态，以便在应用中共享用户身份信息。

#### 验收标准

1. THE System SHALL 创建 authStore，包含 token、apiKey、isAuthenticated 和 isAdmin 状态
2. THE authStore SHALL 提供 setToken、setApiKey 和 logout 操作方法
3. THE authStore SHALL 使用 persist 中间件将状态保存到 localStorage
4. WHEN 用户登出时，THE System SHALL 清除所有认证状态

### 需求 9: HTTP 请求拦截器

**用户故事**: 作为前端开发者，我希望自动在请求中注入认证信息，以便简化 API 调用代码。

#### 验收标准

1. WHEN 发送 HTTP 请求时，THE System SHALL 从 authStore 读取认证信息
2. IF authStore 包含 token，THEN THE System SHALL 在请求头中添加 Authorization: Bearer {token}
3. IF authStore 不包含 token 但包含 apiKey，THEN THE System SHALL 在请求头中添加 X-API-Key: {apiKey}
4. WHEN 收到 401 响应时，THE System SHALL 跳转到登录页面
5. THE System SHALL 使用 Axios 拦截器实现请求和响应拦截

### 需求 10: 双模态登录界面

**用户故事**: 作为用户，我希望能够选择使用 API Key 或管理员密码登录，以便根据我的角色访问系统。

#### 验收标准

1. THE System SHALL 提供包含两个 Tab 的登录页面
2. WHEN 用户选择 "用户" Tab 时，THE System SHALL 显示 API Key 输入框
3. WHEN 用户选择 "管理员" Tab 时，THE System SHALL 显示密码输入框
4. WHEN API Key 验证成功时，THE System SHALL 存储 Key 到 authStore 并跳转到首页
5. WHEN 管理员密码验证成功时，THE System SHALL 存储 Token 到 authStore 并跳转到后台管理页

### 需求 11: 后台管理界面

**用户故事**: 作为管理员，我希望通过可视化界面管理 API Keys 和查看系统状态，以便高效完成管理任务。

#### 验收标准

1. THE System SHALL 提供 /admin 路由，仅当 authStore.isAdmin 为 true 时可访问
2. WHEN 显示 Key 管理面板时，THE System SHALL 以表格形式展示 Key、备注、过期时间和状态
3. THE System SHALL 提供 "生成新 Key" 按钮，点击后弹出对话框选择有效期和输入描述
4. THE System SHALL 为每个 Key 提供 "删除" 按钮
5. THE System SHALL 提供插件状态面板，展示各插件健康状态
6. WHEN 操作成功或失败时，THE System SHALL 使用 Sonner 显示 Toast 提示

### 需求 12: 全局导航增强

**用户故事**: 作为用户，我希望在导航栏中看到与我角色相关的入口，以便快速访问相应功能。

#### 验收标准

1. WHEN 用户已登录且为管理员时，THE Navbar SHALL 显示 "后台管理" 入口
2. WHEN 用户已登录但非管理员时，THE Navbar SHALL 显示 "API Key 设置" 入口
3. WHEN 用户未登录时，THE Navbar SHALL 显示 "登录" 入口
4. THE Navbar SHALL 根据 authStore 状态动态更新显示内容

### 需求 13: 密码学安全要求

**用户故事**: 作为安全工程师，我希望系统使用行业标准的加密算法，以便保护用户数据安全。

#### 验收标准

1. WHEN 生成 API Key 时，THE System SHALL 使用 crypto/rand 生成随机数
2. WHEN 验证管理员密码时，THE System SHALL 使用 bcrypt 进行哈希比对
3. THE System SHALL 从环境变量读取 JWT Secret，如不存在则生成随机值并打印警告
4. THE System SHALL 确保所有敏感配置不硬编码在代码中

### 需求 14: API 文档生成

**用户故事**: 作为开发者，我希望每个后端功能完成后立即生成中文 API 文档，以便前端开发者准确对接接口。

#### 验收标准

1. WHEN 后端接口开发完成时，THE System SHALL 在 docs/api_reference.md 中生成或更新接口文档
2. THE 文档 SHALL 使用中文编写
3. THE 文档 SHALL 包含接口地址、请求方式、参数说明（类型/必填）、返回示例和错误码
4. THE 文档 SHALL 与代码保持实时同步

### 需求 15: JSON 持久化存储

**用户故事**: 作为系统架构师，我希望使用简单的文件存储方案，以便在不引入外部数据库的情况下持久化 API Keys。

#### 验收标准

1. THE Key_Service SHALL 使用 JSON 文件格式存储 API Keys
2. THE Key_Service SHALL 使用互斥锁确保并发读写安全
3. WHEN 系统启动时，THE Key_Service SHALL 从 API_KEY_STORE_PATH 加载现有 Keys
4. WHEN Key 数据变更时，THE Key_Service SHALL 立即写入文件
5. IF 存储文件不存在，THEN THE Key_Service SHALL 创建新文件并初始化为空数组
