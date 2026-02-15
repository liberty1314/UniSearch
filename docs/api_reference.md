# UniSearch API 接口文档

## 概述

UniSearch 提供了一套完整的 RESTful API，支持网盘资源搜索、用户认证等功能。

**v3.0.0 重要更新**：
- 🔄 API Key 存储迁移到 MySQL 数据库
- 👥 新增用户注册和登录功能
- 🔗 新增 API Key 绑定和生成功能
- 📖 详细文档请参考：[MySQL 迁移 API 文档](mysql_migration_api.md)

**v3.1.0 重要更新**：
- 🛡️ 增强请求验证中间件，支持更严格的错误处理
- ✅ 支持 405 Method Not Allowed 错误响应
- 🔒 增强路径和认证令牌格式验证

**v3.1.1 前端优化**：
- 🎨 优化批量删除 API Key 的用户体验
- ✨ 将选择验证逻辑下放到对话框组件，避免重复验证
- 🔧 简化代码结构，提升可维护性

**v3.1.2 前端简化**：
- 🎯 简化 API Key 创建对话框，移除批量生成功能
- ✨ 专注于单个 Key 生成，提升用户体验
- 🔧 减少组件复杂度，提高代码可维护性

**v3.2.0 API 一致性修复** (2026-02-10):
- ⚠️ 新增弃用警告中间件，支持平滑 API 迁移
- 📋 旧接口将返回 `X-Deprecated-API: true` 响应头
- 📝 自动记录旧接口使用日志，便于追踪迁移进度
- 🔄 为 API 路径标准化提供向后兼容支持
- ✅ 统一所有接口响应格式为 `{ code, message, data }`
- 🔄 新增 RESTful 风格的 API Key 管理接口
- 🎯 前端响应拦截器自动解包 `data` 字段
- 📊 完整的集成测试验证（详见 [集成测试报告](integration_test_report.md)）

**基础信息**：
- 基础 URL: `http://localhost:8888/api`
- 内容类型: `application/json`
- 字符编码: `UTF-8`

**CORS 支持**：
- 允许所有来源（`Access-Control-Allow-Origin: *`）
- 支持的 HTTP 方法：GET, POST, PUT, PATCH, DELETE, OPTIONS
- 允许的请求头：Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-API-Key
- 支持预检请求（OPTIONS）

---

## 错误处理

### 标准错误响应格式

所有错误响应都遵循统一的 JSON 格式：

```json
{
  "error": "错误描述信息",
  "code": "ERROR_CODE"
}
```

### 常见 HTTP 状态码

| 状态码 | 说明 | 示例场景 |
|--------|------|----------|
| 200 | 成功 | 请求成功处理 |
| 400 | 错误请求 | 参数格式错误、路径包含非法字符 |
| 401 | 未授权 | 缺少或无效的认证凭据 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 405 | 方法不允许 | 使用了不支持的 HTTP 方法 |
| 414 | URI 过长 | 请求 URI 超过 2048 字符 |
| 429 | 请求过多 | 超过速率限制或每日搜索限额 |
| 500 | 服务器错误 | 内部错误 |

### 请求验证错误

系统会自动验证所有请求，以下情况会返回错误：

#### 1. 路径验证错误 (400 Bad Request)

**错误码**: `INVALID_PATH_NULL_BYTE`、`INVALID_PATH_CONTROL_CHAR`、`INVALID_PATH_CHAR`、`INVALID_PATH_FORMAT`

**触发条件**:
- 路径包含空字节（`\x00` 或 `%00`）
- 路径包含控制字符
- 路径包含非法字符（`<>\"{}|\\^[]` 等）
- 路径包含多余的斜杠（`//`）

**示例**:
```json
{
  "error": "请求路径包含非法字符（空字节）",
  "code": "INVALID_PATH_NULL_BYTE"
}
```

#### 2. URI 过长错误 (414 URI Too Long)

**错误码**: `URI_TOO_LONG`

**触发条件**: 请求 URI 长度超过 2048 字符

**示例**:
```json
{
  "error": "请求URI过长",
  "code": "URI_TOO_LONG"
}
```

#### 3. 认证令牌格式错误 (400 Bad Request)

**错误码**: `INVALID_AUTH_TOKEN_EMPTY`、`INVALID_AUTH_TOKEN_FORMAT`、`INVALID_AUTH_SCHEME`

**触发条件**:
- Bearer Token 为空
- Token 包含空白字符
- 使用不支持的认证方式（非 Bearer 或 Basic）

**示例**:
```json
{
  "error": "认证令牌格式错误（Token为空）",
  "code": "INVALID_AUTH_TOKEN_EMPTY"
}
```

#### 4. HTTP 方法不允许 (405 Method Not Allowed)

**错误码**: `METHOD_NOT_ALLOWED`

**触发条件**: 使用了端点不支持的 HTTP 方法

**示例**:
```json
{
  "error": "不支持的HTTP方法: PATCH",
  "code": "METHOD_NOT_ALLOWED",
  "allowed_methods": ["GET", "HEAD"]
}
```

**各端点支持的方法**:
- `/api/health`: GET, HEAD
- `/api/search`: GET, POST
- `/api/auth/*`: POST
- `/api/admin/*`: GET, POST, PUT, PATCH, DELETE
- `/api/user/*`: GET, POST, PUT, PATCH, DELETE
- `/api/system/*`: GET, PUT

---

## 认证说明

UniSearch 支持两种认证方式：**JWT Token 认证**和 **API Key 认证**。

### 认证方式

#### 1. JWT Token 认证（推荐用于管理员）

当启用认证功能（`AUTH_ENABLED=true`）时，可以通过用户登录获取 JWT Token。

**请求头格式**:
```
Authorization: Bearer <token>
```

**获取 Token**:
1. 调用登录接口获取 Token（详见下方认证 API）
2. 在后续所有 API 请求的 Header 中添加 `Authorization: Bearer <token>`
3. Token 过期后需要重新登录获取新 Token

#### 2. API Key 认证（推荐用于普通用户和第三方应用）

当启用 API Key 功能（`API_KEY_ENABLED=true`）时，可以使用 API Key 进行认证。

**请求头格式**:
```
X-API-Key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**或 URL 参数格式**:
```
?key=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**获取 API Key**:
1. 管理员通过后台管理接口创建 API Key
2. 将 API Key 提供给用户或应用
3. API Key 过期后需要管理员重新生成

### 认证优先级

当请求同时包含 JWT Token 和 API Key 时，系统优先使用 JWT Token 进行认证。

### 公开接口

以下接口无需认证即可访问：
- `/api/health` - 健康检查
- `/api/auth/login` - 用户登录
- `/api/admin/login` - 管理员登录

---

## API 弃用警告机制

为了支持 API 接口的平滑迁移和版本升级，UniSearch 实现了弃用警告机制。当您调用已标记为弃用的旧接口时，系统会提供明确的警告信息。

### 弃用警告响应头

当调用已弃用的接口时，响应中会包含以下特殊头部：

```
X-Deprecated-API: true
X-Deprecation-Message: 请使用 GET /api/user/apikey
```

**响应头说明**：
- `X-Deprecated-API`: 标识此接口已被弃用（值为 `true`）
- `X-Deprecation-Message`: 提供迁移建议，说明应该使用的新接口路径

### 日志记录

所有对弃用接口的调用都会被记录到服务器日志中，包含以下信息：
- 请求方法（GET、POST 等）
- 请求路径
- 客户端 IP 地址
- User-Agent 信息
- 弃用警告消息

**日志格式示例**：
```
⚠️ [DEPRECATED API] 方法: GET, 路径: /user/apikey-info, 客户端IP: 192.168.1.100, User-Agent: Mozilla/5.0..., 警告: 请使用 GET /api/user/apikey
```

### 迁移建议

如果您在使用 UniSearch API 时收到弃用警告，建议：

1. **检查响应头**：查看 `X-Deprecation-Message` 获取新接口路径
2. **更新代码**：尽快将代码迁移到新接口
3. **测试验证**：确保新接口功能正常
4. **移除旧接口调用**：完成迁移后移除对旧接口的依赖

**注意**：弃用的接口在未来版本中可能会被完全移除，请及时完成迁移。

---

## 认证 API

### 1. 用户注册

注册新的用户账户。

**接口地址**: `/api/auth/register`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名（3-32个字符） |
| password | string | 是 | 密码（6-64个字符） |

**请求示例**:

```json
{
  "username": "testuser",
  "password": "password123"
}
```

**成功响应** (200 OK):

```json
{
  "user_id": 2,
  "username": "testuser",
  "message": "注册成功"
}
```

**错误响应**:

- **400 Bad Request** - 参数错误
  ```json
  {
    "error": "用户名长度必须在3-32字符之间"
  }
  ```

- **400 Bad Request** - 用户名已存在
  ```json
  {
    "error": "用户名已存在"
  }
  ```

---

### 2. 用户登录（统一接口）

获取 JWT Token 用于后续 API 调用。支持三种登录方式：数据库用户登录、API Key 登录、记住我功能。

**接口地址**: `/api/auth/login`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名（API Key 登录时可以是任意用户名） |
| password | string | 是 | 密码（API Key 登录时为 API Key 字符串） |
| remember_me | boolean | 否 | 是否记住密码（默认 false） |
| device_fingerprint | string | 否 | 设备指纹（启用记住我时建议提供） |

**请求示例**:

```json
// 普通用户登录
{
  "username": "testuser",
  "password": "password123",
  "remember_me": false
}

// API Key 登录（支持任意用户名）
{
  "username": "user",
  "password": "<AUTH_TOKEN>",
  "remember_me": true,
  "device_fingerprint": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

**成功响应**:

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "<AUTH_TOKEN>",
    "expires_at": 1704067200,
    "refresh_token": "encrypted_refresh_token_base64_string",
    "username": "testuser",
    "user": {
      "id": 1,
      "username": "testuser",
      "role": "user",
      "created_at": "2026-01-18T10:00:00Z"
    }
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| access_token | string | 访问令牌（JWT），有效期 24 小时 |
| expires_at | number | 访问令牌过期时间（Unix 时间戳） |
| refresh_token | string | 刷新令牌（仅在 remember_me=true 时返回） |
| username | string | 用户名 |
| user | object | 用户信息（仅数据库用户登录时返回） |

**错误响应**:

```json
{
  "code": 401,
  "message": "用户名或密码错误",
  "data": null
}
```

```json
{
  "code": 401,
  "message": "API Key 无效或已过期",
  "data": null
}
```

**状态码**:
- `200`: 登录成功
- `400`: 参数错误
- `401`: 用户名或密码错误 / API Key 无效
- `500`: 服务器内部错误

**登录方式说明**:

1. **数据库用户登录**:
   - 使用注册的用户名和密码登录
   - 返回包含用户信息的完整响应
   - 支持"记住我"功能

2. **API Key 登录**:
   - 密码字段为 API Key（格式：`sk-` + 40位十六进制）
   - 系统自动检测 API Key 格式（43位且以 `sk-` 开头）
   - 用户名可以是任意值（建议使用 "user"）
   - 登录成功后返回 JWT Token
   - 支持"记住我"功能

3. **记住我功能**:
   - 设置 `remember_me=true` 启用
   - 返回 `refresh_token`（有效期 30 天）
   - 建议提供 `device_fingerprint` 增强安全性
   - 详见"记住密码功能 API"章节

**重要说明**:
- 此接口统一了所有登录方式，替代了旧的 `/api/auth/login-remember` 接口
- API Key 登录时，系统会自动验证 API Key 的有效性和过期时间
- JWT Token 有效期默认为 24 小时
- 刷新令牌有效期为 30 天（仅在启用"记住我"时返回）

---

### 2. 验证 Token

验证当前 Token 是否有效。

**接口地址**: `/api/auth/verify`  
**请求方法**: `POST`  
**是否需要认证**: 是

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/auth/verify \
  -H "Authorization: Bearer <AUTH_TOKEN>"
```

**成功响应**:

```json
{
  "valid": true,
  "username": "admin"
}
```

**错误响应**:

```json
{
  "error": "未授权：令牌无效或已过期",
  "code": "AUTH_TOKEN_INVALID"
}
```

---

### 3. 退出登录

退出当前登录（客户端删除 Token 即可）。

**接口地址**: `/api/auth/logout`  
**请求方法**: `POST`  
**是否需要认证**: 否

**成功响应**:

```json
{
  "message": "退出成功"
}
```

---

## 用户 API

用户 API 用于普通用户查看自己的 API Key 信息，需要 JWT Token 认证。

### 1. 获取用户 API Key 详情

获取当前登录用户的 API Key 详细信息，包括有效期、使用状态等。

**接口地址**: `/api/user/apikey-info`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要 JWT Token）

**请求头**:
```
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
```

**注意**: 
- 必须同时提供 JWT Token（通过 API Key 登录获得）和 API Key
- JWT Token 用于身份认证
- API Key 用于查询具体信息

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/user/apikey-info \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "X-API-Key: <AUTH_TOKEN>"
```

**成功响应**:

```json
{
  "key": "<AUTH_TOKEN>",
  "status": "active",
  "first_used_at": "2026-01-05 19:00:00",
  "expires_at": "2026-02-04 19:00:00",
  "validity_period": "30天",
  "remaining_days": 25,
  "description": "测试用密钥"
}
```

**字段说明**:
- `key`: API Key 字符串
- `status`: 状态（`active` 活跃 / `expired` 已过期）
- `first_used_at`: 首次使用时间（北京时间，格式：YYYY-MM-DD HH:mm:ss）
  - 如果为 `null`，表示该 Key 尚未使用
- `expires_at`: 到期时间（北京时间，格式：YYYY-MM-DD HH:mm:ss）
- `validity_period`: 有效期描述（如"30天"）
- `remaining_days`: 剩余天数（整数）
- `description`: 密钥描述信息

**错误响应**:

```json
{
  "error": "缺少 API Key",
  "code": "APIKEY_MISSING"
}
```

```json
{
  "error": "API Key 不存在",
  "code": "APIKEY_NOT_FOUND"
}
```

```json
{
  "error": "未授权：需要 JWT 令牌",
  "code": "JWT_TOKEN_REQUIRED"
}
```

**状态码**:
- `200`: 获取成功
- `400`: 缺少 API Key
- `401`: 未授权（缺少或无效的 JWT Token）
- `404`: API Key 不存在
- `500`: 服务器内部错误

**重要说明**:
- 所有时间字段均已转换为北京时间（UTC+8）
- 有效期从首次使用时开始计算
- 未使用的 Key 不会过期，`first_used_at` 为 `null`

---

## 管理员 API

管理员 API 用于管理 API Keys 和查看系统状态，所有接口都需要管理员 JWT Token 认证。

### 1. 管理员登录

管理员通过用户名和密码登录获取管理员 JWT Token 和永久 API Key。

**接口地址**: `/api/admin/login`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 管理员用户名（默认：admin） |
| password | string | 是 | 管理员密码 |

**请求示例**:

```json
{
  "username": "admin",
  "password": "admin123.com"
}
```

**成功响应**:

```json
{
  "token": "<AUTH_TOKEN>",
  "expires_at": 1704067200,
  "api_key": "<API_KEY>"
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| token | string | JWT Token，用于后续 API 请求认证 |
| expires_at | number | Token 过期时间（Unix 时间戳） |
| api_key | string | 管理员永久 API Key，无过期时间，无搜索次数限制 |

**管理员永久 API Key 特性**:
- ✅ **永不过期**：无需担心 Key 失效
- ✅ **无限制搜索**：没有每日搜索次数限制
- ✅ **自动创建**：首次登录时自动为管理员账号创建
- ✅ **自动返回**：每次登录都会返回该永久 Key
- ✅ **角色绑定**：
  - 普通用户升级为管理员时，自动创建永久 Key
  - 管理员降级为普通用户时，自动删除永久 Key

**错误响应**:

```json
{
  "error": "用户名或密码错误",
  "code": "ADMIN_LOGIN_FAILED"
}
```

**状态码**:
- `200`: 登录成功
- `400`: 参数错误
- `401`: 用户名或密码错误
- `429`: 请求过于频繁（速率限制）
- `500`: 服务器内部错误

**速率限制**: 每个 IP 地址每分钟最多尝试 5 次登录

**默认账号**: 
- 用户名：`admin`
- 密码：`admin123.com`（首次部署时请修改）

**登录后行为**:
- 登录成功后自动跳转到系统监控页面（`/admin?view=system-info`）
- 可通过侧边栏切换到 API Key 管理页面
- 前端应将返回的 `api_key` 保存到 localStorage，用于搜索请求

---

### 2. 列出所有 API Keys

获取系统中所有 API Keys 的列表。

**接口地址**: `/api/admin/keys`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要管理员 Token）

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/admin/keys \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "keys": [
    {
      "key": "<AUTH_TOKEN>",
      "created_at": "2026-01-05T10:30:00Z",
      "first_used_at": "2026-01-05T11:00:00Z",
      "expires_at": "2026-02-05T11:00:00Z",
      "ttl_hours": 720,
      "is_enabled": true,
      "description": "测试用密钥"
    },
    {
      "key": "<API_KEY>",
      "created_at": "2026-01-04T15:20:00Z",
      "first_used_at": null,
      "expires_at": "2026-01-11T15:20:00Z",
      "ttl_hours": 168,
      "is_enabled": false,
      "description": "未使用的密钥"
    }
  ]
}
```

**字段说明**:
- `key`: API Key 字符串（格式：`sk-` + 40位十六进制）
- `created_at`: 创建时间（ISO 8601 格式）
- `first_used_at`: 首次使用时间（ISO 8601 格式，null 表示未使用）
- `expires_at`: 过期时间（ISO 8601 格式，从首次使用时间开始计算）
- `ttl_hours`: 有效期（小时）
- `is_enabled`: 是否启用
- `description`: 密钥描述信息

**重要说明**:
- API Key 的有效期从**首次使用时**开始计算，而不是创建时
- 创建后未使用的 Key 不会过期，直到首次使用
- 首次使用时，系统会自动调用 `ActivateIfNeeded()` 方法：
  - 记录首次使用时间（`first_used_at`）
  - 根据 TTL 重新计算过期时间（`expires_at = first_used_at + ttl_hours`）
  - 确保有效期从实际使用时刻开始计算

**错误响应**:

```json
{
  "error": "未授权：需要管理员令牌",
  "code": "ADMIN_TOKEN_REQUIRED"
}
```

**状态码**:
- `200`: 获取成功
- `401`: 未授权（缺少或无效的管理员 Token）
- `403`: 禁止访问（Token 有效但非管理员）
- `500`: 服务器内部错误

---

### 3. 创建新 API Key

生成一个新的 API Key。

**接口地址**: `/api/admin/keys`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| ttl_hours | number | 是 | 有效期（小时），最小值为 1 |
| description | string | 否 | 密钥描述信息 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/keys \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ttl_hours": 720,
    "description": "生产环境密钥"
  }'
```

**成功响应**:

```json
{
  "key": {
    "key": "<AUTH_TOKEN>",
    "created_at": "2026-01-05T10:30:00Z",
    "first_used_at": null,
    "expires_at": "2026-02-05T10:30:00Z",
    "ttl_hours": 720,
    "is_enabled": true,
    "description": "生产环境密钥"
  }
}
```

**注意**: 新创建的 Key 的 `first_used_at` 为 `null`，表示尚未使用。有效期将从首次使用时开始计算，此时系统会自动调用 `ActivateIfNeeded()` 方法设置首次使用时间并重新计算过期时间。

**错误响应**:

```json
{
  "error": "参数错误：ttl_hours 必须大于 0",
  "code": "INVALID_REQUEST"
}
```

**状态码**:
- `200`: 创建成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误（如密钥生成失败、存储错误）

---

### 4. 删除 API Key

删除指定的 API Key。

**接口地址**: `/api/admin/keys/:key`  
**请求方法**: `DELETE`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| key | string | 是 | 要删除的 API Key |

**请求示例**:

```bash
curl -X DELETE http://localhost:8888/api/admin/keys/<AUTH_TOKEN> \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "message": "密钥已删除"
}
```

**错误响应**:

```json
{
  "error": "删除密钥失败: 密钥不存在",
  "code": "APIKEY_DELETE_FAILED"
}
```

**状态码**:
- `200`: 删除成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

---

### 5. 获取系统信息

获取系统完整信息，包括插件状态、系统统计和配置信息。

**接口地址**: `/api/admin/system-info`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要管理员 Token）

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/admin/system-info \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "plugins": [
    {
      "name": "duoduo",
      "priority": 10,
      "status": "active",
      "description": "多多搜索 - 综合网盘资源搜索"
    },
    {
      "name": "hdr4k",
      "priority": 20,
      "status": "active",
      "description": "HDR4K - 高清4K影视资源"
    }
  ],
  "stats": {
    "plugin_count": 21,
    "active_plugin_count": 21,
    "channel_count": 5,
    "cache_enabled": true,
    "proxy_enabled": false
  },
  "config": {
    "cache_path": "./cache",
    "cache_max_size_mb": 500,
    "cache_ttl_minutes": 60,
    "default_concurrency": 36,
    "proxy_url": "",
    "async_plugin_enabled": true,
    "async_response_timeout": 5,
    "async_max_background_workers": 40,
    "async_max_background_tasks": 200,
    "http_max_conns": 1600,
    "channels": [
      "aliyunpanso",
      "yunpanshare",
      "alipan_search",
      "yunpanziyuan",
      "alipan_share"
    ]
  }
}
```

**字段说明**:

**plugins** (插件列表):
- `name`: 插件名称
- `priority`: 插件优先级（数字越小优先级越高）
- `status`: 运行状态（`active` 活跃）
- `description`: 插件描述

**stats** (系统统计):
- `plugin_count`: 插件总数
- `active_plugin_count`: 活跃插件数
- `channel_count`: Telegram 频道数量
- `cache_enabled`: 缓存是否启用
- `proxy_enabled`: 代理是否启用

**config** (系统配置):
- `cache_path`: 缓存路径
- `cache_max_size_mb`: 缓存最大大小（MB）
- `cache_ttl_minutes`: 缓存 TTL（分钟）
- `default_concurrency`: 默认并发数
- `proxy_url`: 代理地址
- `async_plugin_enabled`: 异步插件是否启用
- `async_response_timeout`: 异步响应超时（秒）
- `async_max_background_workers`: 最大后台工作者数
- `async_max_background_tasks`: 最大后台任务数
- `http_max_conns`: HTTP 最大连接数
- `channels`: Telegram 频道列表

**状态码**:
- `200`: 获取成功
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

---

### 6. 更新 API Key

更新指定 API Key 的过期时间和每日搜索次数限制。

**接口地址**: `/api/admin/keys/:key`  
**请求方法**: `PATCH`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| key | string | 是 | 要更新的 API Key |

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| expires_at | string | 否 | 新的过期时间（ISO 8601 格式） |
| extend_hours | number | 否 | 延长的小时数（正整数） |
| daily_search_limit | number | 否 | 每日搜索次数限制（0表示不限制） |

**注意**: `expires_at`、`extend_hours` 和 `daily_search_limit` 至少要提供一个。

**请求示例**:

```bash
# 方式1：直接设置新的过期时间
curl -X PATCH http://localhost:8888/api/admin/keys/<AUTH_TOKEN> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "expires_at": "2026-03-05T10:30:00Z"
  }'

# 方式2：延长指定小时数
curl -X PATCH http://localhost:8888/api/admin/keys/<AUTH_TOKEN> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "extend_hours": 168
  }'

# 方式3：更新每日搜索次数限制
curl -X PATCH http://localhost:8888/api/admin/keys/<AUTH_TOKEN> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "daily_search_limit": 100
  }'

# 方式4：同时更新过期时间和每日搜索限制
curl -X PATCH http://localhost:8888/api/admin/keys/<AUTH_TOKEN> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "extend_hours": 720,
    "daily_search_limit": 50
  }'
```

**成功响应**:

```json
{
  "key": {
    "key": "<AUTH_TOKEN>",
    "created_at": "2026-01-05T10:30:00Z",
    "first_used_at": "2026-01-05T11:00:00Z",
    "expires_at": "2026-03-05T11:00:00Z",
    "ttl_hours": 720,
    "is_enabled": true,
    "description": "测试用密钥",
    "daily_search_limit": 50,
    "today_search_count": 10,
    "last_search_date": "2026-01-15"
  }
}
```

**错误响应**:

```json
{
  "error": "参数错误：必须提供 expires_at、extend_hours 或 daily_search_limit",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "更新密钥失败: 密钥不存在",
  "code": "APIKEY_UPDATE_FAILED"
}
```

**状态码**:
- `200`: 更新成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

---

### 7. 批量延长 API Key 有效期

批量延长多个 API Key 的有效期。

**接口地址**: `/api/admin/keys/batch-extend`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| keys | string[] | 是 | 要延长的 API Key 列表 |
| extend_hours | number | 是 | 延长的小时数（正整数，最小值为 1） |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/keys/batch-extend \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "keys": [
      "<AUTH_TOKEN>",
      "<API_KEY>"
    ],
    "extend_hours": 720
  }'
```

**成功响应**:

```json
{
  "success_count": 2,
  "failed_count": 0,
  "results": [
    {
      "key": "<AUTH_TOKEN>",
      "success": true
    },
    {
      "key": "<API_KEY>",
      "success": true
    }
  ]
}
```

**部分失败响应**:

```json
{
  "success_count": 1,
  "failed_count": 1,
  "results": [
    {
      "key": "<AUTH_TOKEN>",
      "success": true
    },
    {
      "key": "sk-invalid-key",
      "success": false,
      "error": "延长失败"
    }
  ]
}
```

**字段说明**:
- `success_count`: 成功更新的密钥数量
- `failed_count`: 失败的密钥数量
- `results`: 批量操作结果列表（对象数组）
  - `key`: API Key
  - `success`: 操作是否成功
  - `error`: 错误信息（仅失败时存在）

**错误响应**:

```json
{
  "error": "请求参数错误",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "密钥列表不能为空",
  "code": "INVALID_REQUEST"
}
```

**状态码**:
- `200`: 操作完成（可能部分成功）
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

---

### 8. 批量创建 API Key

批量创建多个 API Key，支持自定义有效期、描述前缀和每日搜索限制。

**接口地址**: `/api/admin/keys/batch-create`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| count | number | 是 | 创建数量（1-100） |
| ttl_hours | number | 是 | 有效期（小时），最小值为 1 |
| description_prefix | string | 否 | 描述前缀（如"批量生成-"） |
| daily_search_limit | number | 否 | 每日搜索次数限制（0表示不限制） |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/keys/batch-create \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "ttl_hours": 720,
    "description_prefix": "批量生成-",
    "daily_search_limit": 10
  }'
```

**成功响应**:

```json
{
  "success_count": 10,
  "failed_count": 0,
  "keys": [
    {
      "key": "<AUTH_TOKEN>",
      "created_at": "2026-02-08T10:30:00Z",
      "first_used_at": null,
      "expires_at": "2026-03-10T10:30:00Z",
      "ttl_hours": 720,
      "is_enabled": true,
      "description": "批量生成-1",
      "daily_search_limit": 10,
      "today_search_count": 0,
      "last_search_date": ""
    },
    {
      "key": "<API_KEY>",
      "created_at": "2026-02-08T10:30:01Z",
      "first_used_at": null,
      "expires_at": "2026-03-10T10:30:01Z",
      "ttl_hours": 720,
      "is_enabled": true,
      "description": "批量生成-2",
      "daily_search_limit": 10,
      "today_search_count": 0,
      "last_search_date": ""
    }
  ]
}
```

**字段说明**:
- `success_count`: 成功创建的密钥数量
- `failed_count`: 失败的密钥数量
- `keys`: 创建的 API Key 列表（完整的 APIKeyInfo 对象数组）

**错误响应**:

```json
{
  "error": "请求参数错误",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "批量创建失败: 数据库错误",
  "code": "BATCH_CREATE_FAILED"
}
```

**状态码**:
- `200`: 创建成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

**前端功能增强**:

批量创建对话框（`BatchCreateDialog`）提供以下功能：

1. **自定义复制格式**：
   - 启用/禁用自定义格式开关
   - 默认格式模板：`卡密：{key}，网址：https://unisearchso.xyz/`
   - 支持 `{key}` 占位符，自动替换为实际的 API Key

2. **一键复制所有密钥**：
   - 使用自定义格式时：每行格式为 `卡密：sk-xxx，网址：https://unisearchso.xyz/`
   - 不使用格式时：每行仅包含 API Key
   - 使用现代 Clipboard API，兼容旧版浏览器（降级到 `document.execCommand`）

3. **导出为 CSV**：
   - 导出包含 API Key、描述、创建时间、过期时间、状态等完整信息
   - 文件名格式：`api_keys_YYYY-MM-DD.csv`

---

### 9. 批量删除 API Key

批量删除多个 API Key。

**接口地址**: `/api/admin/keys/batch-delete`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| keys | string[] | 是 | 要删除的 API Key 列表 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/keys/batch-delete \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "keys": [
      "<AUTH_TOKEN>",
      "<API_KEY>"
    ]
  }'
```

**成功响应**:

```json
{
  "success_count": 2,
  "failed_count": 0,
  "results": [
    {
      "key": "<AUTH_TOKEN>",
      "success": true
    },
    {
      "key": "<API_KEY>",
      "success": true
    }
  ]
}
```

**部分失败响应**:

```json
{
  "success_count": 1,
  "failed_count": 1,
  "results": [
    {
      "key": "<AUTH_TOKEN>",
      "success": true
    },
    {
      "key": "sk-invalid-key",
      "success": false,
      "error": "删除失败"
    }
  ]
}
```

**字段说明**:
- `success_count`: 成功删除的密钥数量
- `failed_count`: 失败的密钥数量
- `results`: 批量操作结果列表（对象数组）
  - `key`: API Key
  - `success`: 操作是否成功
  - `error`: 错误信息（仅失败时存在）

**错误响应**:

```json
{
  "error": "请求参数错误",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "密钥列表不能为空",
  "code": "INVALID_REQUEST"
}
```

**状态码**:
- `200`: 操作完成（可能部分成功）
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

---

## 插件管理 API

插件管理 API 用于管理系统中的搜索插件，包括内置插件和自定义插件。所有接口都需要管理员 JWT Token 认证。

### 1. 创建自定义插件

添加新的自定义搜索插件到系统。

**接口地址**: `/api/admin/plugins`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 是 | 插件名称（唯一标识符，建议小写字母和数字） |
| url | string | 是 | 插件的 API 地址 |
| priority | number | 否 | 优先级（数字越小优先级越高，默认 100） |
| description | string | 否 | 插件功能描述 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/plugins \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom_plugin",
    "url": "https://example.com/api/search",
    "priority": 50,
    "description": "自定义搜索插件"
  }'
```

**成功响应**:

```json
{
  "success": true,
  "message": "插件添加成功",
  "plugin": {
    "name": "custom_plugin",
    "url": "https://example.com/api/search",
    "priority": 50,
    "description": "自定义搜索插件"
  }
}
```

**错误响应**:

```json
{
  "error": "请求参数错误",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "保存插件配置失败",
  "code": "SAVE_FAILED"
}
```

**状态码**:
- `200`: 创建成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

---

### 2. 更新自定义插件

更新指定自定义插件的配置信息。

**接口地址**: `/api/admin/plugins/:pluginName`  
**请求方法**: `PUT`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| pluginName | string | 是 | 要更新的插件名称 |

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| url | string | 是 | 插件的 API 地址 |
| priority | number | 否 | 优先级 |
| description | string | 否 | 插件功能描述 |

**请求示例**:

```bash
curl -X PUT http://localhost:8888/api/admin/plugins/custom_plugin \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/api/v2/search",
    "priority": 30,
    "description": "更新后的自定义搜索插件"
  }'
```

**成功响应**:

```json
{
  "success": true,
  "message": "插件更新成功",
  "plugin": {
    "name": "custom_plugin",
    "url": "https://example.com/api/v2/search",
    "priority": 30,
    "description": "更新后的自定义搜索插件"
  }
}
```

**错误响应**:

```json
{
  "error": "插件名称不能为空",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "更新插件配置失败",
  "code": "UPDATE_FAILED"
}
```

**状态码**:
- `200`: 更新成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `404`: 插件不存在
- `500`: 服务器内部错误

**重要说明**:
- 只能更新自定义插件，内置插件不支持更新
- 插件名称（pluginName）不可修改

---

### 3. 删除自定义插件

删除指定的自定义插件。

**接口地址**: `/api/admin/plugins/:pluginName`  
**请求方法**: `DELETE`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| pluginName | string | 是 | 要删除的插件名称 |

**请求示例**:

```bash
curl -X DELETE http://localhost:8888/api/admin/plugins/custom_plugin \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "success": true,
  "message": "插件已删除",
  "plugin_name": "custom_plugin"
}
```

**错误响应**:

```json
{
  "error": "插件名称不能为空",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "删除插件配置失败",
  "code": "DELETE_FAILED"
}
```

**状态码**:
- `200`: 删除成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `404`: 插件不存在
- `500`: 服务器内部错误

**重要说明**:
- 只能删除自定义插件，内置插件不支持删除
- 删除后需要重启服务才能完全生效

---

### 4. 测试插件连通性

测试指定插件的连通性和功能是否正常。

**接口地址**: `/api/admin/plugins/:pluginName/test`  
**请求方法**: `POST`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| pluginName | string | 是 | 要测试的插件名称 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/plugins/duoduo/test \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应（内置插件）**:

```json
{
  "message": "插件测试成功",
  "plugin_name": "duoduo",
  "result_count": 10,
  "status": "ok"
}
```

**成功响应（自定义插件）**:

```json
{
  "message": "插件测试成功",
  "plugin_name": "custom_plugin",
  "status_code": 200,
  "status": "ok"
}
```

**错误响应**:

```json
{
  "error": "插件名称不能为空",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "插件不存在",
  "code": "PLUGIN_NOT_FOUND"
}
```

```json
{
  "error": "插件测试失败",
  "code": "PLUGIN_TEST_FAILED",
  "message": "无法连接到插件URL: connection timeout"
}
```

**状态码**:
- `200`: 测试成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `404`: 插件不存在
- `500`: 测试失败或服务器内部错误

**测试说明**:
- **内置插件**: 执行实际的搜索测试（使用关键词 "test"），返回搜索结果数量
- **自定义插件**: 执行 URL 连通性测试（HEAD 或 GET 请求），返回 HTTP 状态码

---

### 5. 测试 URL 连通性

测试指定 URL 的连通性，用于在添加插件前验证 URL 是否可访问。

**接口地址**: `/api/admin/test-url`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| url | string | 是 | 要测试的 URL 地址 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/test-url \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/api/search"
  }'
```

**成功响应**:

```json
{
  "success": true,
  "message": "URL连通性测试成功",
  "status_code": 200
}
```

**失败响应**:

```json
{
  "success": false,
  "message": "无法连接到该URL",
  "error": "dial tcp: lookup example.com: no such host"
}
```

```json
{
  "success": false,
  "message": "URL返回错误状态码",
  "status_code": 404
}
```

**状态码**:
- `200`: 请求成功（无论 URL 是否可访问，都返回 200，通过 `success` 字段判断）
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问

**测试逻辑**:
1. 首先尝试 HEAD 请求（减少数据传输）
2. 如果 HEAD 失败，尝试 GET 请求
3. 检查 HTTP 状态码是否在 200-399 范围内
4. 超时时间为 10 秒

---

## 搜索 API

### 搜索网盘资源

搜索网盘资源，支持多种网盘类型和过滤条件。

**v3.0.0 重要更新 - 混合访问模式**：
- 🔑 支持三种认证方式：手动输入 API Key、JWT Token（用户绑定的 Key）、无认证（需提供 Key）
- 🎯 优先级：手动输入 API Key > JWT Token（用户绑定的 Key）
- ✅ 向后兼容：访客模式（仅提供 API Key）仍然可用

**接口地址**: `/api/search`  
**请求方法**: `POST` 或 `GET`  
**Content-Type**: `application/json`（POST 方法）  
**是否需要认证**: 需要 API Key 或 JWT Token

#### 认证方式说明

**方式 1：手动输入 API Key（推荐用于访客）**

通过 HTTP Header 或 URL 参数提供 API Key：

```bash
# Header 方式（推荐）
curl -X POST http://localhost:8888/api/search \
  -H "X-API-Key: <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"kw": "速度与激情"}'

# URL 参数方式
curl -X GET "http://localhost:8888/api/search?kw=速度与激情&key=<AUTH_TOKEN>"
```

**方式 2：JWT Token（推荐用于登录用户）**

登录后使用 JWT Token，系统自动使用用户绑定的 API Key：

```bash
curl -X POST http://localhost:8888/api/search \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"kw": "速度与激情"}'
```

**方式 3：混合模式（手动 Key 优先）**

同时提供 API Key 和 JWT Token 时，优先使用手动输入的 API Key：

```bash
curl -X POST http://localhost:8888/api/search \
  -H "X-API-Key: <AUTH_TOKEN>" \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"kw": "速度与激情"}'
```

**认证优先级**：
1. 手动输入的 API Key（Header `X-API-Key` 或 URL 参数 `key`）
2. JWT Token 中用户绑定的 API Key
3. 如果都没有，返回 401 错误

**API Key 验证**：
- 检查 API Key 是否有效（`is_enabled=true`）
- 检查 API Key 是否过期（`expires_at`）
- 检查每日搜索次数限制（`daily_search_limit`）
- 自动更新使用统计（`first_used_at`、`today_search_count`、`last_search_date`）

#### POST 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| kw | string | 是 | 搜索关键词 |
| channels | string[] | 否 | 搜索的频道列表，不提供则使用默认配置 |
| conc | number | 否 | 并发搜索数量，不提供则自动设置为频道数+插件数+10 |
| refresh | boolean | 否 | 强制刷新，不使用缓存，便于调试和获取最新数据 |
| res | string | 否 | 结果类型：`all`(返回所有结果)、`results`(仅返回 results)、`merge`(仅返回 merged_by_type)，默认为 `merge` |
| src | string | 否 | 数据来源类型：`all`(默认，全部来源)、`tg`(仅 Telegram)、`plugin`(仅插件) |
| plugins | string[] | 否 | 指定搜索的插件列表，不指定则搜索全部插件 |
| cloud_types | string[] | 否 | 指定返回的网盘类型列表，支持：`baidu`、`aliyun`、`quark`、`tianyi`、`uc`、`mobile`、`115`、`pikpak`、`xunlei`、`123`、`magnet`、`ed2k`，不指定则返回所有类型 |
| ext | object | 否 | 扩展参数，用于传递给插件的自定义参数，如 `{"title_en":"English Title", "is_all":true}` |
| filter | object | 否 | 过滤配置，用于过滤返回结果。格式：`{"include":["关键词1","关键词2"],"exclude":["排除词1","排除词2"]}` |

**filter 参数说明**:
- `include`: 包含关键词列表（OR 关系），结果必须包含至少一个关键词
- `exclude`: 排除关键词列表（AND 关系），结果不能包含任何一个排除词

#### GET 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| kw | string | 是 | 搜索关键词 |
| channels | string | 否 | 搜索的频道列表，使用英文逗号分隔多个频道 |
| conc | number | 否 | 并发搜索数量 |
| refresh | boolean | 否 | 强制刷新，设置为 `"true"` 表示不使用缓存 |
| res | string | 否 | 结果类型 |
| src | string | 否 | 数据来源类型 |
| plugins | string | 否 | 指定搜索的插件列表，使用英文逗号分隔 |
| cloud_types | string | 否 | 指定返回的网盘类型列表，使用英文逗号分隔 |
| ext | string | 否 | JSON 格式的扩展参数 |
| filter | string | 否 | JSON 格式的过滤配置 |

#### POST 请求示例

```bash
# 未启用认证
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "kw": "速度与激情",
    "channels": ["tgsearchers3", "xxx"],
    "conc": 2,
    "refresh": true,
    "res": "merge",
    "src": "all",
    "plugins": ["jikepan"],
    "cloud_types": ["baidu", "quark"],
    "ext": {
      "title_en": "Fast and Furious",
      "is_all": true
    }
  }'

# 启用认证时（需要添加 Authorization 头）
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -d '{
    "kw": "速度与激情",
    "res": "merge"
  }'

# 使用过滤器（只返回包含"合集"或"全集"，且不包含"预告"或"花絮"的结果）
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "kw": "唐朝诡事录",
    "filter": {
      "include": ["合集", "全集"],
      "exclude": ["预告", "花絮"]
    }
  }'
```

#### GET 请求示例

```bash
# 基础搜索
GET /api/search?kw=速度与激情

# 带过滤器的搜索
GET /api/search?kw=唐朝诡事录&filter={"include":["合集","全集"],"exclude":["预告","花絮"]}

# 指定网盘类型
GET /api/search?kw=速度与激情&cloud_types=baidu,quark
```

#### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 15,
    "results": [
      {
        "message_id": "12345",
        "unique_id": "channel-12345",
        "channel": "tgsearchers3",
        "datetime": "2023-06-10T14:23:45Z",
        "title": "速度与激情全集1-10",
        "content": "速度与激情系列全集，1080P高清...",
        "links": [
          {
            "type": "baidu",
            "url": "https://pan.baidu.com/s/1abcdef",
            "password": "1234",
            "datetime": "2023-06-10T14:23:45Z",
            "work_title": "速度与激情全集1-10"
          }
        ],
        "tags": ["电影", "合集"],
        "images": [
          "https://cdn1.cdn-telegram.org/file/xxx.jpg"
        ]
      }
    ],
    "merged_by_type": {
      "baidu": [
        {
          "url": "https://pan.baidu.com/s/1abcdef",
          "password": "1234",
          "note": "速度与激情全集1-10",
          "datetime": "2023-06-10T14:23:45Z",
          "source": "tg:频道名称",
          "images": [
            "https://cdn1.cdn-telegram.org/file/xxx.jpg"
          ]
        }
      ],
      "quark": [
        {
          "url": "https://pan.quark.cn/s/xxxx",
          "password": "",
          "note": "凡人修仙传",
          "datetime": "2023-06-10T15:30:22Z",
          "source": "plugin:插件名",
          "images": []
        }
      ]
    }
  }
}
```

#### 字段说明

**SearchResult 对象**:
- `message_id`: 消息 ID
- `unique_id`: 全局唯一 ID
- `channel`: 频道名称
- `datetime`: 消息时间
- `title`: 标题
- `content`: 内容
- `links`: 链接列表
- `tags`: 标签列表（可选）
- `images`: 图片链接列表（可选，仅 TG 消息）

**Link 对象**:
- `type`: 网盘类型
- `url`: 网盘链接
- `password`: 提取码
- `datetime`: 链接更新时间（可选）
- `work_title`: 作品标题（可选，用于区分同一消息中多个作品的链接）

**MergedLink 对象**:
- `url`: 网盘链接
- `password`: 提取码
- `note`: 备注信息
- `datetime`: 时间
- `source`: 数据来源（`tg:频道名称` 或 `plugin:插件名`）
- `images`: 图片链接列表（可选）

#### 错误响应

```json
{
  "code": 400,
  "message": "关键词不能为空"
}
```

**状态码**:
- `200`: 搜索成功
- `400`: 参数错误
- `401`: 未授权（需要认证时）
- `500`: 服务器内部错误

---

## 健康检查 API

### 检查服务状态

检查 API 服务是否正常运行。

**接口地址**: `/api/health`  
**请求方法**: `GET`  
**是否需要认证**: 否（公开接口）

**请求示例**:

```bash
curl http://localhost:8888/api/health
```

**成功响应**:

```json
{
  "status": "ok",
  "auth_enabled": true,
  "plugins_enabled": true,
  "plugin_count": 16,
  "plugins": [
    "pansearch",
    "panta", 
    "qupansou",
    "hunhepan",
    "jikepan",
    "pan666",
    "panyq",
    "susu",
    "xuexizhinan",
    "hdr4k",
    "labi",
    "shandian",
    "duoduo",
    "muou",
    "wanou",
    "ouge",
    "zhizhen",
    "huban"
  ],
  "channels_count": 1,
  "channels": [
    "tgsearchers3"
  ]
}
```

**字段说明**:
- `status`: 服务状态（`ok` 表示正常）
- `auth_enabled`: 是否启用认证功能
- `plugins_enabled`: 是否启用插件功能
- `plugin_count`: 插件数量（仅当插件启用时返回）
- `plugins`: 插件名称列表（仅当插件启用时返回）
- `channels_count`: 频道数量
- `channels`: 频道列表

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 500 | 服务器内部错误 |

### 认证相关错误码

| 错误码 | 说明 |
|--------|------|
| AUTH_REQUIRED | 缺少认证凭据（JWT 或 API Key） |
| AUTH_TOKEN_MISSING | 缺少认证令牌 |
| AUTH_TOKEN_INVALID_FORMAT | 令牌格式错误 |
| AUTH_TOKEN_INVALID | 令牌无效或已过期 |
| APIKEY_INVALID | API Key 无效 |
| APIKEY_EXPIRED | API Key 已过期 |
| APIKEY_NOT_FOUND | API Key 不存在 |
| ADMIN_TOKEN_REQUIRED | 需要管理员令牌 |
| ADMIN_TOKEN_INVALID | 管理员令牌无效 |
| ADMIN_PERMISSION_REQUIRED | 需要管理员权限 |
| ADMIN_LOGIN_FAILED | 管理员登录失败 |
| RATE_LIMIT_EXCEEDED | 请求过于频繁 |
| APIKEY_GENERATION_FAILED | 密钥生成失败 |
| APIKEY_STORAGE_ERROR | 存储错误 |
| APIKEY_UPDATE_FAILED | 密钥更新失败 |
| BATCH_EXTEND_FAILED | 批量延长失败 |
| BATCH_CREATE_FAILED | 批量创建失败 |

---

## 环境变量配置

### 认证配置

| 环境变量 | 描述 | 默认值 | 说明 |
|----------|------|--------|------|
| AUTH_ENABLED | 是否启用 JWT 认证 | false | 设置为 `true` 启用 JWT 认证功能 |
| AUTH_USERS | 用户账号配置 | 无 | 格式：`user1:pass1,user2:pass2` |
| AUTH_TOKEN_EXPIRY | Token 有效期（小时） | 24 | JWT Token 的有效时长 |
| AUTH_JWT_SECRET | JWT 签名密钥 | 自动生成 | 用于签名 Token，建议手动设置 |
| API_KEY_ENABLED | 是否启用 API Key 认证 | false | 设置为 `true` 启用 API Key 认证功能 |
| API_KEY_DEFAULT_TTL | API Key 默认有效期（小时） | 720 | 默认 30 天 |
| API_KEY_STORE_PATH | API Key 存储路径 | ./api_keys.json | JSON 文件存储路径 |
| ADMIN_PASSWORD_HASH | 管理员密码哈希 | 无 | 使用 bcrypt 生成的密码哈希 |

### 基础配置

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| PORT | 服务端口 | 8888 |
| PROXY | SOCKS5 代理 | 无 |
| CHANNELS | 默认搜索的 TG 频道 | tgsearchers3 |
| ENABLED_PLUGINS | 指定启用插件 | 无 |

---

## 更新日志

### v3.0.0 (2026-01-18) - MySQL 迁移版本

**重大变更**:
- 🔄 API Key 存储从 JSON 文件迁移到 MySQL 数据库
- 🔐 新增完整的用户/管理员权限体系
- 👥 支持用户注册和登录功能
- 🔗 支持 API Key 绑定到用户账户
- 🎯 支持混合访问模式（登录用户 + 访客）

**新增功能**:
- ✅ 用户注册和登录（JWT Token 认证）
- ✅ API Key 绑定功能（用户可绑定已有 Key）
- ✅ API Key 生成功能（普通用户可自行生成）
- ✅ 混合访问模式搜索（支持手动输入 Key 或使用绑定的 Key）
- ✅ 每日搜索次数限制（daily_search_limit）
- ✅ API Key 首次使用时间记录（first_used_at）
- ✅ 数据迁移工具（从 JSON 迁移到 MySQL）

**新增接口**:
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录（支持普通用户和 API Key 登录）
- `POST /api/user/apikey/bind` - 绑定 API Key
- `POST /api/user/apikey/generate` - 生成 API Key（普通用户）
- `GET /api/user/apikey/info` - 查询 API Key 信息

**数据库变更**:
- 新增 `users` 表（用户管理）
- 新增 `api_keys` 表（API Key 管理）
- API Key 支持绑定到用户（user_id 字段）
- 新增每日搜索限制字段（daily_search_limit, today_search_count, last_search_date）

**环境变量新增**:
- `DB_HOST` - MySQL 数据库主机
- `DB_PORT` - MySQL 数据库端口
- `DB_USER` - MySQL 数据库用户名
- `DB_PASSWORD` - MySQL 数据库密码
- `DB_NAME` - MySQL 数据库名称

**兼容性说明**:
- 保持向后兼容，访客模式仍然可用（手动输入 API Key）
- 现有搜索接口保持不变
- 提供数据迁移工具，平滑过渡到新系统

**部署说明**:
- 需要 MySQL 8.0 或更高版本
- 首次启动会自动创建数据库表结构
- 自动创建默认管理员账户（admin/admin）
- 支持从 JSON 文件自动迁移数据

---

### v2.2.0 (2026-01-05)

**新增功能**:
- ✅ API Key 管理增强
- ✅ 单个 API Key 有效期更新
- ✅ 批量延长 API Key 有效期
- ✅ 批量删除 API Key

**新增接口**:
- `PATCH /api/admin/keys/:key` - 更新 API Key 有效期
- `POST /api/admin/keys/batch-extend` - 批量延长 API Key 有效期
- `POST /api/admin/keys/batch-delete` - 批量删除 API Key

**功能改进**:
- 支持两种方式更新有效期：直接设置过期时间或延长指定小时数
- 批量操作支持部分成功，返回详细的操作结果
- 批量删除支持一次性删除多个密钥

**兼容性说明**:
- 所有新增功能需要管理员权限
- 向后兼容现有 API Key 管理功能

### v2.1.0 (2026-01-05)

**新增功能**:
- ✅ API Key 管理系统
- ✅ 管理员后台 API（登录、密钥管理、插件状态）
- ✅ 双层认证机制（JWT + API Key）
- ✅ 速率限制（管理员登录接口）

**新增接口**:
- `POST /api/admin/login` - 管理员登录
- `GET /api/admin/keys` - 列出所有 API Keys
- `POST /api/admin/keys` - 创建新 API Key
- `DELETE /api/admin/keys/:key` - 删除 API Key
- `GET /api/admin/plugins` - 获取插件状态

**环境变量新增**:
- `API_KEY_ENABLED` - 启用 API Key 认证
- `API_KEY_DEFAULT_TTL` - API Key 默认有效期
- `API_KEY_STORE_PATH` - API Key 存储路径
- `ADMIN_PASSWORD_HASH` - 管理员密码哈希

**兼容性说明**:
- 所有新增功能默认关闭，不影响现有部署
- API Key 认证与 JWT 认证可独立启用或同时启用
- 认证优先级：JWT > API Key

### v2.0.0 (2025-01-04)

**新增功能**:
- ✅ JWT 认证系统（可选启用）
- ✅ 搜索结果过滤器（include/exclude 关键词）
- ✅ Link 对象新增 `datetime` 和 `work_title` 字段
- ✅ 插件启用控制（`ENABLED_PLUGINS` 环境变量）

**数据模型变更**:
- `SearchRequest` 新增 `filter` 字段
- `Link` 新增 `datetime` 和 `work_title` 字段

**兼容性说明**:
- 所有新增字段均为可选，向后兼容旧版本客户端
- 认证功能默认关闭，不影响现有部署

---

---

## 用户 API Key 管理 API

用户 API Key 管理 API 用于普通用户绑定、查询和解绑自己的 API Key，需要 JWT Token 认证。

### 1. 绑定 API Key

将一个已存在的 API Key 绑定到当前登录用户账户。

**接口地址**: `/api/user/apikey`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要 JWT Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| key | string | 是 | 要绑定的 API Key（格式：sk- + 40位十六进制，共43位） |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/user/apikey \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<AUTH_TOKEN>"
  }'
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "message": "绑定成功",
  "data": {
    "api_key": "<AUTH_TOKEN>"
  }
}
```

**错误响应**:

- **400 Bad Request** - API Key 格式错误
```json
{
  "code": 400,
  "message": "API Key 格式错误",
  "data": null
}
```

- **400 Bad Request** - API Key 登录用户无法绑定
```json
{
  "code": 400,
  "message": "您当前使用 API Key 登录，无需绑定。如需绑定，请使用用户名密码登录",
  "data": null
}
```

- **400 Bad Request** - API Key 无效或已过期
```json
{
  "code": 400,
  "message": "API Key 无效或已过期",
  "data": null
}
```

- **400 Bad Request** - API Key 已被其他用户绑定
```json
{
  "code": 400,
  "message": "该 API Key 已被其他用户绑定",
  "data": null
}
```

- **401 Unauthorized** - 未授权
```json
{
  "code": 401,
  "message": "未授权",
  "data": null
}
```

**状态码**:
- `200`: 绑定成功
- `400`: 参数错误或业务逻辑错误
- `401`: 未授权（缺少或无效的 JWT Token）
- `500`: 服务器内部错误

**重要说明**:
- 用户只能绑定一个 API Key，如果已绑定其他 Key，会自动解绑旧 Key 并绑定新 Key
- API Key 必须是有效且未过期的
- API Key 不能被多个用户同时绑定
- **使用 API Key 登录的用户（user_id = 0）无法执行绑定操作**，必须使用用户名密码登录后才能绑定
- 这个限制是为了避免循环绑定和逻辑混乱：API Key 登录本身就是一种临时访问方式，不应该再绑定其他 Key

**业务场景说明**:

1. **正常用户绑定流程**:
   - 用户使用用户名密码登录（获得 JWT Token，user_id > 0）
   - 调用绑定接口，将管理员提供的 API Key 绑定到账户
   - 后续搜索时自动使用绑定的 API Key

2. **API Key 登录用户的限制**:
   - 用户使用 API Key 登录（获得 JWT Token，user_id = 0）
   - 此时调用绑定接口会返回 400 错误
   - 提示用户需要使用用户名密码登录才能绑定

3. **为什么需要这个限制**:
   - API Key 登录是一种临时访问方式，不应该有持久化的绑定关系
   - 避免用户使用 API Key A 登录后绑定 API Key B 的混乱逻辑
   - 保持系统的清晰性：绑定功能仅供正式注册用户使用

---

### 2. 获取用户绑定的 API Key

获取当前登录用户绑定的 API Key 详细信息。

**接口地址**: `/api/user/apikey`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要 JWT Token 或 API Key）

**请求示例**:

```bash
# 方式 1: 使用 JWT Token（用户名密码登录）
curl -X GET http://localhost:8888/api/user/apikey \
  -H "Authorization: Bearer <jwt_token>"

# 方式 2: 使用 API Key 登录获得的 JWT Token
curl -X GET http://localhost:8888/api/user/apikey \
  -H "Authorization: Bearer <jwt_token_from_apikey_login>"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "api_key": "<AUTH_TOKEN>",
    "expires_at": "2026-03-05T10:30:00Z",
    "daily_search_limit": 100,
    "today_search_count": 25,
    "remaining_searches": 75,
    "is_valid": true
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| api_key | string | API Key 字符串 |
| expires_at | string | 过期时间（ISO 8601 格式） |
| daily_search_limit | number | 每日搜索次数限制（0表示不限制） |
| today_search_count | number | 今日已使用搜索次数 |
| remaining_searches | number | 今日剩余搜索次数 |
| is_valid | bool | API Key 是否有效（未过期且未超限） |

**错误响应**:

- **404 Not Found** - 未绑定 API Key
```json
{
  "code": 404,
  "message": "未绑定 API Key",
  "data": null
}
```

- **401 Unauthorized** - 未授权
```json
{
  "code": 401,
  "message": "未授权",
  "data": null
}
```

**状态码**:
- `200`: 获取成功
- `401`: 未授权
- `404`: 未绑定 API Key
- `500`: 服务器内部错误

**重要说明**:
- 如果使用 API Key 登录获得的 JWT Token，会直接返回该 API Key 的信息
- 如果使用用户名密码登录，会返回用户绑定的 API Key 信息
- 未绑定 API Key 的用户会收到 404 错误

---

### 3. 解绑 API Key

解绑当前登录用户的 API Key。

**接口地址**: `/api/user/apikey`  
**请求方法**: `DELETE`  
**是否需要认证**: 是（需要 JWT Token）

**请求示例**:

```bash
curl -X DELETE http://localhost:8888/api/user/apikey \
  -H "Authorization: Bearer <jwt_token>"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "message": "解绑成功",
  "data": null
}
```

**错误响应**:

- **404 Not Found** - 未绑定 API Key
```json
{
  "code": 404,
  "message": "未绑定 API Key",
  "data": null
}
```

- **401 Unauthorized** - 未授权
```json
{
  "code": 401,
  "message": "未授权",
  "data": null
}
```

**状态码**:
- `200`: 解绑成功
- `401`: 未授权
- `404`: 未绑定 API Key
- `500`: 服务器内部错误

**重要说明**:
- 解绑后，API Key 的 `user_id` 字段会被设置为 `NULL`
- 解绑后的 API Key 可以被其他用户绑定
- 解绑操作不会删除 API Key，只是取消绑定关系

---

## 公告管理 API

公告管理 API 用于管理系统公告，包括创建、更新、删除、查询公告等功能。

**接口分类**：
- **管理员接口**：需要管理员 JWT Token 认证，用于 CRUD 操作
- **用户接口**：需要普通用户 JWT Token 认证，用于查看有效公告
- **公开接口**：无需认证，用于查询功能开关状态

**重要说明**：
- 所有管理员接口都需要同时通过 JWT 认证和管理员权限验证
- 用户接口只需要 JWT 认证（普通用户或管理员均可访问）
- 公告功能受系统设置中的 `announcement_enabled` 开关控制

---

### 1. 创建公告（管理员）

创建新的系统公告。

**接口地址**: `/api/announcements`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| title | string | 是 | 公告标题（最大 200 字符） |
| content | string | 是 | 公告内容（HTML 格式） |
| priority | string | 是 | 优先级（high/medium/low） |
| start_time | string | 是 | 生效时间（ISO 8601 格式） |
| end_time | string | 否 | 失效时间（ISO 8601 格式，可选） |
| is_enabled | boolean | 是 | 是否启用 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/announcements \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "系统维护通知",
    "content": "<p>系统将于今晚进行维护...</p>",
    "priority": "high",
    "start_time": "2024-01-20T00:00:00Z",
    "end_time": "2024-01-21T00:00:00Z",
    "is_enabled": true
  }'
```

**成功响应**:

```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 1,
    "title": "系统维护通知",
    "content": "<p>系统将于今晚进行维护...</p>",
    "priority": "high",
    "start_time": "2024-01-20T00:00:00Z",
    "end_time": "2024-01-21T00:00:00Z",
    "is_enabled": true,
    "created_at": "2024-01-19T10:00:00Z",
    "updated_at": "2024-01-19T10:00:00Z",
    "created_by": "admin",
    "updated_by": ""
  }
}
```

**错误响应**:

```json
{
  "code": 400,
  "message": "数据验证失败",
  "data": {
    "error": "标题不能为空",
    "field": "title"
  }
}
```

```json
{
  "code": 400,
  "message": "数据验证失败",
  "data": {
    "error": "失效时间必须晚于生效时间"
  }
}
```

**状态码**:
- `200`: 创建成功
- `400`: 参数错误或验证失败
- `401`: 未授权
- `403`: 禁止访问（非管理员）
- `500`: 服务器内部错误

---

### 2. 更新公告（管理员）

更新指定公告的信息。

**接口地址**: `/api/announcements/:id`  
**请求方法**: `PUT`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| id | number | 是 | 公告 ID |

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| title | string | 是 | 公告标题（最大 200 字符） |
| content | string | 是 | 公告内容（HTML 格式） |
| priority | string | 是 | 优先级（high/medium/low） |
| start_time | string | 是 | 生效时间（ISO 8601 格式） |
| end_time | string | 否 | 失效时间（ISO 8601 格式，可选） |
| is_enabled | boolean | 是 | 是否启用 |

**请求示例**:

```bash
curl -X PUT http://localhost:8888/api/announcements/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "系统维护通知(更新)",
    "content": "<p>维护时间调整...</p>",
    "priority": "medium",
    "start_time": "2024-01-20T02:00:00Z",
    "end_time": "2024-01-21T02:00:00Z",
    "is_enabled": true
  }'
```

**成功响应**:

```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": 1,
    "title": "系统维护通知(更新)",
    "content": "<p>维护时间调整...</p>",
    "priority": "medium",
    "start_time": "2024-01-20T02:00:00Z",
    "end_time": "2024-01-21T02:00:00Z",
    "is_enabled": true,
    "created_at": "2024-01-19T10:00:00Z",
    "updated_at": "2024-01-19T12:00:00Z",
    "created_by": "admin",
    "updated_by": "admin"
  }
}
```

**错误响应**:

```json
{
  "code": 404,
  "message": "公告不存在"
}
```

**状态码**:
- `200`: 更新成功
- `400`: 参数错误或验证失败
- `401`: 未授权
- `403`: 禁止访问（非管理员）
- `404`: 公告不存在
- `500`: 服务器内部错误

---

### 3. 删除公告（管理员）

删除指定的公告（软删除）。

**接口地址**: `/api/announcements/:id`  
**请求方法**: `DELETE`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| id | number | 是 | 公告 ID |

**请求示例**:

```bash
curl -X DELETE http://localhost:8888/api/announcements/1 \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "code": 200,
  "message": "删除成功"
}
```

**错误响应**:

```json
{
  "code": 404,
  "message": "公告不存在"
}
```

**状态码**:
- `200`: 删除成功
- `401`: 未授权
- `403`: 禁止访问（非管理员）
- `404`: 公告不存在
- `500`: 服务器内部错误

---

### 4. 获取公告列表（管理员）

获取所有公告的列表，支持分页和排序。

**接口地址**: `/api/announcements`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要管理员 Token）

**查询参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| page | number | 否 | 页码（默认 1） |
| page_size | number | 否 | 每页数量（默认 20） |
| sort_by | string | 否 | 排序字段（created_at/priority/start_time，默认 created_at） |
| sort_order | string | 否 | 排序方向（asc/desc，默认 desc） |

**请求示例**:

```bash
curl -X GET "http://localhost:8888/api/announcements?page=1&page_size=20&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "announcements": [
      {
        "id": 1,
        "title": "系统维护通知",
        "content": "<p>系统将于今晚进行维护...</p>",
        "priority": "high",
        "start_time": "2024-01-20T00:00:00Z",
        "end_time": "2024-01-21T00:00:00Z",
        "is_enabled": true,
        "created_at": "2024-01-19T10:00:00Z",
        "updated_at": "2024-01-19T10:00:00Z",
        "created_by": "admin",
        "updated_by": "admin"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

**错误响应**:

```json
{
  "code": 400,
  "message": "无效的排序字段"
}
```

**状态码**:
- `200`: 查询成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问（非管理员）
- `500`: 服务器内部错误

---

### 5. 获取单个公告（管理员）

获取指定公告的详细信息。

**接口地址**: `/api/announcements/:id`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| id | number | 是 | 公告 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/announcements/1 \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": 1,
    "title": "系统维护通知",
    "content": "<p>系统将于今晚进行维护...</p>",
    "priority": "high",
    "start_time": "2024-01-20T00:00:00Z",
    "end_time": "2024-01-21T00:00:00Z",
    "is_enabled": true,
    "created_at": "2024-01-19T10:00:00Z",
    "updated_at": "2024-01-19T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin"
  }
}
```

**错误响应**:

```json
{
  "code": 404,
  "message": "公告不存在"
}
```

**状态码**:
- `200`: 查询成功
- `401`: 未授权
- `403`: 禁止访问（非管理员）
- `404`: 公告不存在
- `500`: 服务器内部错误

---

### 6. 设置公告状态（管理员）

设置公告的启用/禁用状态。

**接口地址**: `/api/announcements/:id/status`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| id | number | 是 | 公告 ID |

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| is_enabled | boolean | 是 | 是否启用 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/announcements/1/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "is_enabled": false
  }'
```

**成功响应**:

```json
{
  "code": 200,
  "message": "状态更新成功"
}
```

**错误响应**:

```json
{
  "code": 404,
  "message": "公告不存在"
}
```

**状态码**:
- `200`: 更新成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问（非管理员）
- `404`: 公告不存在
- `500`: 服务器内部错误

---

### 7. 获取当前有效公告（用户端）

获取当前有效的公告列表（普通用户和管理员均可访问）。

**接口地址**: `/api/announcements/active`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要 JWT Token，普通用户或管理员）

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/announcements/active \
  -H "Authorization: Bearer <user_token>"
```

**成功响应**:

```json
{
  "code": 200,
  "message": "查询成功",
  "data": [
    {
      "id": 1,
      "title": "系统维护通知",
      "content": "<p>系统将于今晚进行维护...</p>",
      "priority": "high",
      "start_time": "2024-01-20T00:00:00Z",
      "end_time": "2024-01-21T00:00:00Z",
      "created_at": "2024-01-19T10:00:00Z"
    }
  ]
}
```

**说明**:
- 此接口会检查系统设置中的公告功能开关
- 如果功能未启用，返回空数组
- 只返回满足以下条件的公告：
  - 启用状态为 true
  - 当前时间 >= 生效时间
  - 失效时间为空 OR 当前时间 <= 失效时间
- 按优先级（high > medium > low）和创建时间倒序排序

**错误响应**:

```json
{
  "code": 401,
  "message": "未授权：需要登录"
}
```

**状态码**:
- `200`: 查询成功
- `401`: 未授权
- `500`: 服务器内部错误

---

### 8. 获取公告功能状态（公开接口）

获取系统公告功能的启用/禁用状态。此接口无需认证，用于前端判断是否显示公告相关功能。

**接口地址**: `/api/system-settings/announcement-enabled`  
**请求方法**: `GET`  
**是否需要认证**: 否（公开接口）

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/system-settings/announcement-enabled
```

**成功响应**:

```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "enabled": false
  }
}
```

**说明**:
- 此接口无需认证，任何人都可以访问
- 用于前端判断是否显示公告功能入口
- 默认值为 `false`（功能禁用）

**状态码**:
- `200`: 查询成功
- `500`: 服务器内部错误

---

### 9. 设置公告功能状态（管理员）

设置系统公告功能的启用/禁用状态。

**接口地址**: `/api/system-settings/announcement-enabled`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| enabled | boolean | 是 | 是否启用公告功能 |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/system-settings/announcement-enabled \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true
  }'
```

**成功响应**:

```json
{
  "code": 200,
  "message": "设置成功"
}
```

**状态码**:
- `200`: 设置成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问（非管理员）
- `500`: 服务器内部错误

**重要说明**:
- 公告功能默认为禁用状态
- 当功能禁用时，用户端不会显示任何公告
- 管理员仍可以在功能禁用时管理公告

---

## 系统设置 API

系统设置 API 用于管理系统全局配置，提供细粒度的用户认证功能控制。

### 1. 获取系统设置（公开接口）

获取系统的全局设置信息，无需认证即可访问。主要用于前端判断是否显示用户登录/注册功能。

**接口地址**: `/api/system-settings`  
**请求方法**: `GET`  
**是否需要认证**: 否（公开接口）

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/system-settings
```

**成功响应** (200 OK):

```json
{
  "enable_user_auth": true,
  "enable_user_login": true,
  "enable_user_signup": true
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| enable_user_auth | bool | 总开关：是否启用用户认证功能（true=启用，false=禁用） |
| enable_user_login | bool | 是否启用用户登录功能（true=启用，false=禁用） |
| enable_user_signup | bool | 是否启用用户注册功能（true=启用，false=禁用） |

**开关层级关系**:
```
enable_user_auth (总开关)
├── enable_user_login (登录开关)
└── enable_user_signup (注册开关)
```

**使用场景**:
- 前端页面加载时调用此接口，判断是否显示"登录"和"注册"按钮
- 如果 `enable_user_auth` 为 `false`，前端隐藏所有用户认证相关功能，仅显示 API Key 登录
- 如果 `enable_user_auth` 为 `true`：
  - `enable_user_login` 为 `true` 时显示"登录"选项卡
  - `enable_user_signup` 为 `true` 时显示"注册"选项卡
  - API Key 登录始终可用

**错误响应**:

```json
{
  "error": "获取系统设置失败：数据库连接错误"
}
```

**状态码**:
- `200`: 获取成功
- `500`: 服务器内部错误

---

### 2. 更新系统设置（管理员接口）

更新系统的全局设置，仅管理员可访问。支持独立更新任意一个或多个开关。

**接口地址**: `/api/admin/system-settings`  
**请求方法**: `PUT`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| enable_user_auth | bool | 否 | 总开关：是否启用用户认证功能 |
| enable_user_login | bool | 否 | 是否启用用户登录功能 |
| enable_user_signup | bool | 否 | 是否启用用户注册功能 |

**注意**: 至少需要提供一个字段，可以同时更新多个字段。

**请求示例**:

```bash
# 示例 1: 仅更新总开关
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_auth": false
  }'

# 示例 2: 仅更新登录开关
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_login": false
  }'

# 示例 3: 同时更新多个开关
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_auth": true,
    "enable_user_login": true,
    "enable_user_signup": false
  }'
```

**成功响应** (200 OK):

```json
{
  "message": "系统设置已更新",
  "enable_user_auth": true,
  "enable_user_login": true,
  "enable_user_signup": false
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| message | string | 操作结果消息 |
| enable_user_auth | bool | 更新后的总开关状态 |
| enable_user_login | bool | 更新后的登录开关状态 |
| enable_user_signup | bool | 更新后的注册开关状态 |

**错误响应**:

- **400 Bad Request** - 参数错误（未提供任何字段）
```json
{
  "error": "请求参数错误：至少需要提供一个设置字段"
}
```

- **400 Bad Request** - JSON 格式错误
```json
{
  "error": "请求参数错误：JSON 格式不正确"
}
```

- **401 Unauthorized** - 未授权
```json
{
  "error": "未授权：需要管理员令牌"
}
```

- **403 Forbidden** - 权限不足
```json
{
  "error": "权限不足：需要管理员权限"
}
```

- **500 Internal Server Error** - 服务器错误
```json
{
  "error": "更新系统设置失败：数据库写入错误"
}
```

**状态码**:
- `200`: 更新成功
- `400`: 参数错误（未提供任何字段或 JSON 格式错误）
- `401`: 未授权
- `403`: 权限不足
- `500`: 服务器内部错误

**参数验证规则**:
- 至少需要提供一个字段（`enable_user_auth`、`enable_user_login` 或 `enable_user_signup`）
- 所有字段都是可选的，但不能全部省略
- 字段必须是布尔类型（`true` 或 `false`），不接受字符串 `"true"` 或 `"false"`
- 后端使用指针类型进行严格验证，确保客户端明确指定了设置值

**技术实现细节**:
```go
// 后端使用指针类型接收参数
type UpdateSettingsRequest struct {
    EnableUserAuth   *bool `json:"enable_user_auth"`
    EnableUserLogin  *bool `json:"enable_user_login"`
    EnableUserSignup *bool `json:"enable_user_signup"`
}

// 检查至少提供了一个字段
if req.EnableUserAuth == nil && req.EnableUserLogin == nil && req.EnableUserSignup == nil {
    return error("至少需要提供一个设置字段")
}

// 获取当前设置
currentSettings := GetSettings()

// 确定主开关的值
enableUserAuth := currentSettings.EnableUserAuth
if req.EnableUserAuth != nil {
    enableUserAuth = *req.EnableUserAuth
}

// 更新设置（未提供的字段保持原值）
UpdateSettings(enableUserAuth, req.EnableUserLogin, req.EnableUserSignup)
```

这种设计可以区分以下情况：
1. **未提供字段**: 保持原值不变
2. **提供 null 值**: 保持原值不变（指针为 nil）
3. **提供明确值**: 更新为新值

**业务逻辑说明**:

1. **总开关优先级最高**:
   - 当 `enable_user_auth` 为 `false` 时，无论 `enable_user_login` 和 `enable_user_signup` 的值如何，用户认证功能都会被禁用
   - 前端应该在总开关关闭时禁用登录和注册开关的操作

2. **独立控制子功能**:
   - 当 `enable_user_auth` 为 `true` 时，可以独立控制登录和注册功能
   - 可以只开启登录而关闭注册，或反之

3. **灵活的组合策略**:
   - 企业内部部署：关闭总开关，仅使用 API Key
   - 仅允许登录：开启总开关和登录开关，关闭注册开关
   - 仅允许注册：开启总开关和注册开关，关闭登录开关
   - 公开服务：开启所有开关

**使用场景**:
- 管理员在后台管理页面切换用户认证功能的开关
- 系统维护时临时禁用用户注册或登录功能
- 根据业务需求灵活调整访问策略
- 根据业务需求动态控制用户认证功能的可用性

**重要说明**:
- 禁用用户认证功能后，前端将隐藏登录/注册入口
- 已登录的用户不受影响，仍可继续使用系统
- 管理员登录功能不受此设置影响，始终可用
- 设置更改后立即生效，无需重启服务

---

## 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues: https://github.com/fish2018/UniSearch
- 项目主页: https://so.252035.xyz/


---

## 记住密码功能 API

UniSearch 支持安全的"记住密码"功能，通过刷新令牌（Refresh Token）实现 30 天内自动登录。

**v3.3.0 重要更新** (2026-02-11):
- ✅ 修复长时间未访问后需要重新登录的问题
- 🔄 增强自动刷新机制，支持页面加载时自动恢复登录状态
- ⏰ 访问令牌过期但刷新令牌有效时，自动静默刷新
- 🎯 真正实现 30 天免密登录体验
- 🛡️ 防止重复刷新，避免并发请求导致的令牌冲突
- ⚡ 优化刷新逻辑，提前检测令牌状态并主动刷新

### 存储方式

**v3.2.0 更新**：刷新令牌支持两种存储方式，通过环境变量 `REFRESH_TOKEN_STORAGE` 配置：

1. **数据库存储（推荐，默认）**
   - 存储位置：MySQL 数据库 `refresh_tokens` 表
   - 优势：支持分布式部署、性能更好、便于管理和查询
   - 适用场景：生产环境、多服务器部署
   - 配置：`REFRESH_TOKEN_STORAGE=database`

2. **文件存储（向后兼容）**
   - 存储位置：加密文件 `./cache/refresh_tokens.dat`
   - 优势：简单、无需数据库
   - 适用场景：单机部署、开发测试环境
   - 配置：`REFRESH_TOKEN_STORAGE=file`

### 安全机制

1. **加密存储**: 刷新令牌使用 AES-256-GCM 加密后存储在客户端
2. **服务端存储**: 
   - 数据库模式：令牌明文存储在数据库中，通过索引和外键约束保证数据完整性
   - 文件模式：令牌加密存储在本地文件中
3. **设备绑定**: 刷新令牌与设备指纹绑定，防止跨设备滥用
4. **Token 轮转**: 每次使用刷新令牌获取新访问令牌时，会同时生成新的刷新令牌
5. **自动失效**: 刷新令牌 30 天后自动过期
6. **主动撤销**: 用户登出时立即撤销刷新令牌

---

### 1. 管理员登录（支持记住我）

管理员登录接口，支持"记住我"功能。

**接口地址**: `/api/admin/login-remember`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名（固定为 "admin"） |
| password | string | 是 | 管理员密码 |
| remember_me | boolean | 是 | 是否记住密码（true/false） |
| device_fingerprint | string | 否 | 设备指纹（可选，前端生成） |

**请求示例**:

```json
{
  "username": "admin",
  "password": "your_admin_password",
  "remember_me": true,
  "device_fingerprint": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

**成功响应**:

```json
{
  "access_token": "<AUTH_TOKEN>",
  "expires_at": 1704067200,
  "refresh_token": "encrypted_refresh_token_base64_string",
  "username": "admin"
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| access_token | string | 访问令牌（JWT），有效期 24 小时 |
| expires_at | number | 访问令牌过期时间（Unix 时间戳） |
| refresh_token | string | 刷新令牌（加密后的 Base64 字符串），仅在 remember_me=true 时返回 |
| username | string | 用户名 |

**错误响应**:

```json
{
  "error": "用户名或密码错误",
  "code": "ADMIN_LOGIN_FAILED"
}
```

**错误码说明**:

| 错误码 | HTTP 状态码 | 描述 |
|--------|-------------|------|
| INVALID_REQUEST | 400 | 请求参数错误 |
| ADMIN_LOGIN_FAILED | 401 | 用户名或密码错误 |
| RATE_LIMIT_EXCEEDED | 429 | 请求过于频繁 |
| ADMIN_NOT_CONFIGURED | 500 | 管理员功能未配置 |

---

### 2. 普通用户登录（支持记住我）

普通用户登录接口，支持 API Key 登录和"记住我"功能。

**接口地址**: `/api/auth/login-remember`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名（API Key 登录时固定为 "user"） |
| password | string | 是 | 密码或 API Key |
| remember_me | boolean | 是 | 是否记住密码（true/false） |
| device_fingerprint | string | 否 | 设备指纹（可选，前端生成） |

**请求示例**:

```json
// API Key 登录
{
  "username": "user",
  "password": "<AUTH_TOKEN>",
  "remember_me": true,
  "device_fingerprint": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

**成功响应**:

```json
{
  "access_token": "<AUTH_TOKEN>",
  "expires_at": 1704067200,
  "refresh_token": "encrypted_refresh_token_base64_string",
  "username": "user"
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| access_token | string | 访问令牌（JWT），有效期 24 小时 |
| expires_at | number | 访问令牌过期时间（Unix 时间戳） |
| refresh_token | string | 刷新令牌（加密后的 Base64 字符串），仅在 remember_me=true 时返回 |
| username | string | 用户名 |

**错误响应**:

```json
{
  "error": "API Key 无效或已过期"
}
```

---

### 3. 刷新访问令牌

使用刷新令牌获取新的访问令牌，实现自动登录。

**接口地址**: `/api/auth/refresh`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| refresh_token | string | 是 | 刷新令牌（加密后的 Base64 字符串） |
| device_fingerprint | string | 是 | 设备指纹（必须与登录时一致） |

**请求示例**:

```json
{
  "refresh_token": "encrypted_refresh_token_base64_string",
  "device_fingerprint": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

**成功响应**:

```json
{
  "access_token": "<AUTH_TOKEN>",
  "expires_at": 1704067200,
  "refresh_token": "new_encrypted_refresh_token_base64_string"
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| access_token | string | 新的访问令牌（JWT），有效期 24 小时 |
| expires_at | number | 访问令牌过期时间（Unix 时间戳） |
| refresh_token | string | 新的刷新令牌（Token 轮转机制） |

**错误响应**:

```json
{
  "error": "刷新令牌验证失败: 设备指纹不匹配",
  "code": "REFRESH_TOKEN_VALIDATION_FAILED"
}
```

**错误码说明**:

| 错误码 | HTTP 状态码 | 描述 |
|--------|-------------|------|
| INVALID_REQUEST | 400 | 请求参数错误 |
| INVALID_REFRESH_TOKEN | 401 | 刷新令牌无效 |
| REFRESH_TOKEN_VALIDATION_FAILED | 401 | 刷新令牌验证失败（令牌过期、已撤销或设备指纹不匹配） |
| REFRESH_TOKEN_DISABLED | 403 | 刷新令牌功能未启用 |
| TOKEN_GENERATION_FAILED | 500 | 生成令牌失败 |
| REFRESH_TOKEN_GENERATION_FAILED | 500 | 生成新刷新令牌失败 |
| REFRESH_TOKEN_ENCRYPTION_FAILED | 500 | 加密刷新令牌失败 |

**使用说明**:

1. **自动刷新时机**（v3.3.0 增强）：
   - **页面加载时**：检测访问令牌是否过期或即将过期（5分钟内），如果过期但刷新令牌有效，自动刷新
   - **定时刷新**：在访问令牌过期前 5 分钟自动刷新
   - **长时间未访问**：即使几天未访问，只要刷新令牌未过期（30天内），打开页面时自动恢复登录状态
   - **无令牌恢复**：如果没有访问令牌但有刷新令牌，自动尝试刷新获取新令牌

2. **防重复刷新机制**：
   - 使用 `isRefreshingRef` 标志防止并发刷新请求
   - 确保同一时间只有一个刷新请求在进行
   - 避免令牌轮转冲突和不必要的网络请求

3. **Token 更新**：
   - 使用返回的新访问令牌和新刷新令牌替换旧的令牌
   - 前端自动更新 localStorage 中的令牌
   - 更新后重新设置定时器，确保下次刷新时机准确

4. **失败处理**：
   - 如果刷新失败（刷新令牌过期或无效），清除本地存储的令牌并跳转到登录页
   - 用户需要重新登录

---

### 4. 撤销刷新令牌（登出）

撤销刷新令牌，用户登出时调用。

**接口地址**: `/api/auth/revoke`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| refresh_token | string | 是 | 刷新令牌（加密后的 Base64 字符串） |

**请求示例**:

```json
{
  "refresh_token": "encrypted_refresh_token_base64_string"
}
```

**成功响应**:

```json
{
  "message": "退出成功"
}
```

**错误响应**:

```json
{
  "error": "请求参数错误",
  "code": "INVALID_REQUEST"
}
```

**使用说明**:

1. 用户点击"退出登录"时调用此接口
2. 即使撤销失败，前端也应清除本地存储的所有令牌
3. 撤销后的刷新令牌将无法再次使用

---

### 5. 前端自动刷新实现

前端通过 `useAutoRefreshToken` Hook 实现访问令牌的自动刷新机制，确保用户在 30 天内无需重新登录。

**文件位置**: `frontend/src/hooks/useAutoRefreshToken.ts`

#### 核心功能

1. **页面加载时自动恢复登录状态**
   - 检测本地存储的访问令牌和刷新令牌
   - 如果访问令牌不存在但刷新令牌存在，自动调用刷新接口
   - 如果访问令牌已过期或即将过期（5分钟内），自动刷新

2. **定时自动刷新**
   - 解析 JWT Token 获取过期时间
   - 在过期前 5 分钟自动触发刷新
   - 使用 `setTimeout` 设置精确的刷新时机

3. **防重复刷新机制**
   - 使用 `isRefreshingRef` 标志防止并发刷新
   - 确保同一时间只有一个刷新请求
   - 避免令牌轮转冲突

#### 实现细节

**JWT Token 解析**:
```typescript
const parseJWT = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};
```

**过期检测**:
```typescript
const isTokenExpiredOrExpiring = (token: string, bufferMinutes: number = 5): boolean => {
    const payload = parseJWT(token);
    if (!payload || !payload.exp) {
        return true;
    }

    const expiresAt = payload.exp * 1000; // 转换为毫秒
    const now = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000;

    return now >= (expiresAt - bufferTime);
};
```

**自动刷新逻辑**:
```typescript
useEffect(() => {
    // 1. 没有刷新令牌，不启用自动刷新
    if (!refreshToken) {
        return;
    }

    // 2. 没有访问令牌但有刷新令牌，立即刷新
    if (!token) {
        handleRefresh();
        return;
    }

    // 3. 访问令牌已过期或即将过期，立即刷新
    if (isTokenExpiredOrExpiring(token)) {
        handleRefresh();
        return;
    }

    // 4. 访问令牌有效，设置定时刷新
    const payload = parseJWT(token);
    if (!payload || !payload.exp) {
        return;
    }

    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const refreshTime = expiresAt - 5 * 60 * 1000; // 提前 5 分钟
    const delay = refreshTime - now;

    if (delay > 0) {
        refreshTimerRef.current = setTimeout(() => {
            handleRefresh();
        }, delay);
    }

    // 清理定时器
    return () => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }
    };
}, [token, refreshToken]);
```

**刷新处理函数**:
```typescript
const handleRefresh = async () => {
    // 防止重复刷新
    if (!refreshToken || isRefreshingRef.current) {
        return;
    }

    isRefreshingRef.current = true;

    try {
        const response = await AuthService.refreshAccessToken(refreshToken);

        // 更新令牌
        setToken(
            response.access_token,
            username || 'user',
            isAdmin,
            null,
            response.refresh_token
        );

        console.log('✅ Token 自动刷新成功');
    } catch (error) {
        console.error('❌ 自动刷新令牌失败:', error);
        // 刷新失败，清除认证状态
        logout();
    } finally {
        isRefreshingRef.current = false;
    }
};
```

#### 使用方式

在应用根组件中引入 Hook：

```typescript
import { useAutoRefreshToken } from '@/hooks/useAutoRefreshToken';

function App() {
    // 启用自动刷新
    useAutoRefreshToken();

    return (
        // 应用内容
    );
}
```

#### 工作流程

1. **用户登录**
   - 用户勾选"记住我"并登录
   - 后端返回访问令牌（24小时）和刷新令牌（30天）
   - 前端将两个令牌存储到 localStorage

2. **正常使用期间**
   - Hook 监听令牌状态
   - 在访问令牌过期前 5 分钟自动刷新
   - 用户无感知，持续保持登录状态

3. **长时间未访问后**
   - 用户几天后重新打开页面
   - Hook 检测到访问令牌已过期
   - 自动使用刷新令牌获取新的访问令牌
   - 用户无需重新登录，直接恢复登录状态

4. **刷新令牌过期**
   - 30 天后刷新令牌过期
   - 自动刷新失败
   - Hook 调用 `logout()` 清除本地状态
   - 用户需要重新登录

#### 安全特性

- **防重复刷新**: 使用 `isRefreshingRef` 标志防止并发请求
- **自动清理**: 组件卸载时自动清理定时器
- **错误处理**: 刷新失败时自动登出，避免无效令牌残留
- **令牌轮转**: 每次刷新都会获得新的刷新令牌，提高安全性

---

## 环境变量配置

### 刷新令牌相关配置

在 `.env` 文件中添加以下配置：

```bash
# 刷新令牌功能开关（默认启用）
REFRESH_TOKEN_ENABLED=true

# 刷新令牌有效期（小时，默认 720 小时 = 30 天）
REFRESH_TOKEN_TTL=720

# 刷新令牌存储路径（默认 ./cache/refresh_tokens.dat）
REFRESH_TOKEN_STORE_PATH=./cache/refresh_tokens.dat

# 刷新令牌加密密钥（32 字节，生产环境必须设置）
REFRESH_TOKEN_ENCRYPT_KEY=your-32-byte-secret-key-here-change-in-production
```

**安全建议**:

1. `REFRESH_TOKEN_ENCRYPT_KEY` 必须设置为 32 字节的随机字符串
2. 生产环境中不要使用默认密钥
3. 定期轮换加密密钥（需要重新登录所有用户）
4. 刷新令牌存储文件权限设置为 600（仅所有者可读写）

---

## 前端集成示例

### 1. 设备指纹生成

```typescript
// 使用 Web Crypto API 生成设备指纹
async function generateDeviceFingerprint(): Promise<string> {
    const components = [
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.language,
        // ... 更多浏览器特征
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 2. 登录流程

```typescript
// 管理员登录（支持记住我）
async function adminLogin(username: string, password: string, rememberMe: boolean) {
    const deviceFingerprint = await generateDeviceFingerprint();
    
    const response = await fetch('/api/admin/login-remember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            password,
            remember_me: rememberMe,
            device_fingerprint: deviceFingerprint
        })
    });
    
    const data = await response.json();
    
    // 保存访问令牌
    localStorage.setItem('access_token', data.access_token);
    
    // 如果勾选"记住我"，保存刷新令牌
    if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
    }
}
```

### 3. 自动刷新令牌（v3.3.0 增强版）

**改进说明**：
- ✅ 页面加载时自动检测并恢复登录状态
- ✅ 支持长时间未访问后的自动登录（30天内）
- ✅ 定时刷新机制，在访问令牌过期前5分钟自动刷新

```typescript
/**
 * 解析 JWT Token 获取过期时间
 */
function parseJWT(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

/**
 * 检查 Token 是否已过期或即将过期
 * @param token JWT Token
 * @param bufferMinutes 提前多少分钟判定为即将过期（默认5分钟）
 */
function isTokenExpiredOrExpiring(token: string, bufferMinutes: number = 5): boolean {
    const payload = parseJWT(token);
    if (!payload || !payload.exp) {
        return true;
    }

    const expiresAt = payload.exp * 1000; // 转换为毫秒
    const now = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000;

    return now >= (expiresAt - bufferTime);
}

/**
 * 自动刷新令牌 Hook（React 示例）
 * 
 * 功能：
 * 1. 页面加载时检测 Token 状态，如果已过期但 Refresh Token 有效，自动刷新
 * 2. 在 Token 即将过期前自动使用 Refresh Token 获取新的 Access Token
 * 3. 支持长时间未访问后的自动恢复登录状态（30天内）
 */
function useAutoRefreshToken() {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    let refreshTimer: NodeJS.Timeout | null = null;
    let isRefreshing = false; // 防止重复刷新

    useEffect(() => {
        // 如果没有刷新令牌，不启用自动刷新
        if (!refreshToken) {
            return;
        }

        // 如果没有 Token 但有 Refresh Token，尝试刷新
        if (!token) {
            handleRefresh();
            return;
        }

        // 检查 Token 是否已过期或即将过期
        if (isTokenExpiredOrExpiring(token)) {
            handleRefresh();
            return;
        }

        // Token 有效，设置定时刷新
        const payload = parseJWT(token);
        if (!payload || !payload.exp) {
            return;
        }

        // 计算刷新时间：在过期前 5 分钟刷新
        const expiresAt = payload.exp * 1000;
        const now = Date.now();
        const refreshTime = expiresAt - 5 * 60 * 1000;
        const delay = refreshTime - now;

        // 设置定时器
        if (delay > 0) {
            refreshTimer = setTimeout(() => {
                handleRefresh();
            }, delay);
        }

        // 清理定时器
        return () => {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }
        };
    }, [token, refreshToken]);

    // 刷新令牌处理函数
    async function handleRefresh() {
        if (!refreshToken || isRefreshing) {
            return;
        }

        isRefreshing = true;

        try {
            const deviceFingerprint = await generateDeviceFingerprint();
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refresh_token: refreshToken,
                    device_fingerprint: deviceFingerprint
                })
            });

            const data = await response.json();

            // 更新 Token 和 Refresh Token
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);

            console.log('✅ Token 自动刷新成功');
        } catch (error) {
            console.error('❌ 自动刷新令牌失败:', error);
            // 刷新失败，清除认证状态（Refresh Token 可能已过期）
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
        } finally {
            isRefreshing = false;
        }
    }
}

// 在应用根组件中使用
function App() {
    useAutoRefreshToken(); // 启用自动刷新功能
    
    return (
        <div>
            {/* 应用内容 */}
        </div>
    );
}
```

**使用说明**：

1. **页面加载时自动恢复**：
   - 用户几天未访问网站，再次打开时自动检测 Token 状态
   - 如果 Access Token 已过期但 Refresh Token 有效（30天内），自动静默刷新
   - 用户无需重新登录，直接恢复登录状态

2. **定时自动刷新**：
   - 在 Access Token 过期前 5 分钟自动刷新
   - 用户在使用过程中无感知，不会被强制登出

3. **失败处理**：
   - 如果 Refresh Token 也过期（超过30天），自动跳转到登录页
   - 用户需要重新输入用户名和密码

### 4. 登出流程

```typescript
// 登出时撤销刷新令牌
async function logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
        try {
            await fetch('/api/auth/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
        } catch (error) {
            console.error('撤销刷新令牌失败:', error);
        }
    }
    
    // 清除本地存储
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // 跳转到登录页
    window.location.href = '/login';
}
```

---

## 安全日志

系统会记录以下安全相关事件：

1. **刷新令牌创建**: 记录用户名、设备指纹、创建时间
2. **刷新令牌使用**: 记录使用时间、设备指纹验证结果
3. **刷新令牌撤销**: 记录撤销时间、撤销原因（用户登出/管理员撤销）
4. **刷新令牌验证失败**: 记录失败原因（过期/已撤销/设备指纹不匹配）

日志位置：后端控制台输出

---

## 常见问题

### Q1: 刷新令牌和访问令牌有什么区别？

**访问令牌（Access Token）**:
- 有效期短（24 小时）
- 用于日常 API 调用
- 存储在内存或 localStorage

**刷新令牌（Refresh Token）**:
- 有效期长（30 天）
- 仅用于获取新的访问令牌
- 加密后存储在 localStorage
- 与设备指纹绑定

### Q2: 为什么需要设备指纹？

设备指纹用于防止刷新令牌被盗用。即使攻击者获取了加密的刷新令牌，由于设备指纹不匹配，也无法使用该令牌获取访问令牌。

### Q3: Token 轮转是什么？

每次使用刷新令牌获取新访问令牌时，系统会同时生成新的刷新令牌并撤销旧的刷新令牌。这样可以限制刷新令牌的使用次数，提高安全性。

### Q4: 如果用户更换设备怎么办？

用户更换设备后，设备指纹会改变，旧的刷新令牌将无法使用。用户需要重新登录并勾选"记住我"以在新设备上启用自动登录。

### Q5: 如何强制用户重新登录？

管理员可以通过以下方式强制用户重新登录：
1. 撤销用户的所有刷新令牌（后端提供 `RevokeUserTokens` 方法）
2. 更改 `REFRESH_TOKEN_ENCRYPT_KEY` 环境变量（会使所有刷新令牌失效）

---

## JWT 工具函数技术说明

### 概述

本系统提供了符合 `apikey-mysql-migration` 规范的 JWT Token 生成和验证工具函数，用于实现用户身份认证和权限控制。

### 核心数据结构

#### JWTClaims 结构体

JWT Token 的载荷结构，包含用户身份信息和权限信息。

```go
type JWTClaims struct {
    UserID   uint   `json:"user_id"`  // 用户ID
    Username string `json:"username"` // 用户名
    Role     string `json:"role"`     // 用户角色（admin 或 user）
    jwt.RegisteredClaims
}
```

**字段说明**:
- `UserID`: 用户的唯一标识符（数据库主键）
- `Username`: 用户名，用于显示和日志记录
- `Role`: 用户角色，支持两种值：
  - `admin`: 管理员，拥有所有权限
  - `user`: 普通用户，仅能访问用户接口
- `RegisteredClaims`: JWT 标准字段，包含：
  - `ExpiresAt`: Token 过期时间
  - `IssuedAt`: Token 签发时间
  - `Issuer`: 签发者（固定为 "pansou"）

### 核心函数

#### 1. GenerateJWTToken - 生成 JWT Token

生成包含用户信息的 JWT Token，用于后续 API 调用的身份认证。

**函数签名**:
```go
func GenerateJWTToken(userID uint, username, role, secret string, expiry time.Duration) (string, error)
```

**参数说明**:
- `userID` (uint): 用户ID，必须大于 0
- `username` (string): 用户名，不能为空
- `role` (string): 用户角色，必须为 "admin" 或 "user"
- `secret` (string): JWT 签名密钥，不能为空，建议使用 32 字符以上的随机字符串
- `expiry` (time.Duration): Token 过期时间，建议设置为 24 小时（`24 * time.Hour`）

**返回值**:
- `string`: 生成的 JWT Token 字符串（格式：`<AUTH_TOKEN>`）
- `error`: 错误信息，可能的错误：
  - `username cannot be empty`: 用户名为空
  - `role cannot be empty`: 角色为空
  - `secret cannot be empty`: 密钥为空

**使用示例**:
```go
// 生成普通用户的 Token（有效期 24 小时）
token, err := util.GenerateJWTToken(
    1,                    // 用户ID
    "testuser",          // 用户名
    "user",              // 角色
    "your-secret-key",   // JWT 密钥
    24 * time.Hour,      // 过期时间
)
if err != nil {
    log.Printf("生成 Token 失败: %v", err)
    return
}
fmt.Printf("Token: %s\n", token)

// 生成管理员的 Token
adminToken, err := util.GenerateJWTToken(
    2,
    "admin",
    "admin",
    "your-secret-key",
    24 * time.Hour,
)
```

**验证需求**: 5.5, 5.6, 13.6

---

#### 2. ValidateJWTToken - 验证 JWT Token

验证 JWT Token 的有效性，并解析出用户信息。

**函数签名**:
```go
func ValidateJWTToken(tokenString string, secret string) (*JWTClaims, error)
```

**参数说明**:
- `tokenString` (string): JWT Token 字符串，不能为空
- `secret` (string): JWT 签名密钥，必须与生成时使用的密钥一致

**返回值**:
- `*JWTClaims`: 解析后的 JWT Claims，包含 UserID、Username、Role 等信息
- `error`: 错误信息，可能的错误：
  - `token cannot be empty`: Token 为空
  - `secret cannot be empty`: 密钥为空
  - `unexpected signing method`: 签名算法不正确
  - `token signature is invalid`: Token 签名无效
  - `invalid token`: Token 格式错误或已过期
  - `invalid token: missing user_id`: Token 中缺少 user_id 字段
  - `invalid token: missing username`: Token 中缺少 username 字段
  - `invalid token: missing role`: Token 中缺少 role 字段

**使用示例**:
```go
// 验证 Token
claims, err := util.ValidateJWTToken(tokenString, "your-secret-key")
if err != nil {
    log.Printf("Token 验证失败: %v", err)
    return
}

// 使用解析出的用户信息
fmt.Printf("用户ID: %d\n", claims.UserID)
fmt.Printf("用户名: %s\n", claims.Username)
fmt.Printf("角色: %s\n", claims.Role)
fmt.Printf("过期时间: %v\n", claims.ExpiresAt.Time)

// 检查用户权限
if claims.Role == "admin" {
    fmt.Println("用户是管理员")
} else {
    fmt.Println("用户是普通用户")
}
```

**验证需求**: 5.5, 5.6, 13.6

---

### 安全最佳实践

#### 1. 密钥管理

**强密钥**:
- JWT 签名密钥应使用 32 字符以上的随机字符串
- 建议使用环境变量存储密钥，不要硬编码在代码中
- 生产环境和开发环境应使用不同的密钥

**示例**:
```bash
# .env 文件
JWT_SECRET=your-super-secret-key-with-at-least-32-characters
```

```go
// 从环境变量读取密钥
secret := os.Getenv("JWT_SECRET")
if secret == "" {
    log.Fatal("JWT_SECRET 环境变量未设置")
}
```

#### 2. Token 过期时间

**建议设置**:
- 普通用户：24 小时（`24 * time.Hour`）
- 管理员：12 小时（`12 * time.Hour`）
- 敏感操作：1 小时（`1 * time.Hour`）

**原因**:
- 过期时间过长会增加 Token 被盗用的风险
- 过期时间过短会影响用户体验
- 24 小时是安全性和用户体验的平衡点

#### 3. Token 传输

**HTTP Header 方式（推荐）**:
```
Authorization: Bearer <AUTH_TOKEN>
```

**注意事项**:
- 始终使用 HTTPS 传输 Token
- 不要在 URL 参数中传递 Token
- 不要在日志中记录完整的 Token

#### 4. Token 验证

**必需验证项**:
1. Token 签名是否有效
2. Token 是否已过期
3. Token 中的必需字段是否存在（UserID、Username、Role）
4. 签名算法是否为 HS256

**示例**:
```go
// ValidateJWTToken 已经包含了所有必需的验证
claims, err := util.ValidateJWTToken(tokenString, secret)
if err != nil {
    // Token 无效，拒绝请求
    c.JSON(401, gin.H{"error": "未授权：令牌无效或已过期"})
    c.Abort()
    return
}

// Token 有效，继续处理请求
c.Set("user_id", claims.UserID)
c.Set("username", claims.Username)
c.Set("role", claims.Role)
c.Next()
```

#### 5. 错误处理

**不要泄露具体错误信息**:
```go
// ❌ 错误示例：泄露了具体的错误原因
if err != nil {
    c.JSON(401, gin.H{"error": err.Error()})
    return
}

// ✅ 正确示例：返回通用错误消息
if err != nil {
    log.Printf("Token 验证失败: %v", err) // 记录详细日志
    c.JSON(401, gin.H{"error": "未授权：令牌无效或已过期"}) // 返回通用消息
    return
}
```

---

### 与旧版本的兼容性

系统保留了旧版本的 JWT 函数以保持向后兼容：

#### 旧版本函数（已弃用）

```go
// Claims 结构体（已弃用）
type Claims struct {
    Username string `json:"username"`
    IsAdmin  bool   `json:"is_admin"`
    APIKey   string `json:"api_key"`
    jwt.RegisteredClaims
}

// GenerateToken（已弃用）
func GenerateToken(username string, isAdmin bool, secret string, expiry time.Duration) (string, error)

// ValidateToken（已弃用）
func ValidateToken(tokenString string, secret string) (*Claims, error)
```

**迁移建议**:
- 新代码应使用 `GenerateJWTToken` 和 `ValidateJWTToken`
- 旧代码可以继续使用旧函数，但建议逐步迁移
- 旧版本函数将在未来版本中移除

**迁移示例**:
```go
// 旧代码
token, err := util.GenerateToken("admin", true, secret, 24*time.Hour)
claims, err := util.ValidateToken(token, secret)

// 新代码
token, err := util.GenerateJWTToken(1, "admin", "admin", secret, 24*time.Hour)
claims, err := util.ValidateJWTToken(token, secret)
```

---

### 常见问题

#### Q1: Token 过期后如何处理？

Token 过期后，用户需要重新登录获取新的 Token。系统不支持 Token 刷新机制，这是出于安全考虑。

**建议**:
- 在前端实现 Token 过期检测
- Token 即将过期时提示用户
- Token 过期后自动跳转到登录页面

#### Q2: 如何实现"记住我"功能？

"记住我"功能可以通过延长 Token 过期时间实现：

```go
var expiry time.Duration
if rememberMe {
    expiry = 7 * 24 * time.Hour // 7 天
} else {
    expiry = 24 * time.Hour // 24 小时
}

token, err := util.GenerateJWTToken(userID, username, role, secret, expiry)
```

#### Q3: 如何强制用户重新登录？

可以通过以下方式强制用户重新登录：

1. **更改 JWT 密钥**（会使所有 Token 失效）:
```bash
# 更新 .env 文件中的 JWT_SECRET
JWT_SECRET=new-secret-key
```

2. **实现 Token 黑名单**（需要额外开发）:
```go
// 将 Token 加入黑名单
blacklist.Add(tokenString)

// 验证时检查黑名单
if blacklist.Contains(tokenString) {
    return nil, errors.New("token has been revoked")
}
```

#### Q4: Token 中应该包含哪些信息？

**应该包含**:
- 用户ID（UserID）
- 用户名（Username）
- 角色（Role）
- 过期时间（ExpiresAt）

**不应该包含**:
- 密码或密码哈希
- 敏感个人信息（如身份证号、手机号）
- 大量数据（Token 应保持轻量）

#### Q5: 如何在 Gin 中间件中使用？

```go
func JWTAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 从 Header 中获取 Token
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(401, gin.H{"error": "未提供认证令牌"})
            c.Abort()
            return
        }

        // 2. 验证 Token 格式
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(401, gin.H{"error": "认证令牌格式错误"})
            c.Abort()
            return
        }

        // 3. 验证 Token
        secret := os.Getenv("JWT_SECRET")
        claims, err := util.ValidateJWTToken(parts[1], secret)
        if err != nil {
            c.JSON(401, gin.H{"error": "认证令牌无效或已过期"})
            c.Abort()
            return
        }

        // 4. 将用户信息存入上下文
        c.Set("user_id", claims.UserID)
        c.Set("username", claims.Username)
        c.Set("role", claims.Role)

        c.Next()
    }
}
```

---

### 相关文档

- [MySQL 迁移 API 文档](mysql_migration_api.md)
- [用户认证流程](../design/auth_flow.md)
- [权限控制设计](../design/permission_design.md)

---

**最后更新**: 2026-01-18  
**版本**: v3.0.0


---

## 用户 API Key 管理 API

### 1. 绑定/更新 API Key

将 API Key 绑定到当前登录用户账户。如果用户已绑定其他 Key，将自动解绑旧 Key 并绑定新 Key。

**接口地址**: `/api/user/apikey`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要 JWT Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| key | string | 是 | 要绑定的 API Key（格式：sk-开头的43位字符） |

**请求示例**:

```json
{
  "key": "<AUTH_TOKEN>"
}
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "message": "绑定成功",
  "data": {
    "api_key": "<AUTH_TOKEN>"
  }
}
```

**错误响应**:

- **400 Bad Request** - API Key 格式错误或无效
```json
{
  "code": 400,
  "message": "API Key 格式错误",
  "data": null
}
```

- **400 Bad Request** - API Key 已被其他用户绑定
```json
{
  "code": 400,
  "message": "该 API Key 已被其他用户绑定",
  "data": null
}
```

- **401 Unauthorized** - 未提供有效的 JWT Token
```json
{
  "code": 401,
  "message": "未授权",
  "data": null
}
```

---

### 2. 获取绑定的 API Key

查询当前登录用户绑定的 API Key 信息。

**接口地址**: `/api/user/apikey`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要 JWT Token）

**请求参数**: 无

**成功响应** (200 OK):

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "api_key": "<AUTH_TOKEN>",
    "expires_at": "2024-12-31T23:59:59Z",
    "daily_search_limit": 100,
    "today_search_count": 25,
    "remaining_searches": 75,
    "is_valid": true
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| api_key | string | 绑定的 API Key |
| expires_at | string/null | 过期时间（ISO 8601 格式），null 表示永不过期 |
| daily_search_limit | int | 每日搜索次数限制（0 表示不限制） |
| today_search_count | int | 今日已使用搜索次数 |
| remaining_searches | int | 今日剩余搜索次数（-1 表示无限制） |
| is_valid | bool | API Key 是否有效（未过期且已启用） |

**错误响应**:

- **404 Not Found** - 用户未绑定 API Key
```json
{
  "code": 404,
  "message": "未绑定 API Key",
  "data": null
}
```

- **401 Unauthorized** - 未提供有效的 JWT Token
```json
{
  "code": 401,
  "message": "未授权",
  "data": null
}
```

---

### 3. 解绑 API Key

解除当前登录用户与 API Key 的绑定关系。

**接口地址**: `/api/user/apikey`  
**请求方法**: `DELETE`  
**是否需要认证**: 是（需要 JWT Token）

**请求参数**: 无

**成功响应** (200 OK):

```json
{
  "code": 200,
  "message": "解绑成功",
  "data": null
}
```

**错误响应**:

- **404 Not Found** - 用户未绑定 API Key
```json
{
  "code": 404,
  "message": "未绑定 API Key",
  "data": null
}
```

- **401 Unauthorized** - 未提供有效的 JWT Token
```json
{
  "code": 401,
  "message": "未授权",
  "data": null
}
```

---

## 搜索接口认证说明（更新）

### 混合访问模式

搜索接口 `/api/search` 支持以下三种访问方式：

#### 1. 手动输入 API Key（未登录用户）

在请求头或 URL 参数中提供 API Key：

```bash
# 请求头方式
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <AUTH_TOKEN>" \
  -d '{"kw": "电影"}'

# URL 参数方式
curl -X GET "http://localhost:8888/api/search?kw=电影&key=<AUTH_TOKEN>"
```

#### 2. 使用绑定的 API Key（已登录用户）

提供 JWT Token，系统自动使用用户绑定的 API Key：

```bash
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"kw": "电影"}'
```

**重要说明**：
- 如果用户已登录但未绑定 API Key，搜索请求将被**阻止**
- 前端会在发起搜索前检查用户是否已绑定 API Key
- 如果未绑定，将显示提示消息："请先绑定 API Key 后再进行搜索"
- 用户将被自动跳转到 API Key 设置页面（`/settings/apikey`）
- 绑定 API Key 后即可正常搜索

#### 3. 优先级规则

当请求同时包含手动输入的 API Key 和 JWT Token 时：
- **优先使用手动输入的 API Key**（从 Header `X-API-Key` 或 URL 参数 `key`）
- 如果未提供手动 API Key，则使用 JWT Token 关联的用户绑定 Key
- 如果两者都未提供，返回 401 错误

---

## 前端搜索流程说明

### 搜索前 API Key 检查机制

为了提供更好的用户体验，前端在发起搜索请求前会执行以下检查流程：

#### 检查流程

1. **用户点击搜索按钮或按下回车键**
2. **检查用户登录状态**
   - 如果用户未登录：允许搜索（需要手动输入 API Key）
   - 如果用户已登录：继续下一步检查

3. **检查 API Key 绑定状态**（仅针对已登录用户）
   - 发送 GET 请求到 `/api/user/apikey`
   - 如果返回 404（未绑定）：
     - **阻止搜索请求**
     - 显示 Toast 提示："请先绑定 API Key 后再进行搜索"
     - 自动跳转到 API Key 设置页面（`/settings/apikey`）
   - 如果返回 200（已绑定）：允许搜索

4. **执行搜索请求**
   - 使用用户绑定的 API Key 或手动输入的 API Key
   - 显示搜索结果

#### 用户体验优化

**优点**：
- ✅ 提前检查，避免无效的搜索请求
- ✅ 友好的提示消息，明确告知用户需要绑定 API Key
- ✅ 自动跳转到设置页面，减少用户操作步骤
- ✅ 统一的错误处理，提升用户体验

**适用场景**：
- 用户首次登录后尝试搜索
- 用户解绑 API Key 后尝试搜索
- 用户的 API Key 被管理员删除后尝试搜索

#### 前端实现示例

```typescript
// 搜索前检查
async function handleSearch(keyword: string) {
  // 1. 检查用户是否已登录
  if (isAuthenticated && token) {
    try {
      // 2. 检查是否已绑定 API Key
      const response = await fetch('/api/user/apikey', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        // 3. 未绑定 API Key，阻止搜索
        toast.warning('请先绑定 API Key 后再进行搜索', {
          duration: 3000,
        });
        navigate('/settings/apikey');
        return; // 阻止搜索请求
      }
    } catch (error) {
      console.error('检查 API Key 绑定状态失败:', error);
      toast.error('无法验证 API Key 绑定状态，请稍后重试');
      return;
    }
  }

  // 4. 执行搜索
  try {
    await performSearch({ keyword });
  } catch (error) {
    // 处理搜索错误
    if (error.code === 401 || error.code === 404) {
      toast.warning('请先绑定 API Key 后再进行搜索');
      navigate('/settings/apikey');
    } else {
      toast.error(error.message || '搜索失败');
    }
  }
}
```

---

## 使用流程示例

### 场景 1：普通用户首次使用

1. **注册账户**
```bash
curl -X POST http://localhost:8888/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "pass123"}'
```

2. **登录获取 Token**
```bash
curl -X POST http://localhost:8888/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "pass123"}'
```

响应：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "<AUTH_TOKEN>",
    "expires_at": 1735689599,
    "username": "user1"
  }
}
```

3. **绑定 API Key**（从管理员处获取）
```bash
curl -X POST http://localhost:8888/api/user/apikey \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -d '{"api_key": "<AUTH_TOKEN>"}'
```

4. **开始搜索**（无需再输入 API Key）
```bash
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -d '{"kw": "电影"}'
```

### 场景 2：未登录用户临时搜索

直接使用 API Key 进行搜索（无需注册登录）：

```bash
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <AUTH_TOKEN>" \
  -d '{"kw": "电影"}'
```

---


---

## 用户管理 API

用户管理模块提供完整的用户生命周期管理功能，包括用户的增删改查、状态管理、批量操作等。

**权限要求**: 所有用户管理接口都需要管理员权限（JWT Token 认证 + 管理员角色）

### 1. 获取用户列表

获取系统中所有用户的列表，支持分页、搜索和筛选。

**接口地址**: `GET /api/admin/users`

**请求头**:
```
Authorization: Bearer <admin_token>
```

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| page_size | int | 否 | 每页数量，默认 20，最大 100 |
| keyword | string | 否 | 搜索关键词（用户名模糊匹配） |
| role | string | 否 | 角色筛选（admin 或 user） |

**返回示例**:
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "is_enabled": true,
      "last_login_at": "2026-01-19T10:30:00Z",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-19T10:30:00Z"
    },
    {
      "id": 2,
      "username": "user1",
      "role": "user",
      "is_enabled": true,
      "last_login_at": "2026-01-18T15:20:00Z",
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-01-18T15:20:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

**错误码**:
- `401 UNAUTHORIZED`: 未授权（Token 无效或过期）
- `403 FORBIDDEN`: 权限不足（非管理员）
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 2. 获取单个用户

根据用户 ID 获取用户详细信息。

**接口地址**: `GET /api/admin/users/:id`

**请求头**:
```
Authorization: Bearer <admin_token>
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | int | 是 | 用户 ID |

**返回示例**:
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "is_enabled": true,
  "last_login_at": "2026-01-19T10:30:00Z",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-19T10:30:00Z"
}
```

**错误码**:
- `400 INVALID_USER_ID`: 无效的用户 ID
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `404 USER_NOT_FOUND`: 用户不存在
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 3. 创建用户

创建新的用户账户。

**接口地址**: `POST /api/admin/users`

**请求头**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | 用户名（3-32 字符，只能包含字母、数字、下划线、连字符） |
| password | string | 是 | 密码（6-64 字符） |
| role | string | 是 | 角色（admin 或 user） |

**返回示例**:
```json
{
  "id": 3,
  "username": "newuser",
  "role": "user",
  "is_enabled": true,
  "last_login_at": null,
  "created_at": "2026-01-19T11:00:00Z",
  "updated_at": "2026-01-19T11:00:00Z"
}
```

**错误码**:
- `400 INVALID_REQUEST`: 请求参数错误
- `400 INVALID_USERNAME`: 用户名格式错误
- `400 INVALID_PASSWORD`: 密码格式错误
- `400 INVALID_ROLE`: 角色值无效
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `409 USERNAME_EXISTS`: 用户名已存在
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 4. 更新用户

更新用户的用户名和角色。

**接口地址**: `PUT /api/admin/users/:id`

**请求头**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | int | 是 | 用户 ID |

**请求体**:
```json
{
  "username": "updateduser",
  "role": "admin"
}
```

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | 新用户名（3-32 字符） |
| role | string | 是 | 新角色（admin 或 user） |

**返回示例**:
```json
{
  "id": 3,
  "username": "updateduser",
  "role": "admin",
  "is_enabled": true,
  "last_login_at": null,
  "created_at": "2026-01-19T11:00:00Z",
  "updated_at": "2026-01-19T11:30:00Z"
}
```

**错误码**:
- `400 INVALID_REQUEST`: 请求参数错误
- `400 INVALID_USERNAME`: 用户名格式错误
- `400 INVALID_ROLE`: 角色值无效
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `403 CANNOT_MODIFY_SELF_ROLE`: 不能修改自己的角色
- `404 USER_NOT_FOUND`: 用户不存在
- `409 USERNAME_EXISTS`: 用户名已存在
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 5. 重置密码

重置用户的密码。

**接口地址**: `POST /api/admin/users/:id/reset-password`

**请求头**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | int | 是 | 用户 ID |

**请求体**:
```json
{
  "password": "newpassword123"
}
```

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| password | string | 是 | 新密码（6-64 字符） |

**返回示例**:
```json
{
  "message": "密码重置成功"
}
```

**错误码**:
- `400 INVALID_REQUEST`: 请求参数错误
- `400 INVALID_PASSWORD`: 密码格式错误
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `404 USER_NOT_FOUND`: 用户不存在
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 6. 删除用户

删除指定的用户（软删除）。

**接口地址**: `DELETE /api/admin/users/:id`

**请求头**:
```
Authorization: Bearer <admin_token>
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | int | 是 | 用户 ID |

**返回示例**:
```json
{
  "message": "用户已删除"
}
```

**错误码**:
- `400 INVALID_USER_ID`: 无效的用户 ID
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `403 CANNOT_DELETE_SELF`: 不能删除自己
- `403 CANNOT_DELETE_LAST_ADMIN`: 不能删除最后一个管理员
- `404 USER_NOT_FOUND`: 用户不存在
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 7. 设置用户状态

启用或禁用用户账户。

**接口地址**: `POST /api/admin/users/:id/status`

**请求头**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | int | 是 | 用户 ID |

**请求体**:
```json
{
  "is_enabled": false
}
```

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| is_enabled | boolean | 是 | 是否启用（true 启用，false 禁用） |

**返回示例**:
```json
{
  "message": "用户状态已更新"
}
```

**错误码**:
- `400 INVALID_REQUEST`: 请求参数错误
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `403 CANNOT_DISABLE_SELF`: 不能禁用自己的账户
- `404 USER_NOT_FOUND`: 用户不存在
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 8. 批量删除用户

批量删除多个用户。

**接口地址**: `POST /api/admin/users/batch-delete`

**请求头**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**:
```json
{
  "user_ids": [2, 3, 4]
}
```

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_ids | array | 是 | 用户 ID 列表（至少包含 1 个 ID） |

**返回示例**:
```json
{
  "success_count": 2,
  "failed_count": 1,
  "success": [2, 3],
  "failed": [
    {
      "id": 4,
      "error": "不能删除最后一个管理员"
    }
  ]
}
```

**错误码**:
- `400 INVALID_REQUEST`: 请求参数错误
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

### 9. 批量修改角色

批量修改多个用户的角色。

**接口地址**: `POST /api/admin/users/batch-update-role`

**请求头**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**:
```json
{
  "user_ids": [2, 3, 4],
  "role": "admin"
}
```

**请求参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_ids | array | 是 | 用户 ID 列表（至少包含 1 个 ID） |
| role | string | 是 | 目标角色（admin 或 user） |

**返回示例**:
```json
{
  "success_count": 3,
  "failed_count": 0,
  "success": [2, 3, 4],
  "failed": []
}
```

**错误码**:
- `400 INVALID_REQUEST`: 请求参数错误
- `400 INVALID_ROLE`: 角色值无效
- `401 UNAUTHORIZED`: 未授权
- `403 FORBIDDEN`: 权限不足
- `500 INTERNAL_SERVER_ERROR`: 服务器内部错误

---

## 用户管理业务规则

### 权限控制
- 所有用户管理接口都需要管理员权限
- 使用 JWT Token 进行认证
- Token 在 HTTP Header 中传输：`Authorization: Bearer <token>`

### 用户名规则
- 长度：3-32 字符
- 允许字符：字母、数字、下划线（_）、连字符（-）
- 必须唯一

### 密码规则
- 长度：6-64 字符
- 使用 bcrypt 加密存储（cost=10）
- 密码哈希永不返回给前端

### 角色类型
- `admin`: 管理员，可以访问所有管理功能
- `user`: 普通用户，只能访问基本功能

### 业务约束
1. **不能删除自己**: 管理员不能删除自己的账户
2. **不能修改自己的角色**: 管理员不能修改自己的角色
3. **不能禁用自己**: 管理员不能禁用自己的账户
4. **保留最后一个管理员**: 系统必须至少保留一个管理员账户
5. **禁用用户无法登录**: 被禁用的用户无法登录系统

### 软删除机制
- 删除用户时使用软删除（设置 `deleted_at` 字段）
- 软删除的用户不会出现在用户列表中
- 数据库记录仍然保留，可用于审计

### 批量操作
- 批量操作会跳过当前用户
- 批量操作会跳过不符合条件的用户
- 返回成功和失败的用户 ID 列表
- 使用事务确保数据一致性

---

## 系统设置接口

### 获取系统设置（公开接口）

获取系统设置信息，用于前端判断是否显示用户登录注册功能。

**接口地址**: `/api/system-settings`  
**请求方法**: `GET`  
**是否需要认证**: 否（公开接口）

#### 请求示例

```bash
curl -X GET http://localhost:8888/api/system-settings
```

#### 成功响应 (200 OK)

```json
{
  "enable_user_auth": true,
  "enable_user_login": true,
  "enable_user_signup": true
}
```

**响应字段说明**:
- `enable_user_auth` (boolean): 是否启用用户登录注册功能（主开关）
  - `true`: 启用，登录页面显示用户认证相关选项
  - `false`: 禁用，登录页面仅显示 API Key 登录选项
- `enable_user_login` (boolean): 是否启用用户登录功能（子选项）
  - 仅在 `enable_user_auth` 为 `true` 时生效
  - `true`: 显示用户名密码登录选项
  - `false`: 隐藏用户名密码登录选项
- `enable_user_signup` (boolean): 是否启用用户注册功能（子选项）
  - 仅在 `enable_user_auth` 为 `true` 时生效
  - `true`: 显示用户注册选项
  - `false`: 隐藏用户注册选项

#### 错误响应

**500 Internal Server Error** - 服务器内部错误

```json
{
  "error": "获取系统设置失败：数据库连接错误"
}
```

---

### 获取系统设置（管理员接口）

管理员获取系统设置信息。

**接口地址**: `/api/admin/system-settings`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要管理员 Token）

#### 请求示例

```bash
curl -X GET http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>"
```

#### 成功响应 (200 OK)

```json
{
  "enable_user_auth": true,
  "enable_user_login": true,
  "enable_user_signup": true
}
```

#### 错误响应

**401 Unauthorized** - 未授权

```json
{
  "error": "未授权：需要管理员令牌",
  "code": "ADMIN_TOKEN_REQUIRED"
}
```

**500 Internal Server Error** - 服务器内部错误

```json
{
  "error": "获取系统设置失败：数据库连接错误"
}
```

---

### 更新系统设置

管理员更新系统设置。支持单独更新主开关或子选项。

**接口地址**: `/api/admin/system-settings`  
**请求方法**: `PUT`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

#### 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| enable_user_auth | boolean | 否 | 是否启用用户登录注册功能（主开关） |
| enable_user_login | boolean | 否 | 是否启用用户登录功能（子选项） |
| enable_user_signup | boolean | 否 | 是否启用用户注册功能（子选项） |

**注意**: 至少需要提供一个参数。

#### 请求示例

```bash
# 启用用户登录注册功能（主开关）
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_auth": true
  }'

# 禁用用户登录注册功能（仅保留 API Key 登录）
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_auth": false
  }'

# 单独控制登录功能（禁用登录，保留注册）
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_login": false
  }'

# 单独控制注册功能（禁用注册，保留登录）
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_signup": false
  }'

# 同时更新多个选项
curl -X PUT http://localhost:8888/api/admin/system-settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_user_auth": true,
    "enable_user_login": true,
    "enable_user_signup": false
  }'
```

#### 成功响应 (200 OK)

```json
{
  "message": "系统设置已更新",
  "enable_user_auth": true,
  "enable_user_login": true,
  "enable_user_signup": false
}
```

**响应字段说明**:
- `message` (string): 操作结果消息
- `enable_user_auth` (boolean): 更新后的主开关值
- `enable_user_login` (boolean): 更新后的登录功能开关值
- `enable_user_signup` (boolean): 更新后的注册功能开关值

#### 错误响应

**400 Bad Request** - 请求参数错误

```json
{
  "error": "请求参数错误：至少需要提供一个设置字段"
}
```

**401 Unauthorized** - 未授权

```json
{
  "error": "未授权：需要管理员令牌",
  "code": "ADMIN_TOKEN_REQUIRED"
}
```

**500 Internal Server Error** - 服务器内部错误

```json
{
  "error": "更新系统设置失败：数据库写入错误"
}
```

---

## 系统设置业务规则

### 功能说明
- 系统设置用于控制前端登录页面的显示行为
- **主开关** (`enable_user_auth`):
  - 当为 `true` 时，启用用户认证功能，子选项生效
  - 当为 `false` 时，禁用所有用户认证功能，登录页面仅显示 API Key 登录选项
- **子选项** (`enable_user_login` 和 `enable_user_signup`):
  - 仅在主开关为 `true` 时生效
  - 可以单独控制登录和注册功能的显示

### 显示逻辑

| enable_user_auth | enable_user_login | enable_user_signup | 登录页面显示 |
|------------------|-------------------|-------------------|-------------|
| false | * | * | 仅显示 API Key 登录 |
| true | true | true | 登录 + 注册 + API Key |
| true | true | false | 登录 + API Key |
| true | false | true | 注册 + API Key |
| true | false | false | 仅显示 API Key 登录 |

### 权限控制
- 获取系统设置（公开接口）：无需认证，任何人都可以访问
- 更新系统设置：需要管理员权限

### 默认值
- 首次部署时，所有开关默认为 `true`（全部启用）
- 如果数据库中没有设置记录，系统会自动创建默认设置

### 使用场景
1. **完全开放**：启用所有功能，用户可以自由注册和登录
2. **仅登录**：禁用注册，仅允许已有用户登录（适合封闭系统）
3. **仅注册**：禁用登录，仅允许新用户注册（适合特殊场景）
4. **仅 API Key**：禁用所有用户认证，仅通过 API Key 访问（适合企业内部）

---

## Redis 缓存机制

### 缓存共享策略

UniSearch 使用 Redis 实现跨用户的缓存共享机制，提升系统性能和响应速度。

#### 缓存键生成规则

**TG 搜索缓存键**:
```
格式: tg:search:{query_hash}
示例: tg:search:a1b2c3d4e5f6...
```

**插件搜索缓存键**:
```
格式: plugin:search:{query_hash}
示例: plugin:search:x1y2z3a4b5c6...
```

**关键特性**:
- 缓存键仅基于搜索关键词（SHA256 哈希）
- 不包含用户 ID 或任何用户相关信息
- 相同关键词的搜索结果在所有用户间共享

#### 缓存续期机制（热数据保活）

**v3.2.0 新增功能**：自动缓存续期

当用户访问缓存数据时，系统会自动刷新缓存的过期时间（TTL），实现热数据保活。

**工作原理**:

1. **用户 A 首次搜索**:
   ```
   搜索关键词: "复仇者联盟"
   → 生成缓存键: tg:search:abc123...
   → Redis 中无缓存，执行实际搜索
   → 写入 Redis，TTL = 1 小时
   ```

2. **用户 B 在 30 分钟后搜索相同关键词**:
   ```
   搜索关键词: "复仇者联盟"
   → 生成相同缓存键: tg:search:abc123...
   → 从 Redis 读取缓存（命中）
   → 自动刷新 TTL = 1 小时（重新计时）
   → 返回缓存结果
   ```

3. **用户 C 在 45 分钟后搜索相同关键词**:
   ```
   → 从 Redis 读取缓存（命中）
   → 再次刷新 TTL = 1 小时
   → 返回缓存结果
   ```

**续期策略**:
- ✅ **异步刷新**: TTL 刷新操作在后台异步执行，不阻塞响应
- ✅ **自动触发**: 每次缓存读取成功后自动触发
- ✅ **失败容错**: TTL 刷新失败不影响数据返回，仅记录警告日志
- ✅ **热数据保活**: 频繁访问的数据会持续保持在缓存中

**日志示例**:
```
✅ [TG搜索:复仇者联盟] Redis 缓存命中，结果数: 25
🔄 缓存 TTL 已刷新 - 键: tg:search:abc123..., 新TTL: 1h0m0s
```

#### 缓存配置

**默认 TTL**: 1 小时（3600 秒）

**配置方式**:
```bash
# .env 文件
REDIS_CACHE_TTL=3600  # 单位：秒
```

**Redis 连接配置**:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### 性能优势

| 场景 | 无缓存续期 | 有缓存续期 |
|------|-----------|-----------|
| 热门关键词（每 30 分钟有用户搜索） | 每小时重新搜索 1 次 | 持续使用缓存，无需重新搜索 |
| 冷门关键词（1 小时内无人搜索） | 缓存过期，下次重新搜索 | 缓存过期，下次重新搜索 |
| 系统负载 | 较高 | 显著降低 |
| 响应速度 | 周期性变慢 | 持续快速 |

#### 使用建议

1. **热门资源**: 频繁搜索的关键词会自动保持在缓存中，无需手动管理
2. **强制刷新**: 如需获取最新数据，使用 `refresh=true` 参数绕过缓存
3. **监控日志**: 通过日志中的 🔄 标记监控缓存续期情况
4. **TTL 调整**: 根据业务需求调整 `REDIS_CACHE_TTL` 配置

#### API 方法

**自动续期（推荐）**:
```go
// 读取缓存时自动异步刷新 TTL
err := cache.Get(ctx, key, &result)
```

**同步续期**:
```go
// 读取缓存并同步等待 TTL 刷新完成
err := cache.GetAndRefresh(ctx, key, &result)
```

**手动续期**:
```go
// 手动刷新指定缓存的 TTL
err := cache.RefreshTTL(ctx, key)
```

---


---

## 公告管理接口

### 概述

公告管理功能允许管理员创建、管理和发布系统公告，用户在登录后会自动看到最新的有效公告。

**功能特性**：
- 完整的公告 CRUD 操作
- 系统级别的功能开关控制
- 基于时间的自动生效/失效控制
- 优先级管理和排序
- 用户已读状态追踪（基于本地存储）
- 富文本内容支持
- 默认禁用，需手动启用

---

### 1. 获取公告功能启用状态

获取系统公告功能的启用状态。

**接口地址**: `GET /api/system-settings/announcement-enabled`

**权限要求**: 无（公开接口）

**请求参数**: 无

**返回示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "enabled": false
  }
}
```

**字段说明**:
- `enabled` (boolean): 公告功能是否启用

---

### 2. 设置公告功能启用状态

设置系统公告功能的启用状态（管理员专用）。

**接口地址**: `POST /api/system-settings/announcement-enabled`

**权限要求**: 管理员

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求参数**:
```json
{
  "enabled": true
}
```

**参数说明**:
- `enabled` (boolean, 必填): 是否启用公告功能

**返回示例**:
```json
{
  "code": 200,
  "message": "设置成功"
}
```

**错误响应**:
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 非管理员用户
- `500 Internal Server Error`: 服务器内部错误

---

### 3. 获取当前有效公告

获取当前有效的公告列表（用户端）。

**接口地址**: `GET /api/announcements/active`

**权限要求**: 已登录用户

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求参数**: 无

**返回示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": [
    {
      "id": 1,
      "title": "系统维护通知",
      "content": "<p>系统将于今晚进行维护...</p>",
      "priority": "high",
      "start_time": "2024-01-20T00:00:00Z",
      "end_time": "2024-01-21T00:00:00Z",
      "is_enabled": true,
      "created_at": "2024-01-19T10:00:00Z",
      "updated_at": "2024-01-19T10:00:00Z",
      "created_by": "admin",
      "updated_by": ""
    }
  ]
}
```

**字段说明**:
- `id` (uint): 公告 ID
- `title` (string): 公告标题
- `content` (string): 公告内容（HTML 格式）
- `priority` (string): 优先级（`high`/`medium`/`low`）
- `start_time` (string): 生效时间（ISO 8601 格式）
- `end_time` (string|null): 失效时间（ISO 8601 格式，null 表示永久有效）
- `is_enabled` (boolean): 是否启用
- `created_at` (string): 创建时间
- `updated_at` (string): 更新时间
- `created_by` (string): 创建者用户名
- `updated_by` (string): 最后更新者用户名

**说明**:
- 如果公告功能未启用，返回空数组
- 只返回满足以下条件的公告：
  - 启用状态为 true
  - 当前时间在生效时间和失效时间之间
  - 按优先级（高→中→低）和创建时间（新→旧）排序

**错误响应**:
- `401 Unauthorized`: 未授权访问
- `500 Internal Server Error`: 服务器内部错误

---

### 4. 创建公告

创建新的系统公告（管理员专用）。

**接口地址**: `POST /api/announcements`

**权限要求**: 管理员

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求参数**:
```json
{
  "title": "系统维护通知",
  "content": "<p>系统将于今晚进行维护...</p>",
  "priority": "high",
  "start_time": "2024-01-20T00:00:00Z",
  "end_time": "2024-01-21T00:00:00Z",
  "is_enabled": true
}
```

**参数说明**:
- `title` (string, 必填): 公告标题，最大 200 字符
- `content` (string, 必填): 公告内容，支持 HTML 格式
- `priority` (string, 必填): 优先级，可选值：`high`、`medium`、`low`
- `start_time` (string, 必填): 生效时间，ISO 8601 格式
- `end_time` (string, 可选): 失效时间，ISO 8601 格式，不填表示永久有效
- `is_enabled` (boolean, 必填): 是否启用

**返回示例**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 1,
    "title": "系统维护通知",
    "content": "<p>系统将于今晚进行维护...</p>",
    "priority": "high",
    "start_time": "2024-01-20T00:00:00Z",
    "end_time": "2024-01-21T00:00:00Z",
    "is_enabled": true,
    "created_at": "2024-01-19T10:00:00Z",
    "updated_at": "2024-01-19T10:00:00Z",
    "created_by": "admin",
    "updated_by": ""
  }
}
```

**错误响应**:
- `400 Bad Request`: 数据验证失败
  - 标题或内容为空
  - 失效时间早于或等于生效时间
  - 优先级值无效
  - 标题超过 200 字符
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 非管理员用户
- `500 Internal Server Error`: 服务器内部错误

**验证错误示例**:
```json
{
  "code": 400,
  "message": "数据验证失败",
  "data": {
    "error": "失效时间必须晚于生效时间",
    "field": "end_time"
  }
}
```

---

### 5. 更新公告

更新现有的系统公告（管理员专用）。

**接口地址**: `PUT /api/announcements/:id`

**权限要求**: 管理员

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**路径参数**:
- `id` (uint): 公告 ID

**请求参数**:
```json
{
  "title": "系统维护通知（更新）",
  "content": "<p>维护时间调整...</p>",
  "priority": "medium",
  "start_time": "2024-01-20T02:00:00Z",
  "end_time": "2024-01-21T02:00:00Z",
  "is_enabled": true
}
```

**参数说明**: 同创建公告接口

**返回示例**: 同创建公告接口

**错误响应**:
- `400 Bad Request`: 数据验证失败或无效的公告 ID
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 非管理员用户
- `404 Not Found`: 公告不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 6. 删除公告

删除指定的系统公告（管理员专用）。

**接口地址**: `DELETE /api/announcements/:id`

**权限要求**: 管理员

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**路径参数**:
- `id` (uint): 公告 ID

**请求参数**: 无

**返回示例**:
```json
{
  "code": 200,
  "message": "删除成功"
}
```

**错误响应**:
- `400 Bad Request`: 无效的公告 ID
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 非管理员用户
- `404 Not Found`: 公告不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 7. 获取公告列表

获取所有公告的列表（管理员专用）。

**接口地址**: `GET /api/announcements`

**权限要求**: 管理员

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**查询参数**:
- `page` (int, 可选): 页码，默认 1，最小 1
- `page_size` (int, 可选): 每页数量，默认 20，范围 1-100
- `sort_by` (string, 可选): 排序字段，可选值：`created_at`、`priority`、`start_time`，默认 `created_at`
- `sort_order` (string, 可选): 排序方向，可选值：`asc`、`desc`，默认 `desc`

**请求示例**:
```
GET /api/announcements?page=1&page_size=20&sort_by=created_at&sort_order=desc
```

**返回示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "announcements": [
      {
        "id": 1,
        "title": "系统维护通知",
        "content": "<p>系统将于今晚进行维护...</p>",
        "priority": "high",
        "start_time": "2024-01-20T00:00:00Z",
        "end_time": "2024-01-21T00:00:00Z",
        "is_enabled": true,
        "created_at": "2024-01-19T10:00:00Z",
        "updated_at": "2024-01-19T10:00:00Z",
        "created_by": "admin",
        "updated_by": ""
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

**字段说明**:
- `announcements` (array): 公告列表
- `total` (int64): 总记录数
- `page` (int): 当前页码
- `page_size` (int): 每页数量
- `total_pages` (int): 总页数

**错误响应**:
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 非管理员用户
- `500 Internal Server Error`: 服务器内部错误

---

### 8. 获取单个公告

获取指定公告的详细信息（管理员专用）。

**接口地址**: `GET /api/announcements/:id`

**权限要求**: 管理员

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**路径参数**:
- `id` (uint): 公告 ID

**请求参数**: 无

**返回示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": 1,
    "title": "系统维护通知",
    "content": "<p>系统将于今晚进行维护...</p>",
    "priority": "high",
    "start_time": "2024-01-20T00:00:00Z",
    "end_time": "2024-01-21T00:00:00Z",
    "is_enabled": true,
    "created_at": "2024-01-19T10:00:00Z",
    "updated_at": "2024-01-19T10:00:00Z",
    "created_by": "admin",
    "updated_by": ""
  }
}
```

**错误响应**:
- `400 Bad Request`: 无效的公告 ID
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 非管理员用户
- `404 Not Found`: 公告不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 9. 设置公告状态

设置公告的启用/禁用状态（管理员专用）。

**接口地址**: `POST /api/announcements/:id/status`

**权限要求**: 管理员

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**路径参数**:
- `id` (uint): 公告 ID

**请求参数**:
```json
{
  "is_enabled": false
}
```

**参数说明**:
- `is_enabled` (boolean, 必填): 是否启用

**返回示例**:
```json
{
  "code": 200,
  "message": "状态更新成功"
}
```

**错误响应**:
- `400 Bad Request`: 无效的公告 ID 或请求参数错误
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 非管理员用户
- `404 Not Found`: 公告不存在
- `500 Internal Server Error`: 服务器内部错误

---

### 公告接口使用流程

#### 管理员操作流程

1. **启用公告功能**
   ```bash
   POST /api/system-settings/announcement-enabled
   { "enabled": true }
   ```

2. **创建公告**
   ```bash
   POST /api/announcements
   {
     "title": "系统维护通知",
     "content": "<p>系统将于今晚进行维护...</p>",
     "priority": "high",
     "start_time": "2024-01-20T00:00:00Z",
     "end_time": "2024-01-21T00:00:00Z",
     "is_enabled": true
   }
   ```

3. **查看公告列表**
   ```bash
   GET /api/announcements?page=1&page_size=20
   ```

4. **更新公告**
   ```bash
   PUT /api/announcements/1
   {
     "title": "系统维护通知（更新）",
     ...
   }
   ```

5. **禁用公告**
   ```bash
   POST /api/announcements/1/status
   { "is_enabled": false }
   ```

6. **删除公告**
   ```bash
   DELETE /api/announcements/1
   ```

#### 用户操作流程

1. **检查功能是否启用**
   ```bash
   GET /api/system-settings/announcement-enabled
   ```

2. **获取有效公告**
   ```bash
   GET /api/announcements/active
   ```

3. **前端处理**
   - 将已读公告 ID 存储到 localStorage
   - 过滤掉已读公告
   - 显示公告弹窗

---

### 注意事项

1. **权限控制**
   - 所有管理接口需要管理员权限
   - 用户端接口需要登录用户权限
   - 功能开关查询接口为公开接口

2. **时间格式**
   - 所有时间字段使用 ISO 8601 格式（`2024-01-20T00:00:00Z`）
   - 时区统一使用 UTC

3. **内容安全**
   - 公告内容支持 HTML 格式
   - 前端需要进行 XSS 防护（使用 DOMPurify）

4. **功能开关**
   - 默认状态为禁用
   - 功能禁用时，用户端接口返回空数组
   - 管理端接口不受功能开关影响

5. **已读状态**
   - 已读状态存储在前端 localStorage
   - 格式：`{ "1": true, "2": true }`
   - key 为公告 ID，value 为 true 表示已读

6. **优先级排序**
   - 高优先级（high）> 中优先级（medium）> 低优先级（low）
   - 相同优先级按创建时间倒序排序

7. **有效性判断**
   - 公告有效条件：启用状态为 true + 当前时间在生效时间和失效时间之间
   - 失效时间为 null 表示永久有效

---

## TG 频道管理 API

管理 Telegram 搜索频道的增删改查，支持启用/禁用、排序调整和可用性测试。所有接口需要管理员 JWT Token 认证。

### 1. 获取频道列表

获取所有已配置的 Telegram 频道（按 sort_order 排序）。

**接口地址**: `/api/admin/channels`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要管理员 Token）

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/admin/channels \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "channels": [
    {
      "id": 1,
      "name": "tgsearchers3",
      "is_enabled": true,
      "sort_order": 0,
      "created_at": "2026-02-15T10:00:00Z",
      "updated_at": "2026-02-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "aaborunovi",
      "is_enabled": true,
      "sort_order": 1,
      "created_at": "2026-02-15T10:00:00Z",
      "updated_at": "2026-02-15T10:00:00Z"
    }
  ]
}
```

**字段说明**:
- `id` (number): 频道 ID（主键，自增）
- `name` (string): 频道名称（唯一索引）
- `is_enabled` (boolean): 是否启用（禁用的频道不参与搜索）
- `sort_order` (number): 排序权重（越小越靠前）
- `created_at` (string): 创建时间（ISO 8601）
- `updated_at` (string): 更新时间（ISO 8601）

**状态码**:
- `200`: 获取成功
- `401`: 未授权
- `500`: 服务器内部错误

---

### 2. 添加频道

添加一个新的 Telegram 搜索频道。

**接口地址**: `/api/admin/channels`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 是 | 频道名称（不含 @ 前缀） |

**请求示例**:

```json
{
  "name": "tgsearchers3"
}
```

**成功响应** (200 OK):

```json
{
  "channel": {
    "id": 3,
    "name": "tgsearchers3",
    "is_enabled": true,
    "sort_order": 2,
    "created_at": "2026-02-15T10:00:00Z",
    "updated_at": "2026-02-15T10:00:00Z"
  }
}
```

**错误响应**:

```json
{
  "error": "频道 tgsearchers3 已存在"
}
```

**状态码**:
- `200`: 添加成功
- `400`: 参数错误或频道名已存在
- `401`: 未授权
- `500`: 服务器内部错误

---

### 3. 更新频道

更新指定频道的配置信息。

**接口地址**: `/api/admin/channels/:id`  
**请求方法**: `PUT`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 描述 |
|--------|------|------|
| id | number | 频道 ID |

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 否 | 新的频道名称 |
| is_enabled | boolean | 否 | 是否启用 |
| sort_order | number | 否 | 排序权重 |

**请求示例**:

```json
{
  "is_enabled": false
}
```

**成功响应** (200 OK):

```json
{
  "channel": {
    "id": 1,
    "name": "tgsearchers3",
    "is_enabled": false,
    "sort_order": 0,
    "created_at": "2026-02-15T10:00:00Z",
    "updated_at": "2026-02-15T11:00:00Z"
  }
}
```

**状态码**:
- `200`: 更新成功
- `400`: 参数错误
- `401`: 未授权
- `404`: 频道不存在
- `500`: 服务器内部错误

---

### 4. 删除频道

删除指定的 Telegram 频道。

**接口地址**: `/api/admin/channels/:id`  
**请求方法**: `DELETE`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 描述 |
|--------|------|------|
| id | number | 频道 ID |

**成功响应** (200 OK):

```json
{
  "message": "频道删除成功"
}
```

**状态码**:
- `200`: 删除成功
- `400`: 参数错误
- `401`: 未授权
- `404`: 频道不存在
- `500`: 服务器内部错误

---

### 5. 测试频道可用性

测试指定频道是否可以正常访问（通过 HTTP 请求 `https://t.me/s/{name}`）。

**接口地址**: `/api/admin/channels/:name/test`  
**请求方法**: `POST`  
**是否需要认证**: 是（需要管理员 Token）

**路径参数**:

| 参数名 | 类型 | 描述 |
|--------|------|------|
| name | string | 频道名称 |

**成功响应** (200 OK):

```json
{
  "name": "tgsearchers3",
  "accessible": true,
  "status_code": 200
}
```

**频道不可访问时**:

```json
{
  "name": "nonexistent_channel",
  "accessible": false,
  "status_code": 404,
  "error": "频道返回非200状态码: 404"
}
```

**状态码**:
- `200`: 测试完成（不代表频道可访问，需检查 `accessible` 字段）
- `401`: 未授权

---

### 6. 批量更新频道

批量更新多个频道的配置。

**接口地址**: `/api/admin/channels/batch`  
**请求方法**: `PUT`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| channels | array | 是 | 频道更新列表 |
| channels[].id | number | 是 | 频道 ID |
| channels[].name | string | 否 | 新名称 |
| channels[].is_enabled | boolean | 否 | 是否启用 |
| channels[].sort_order | number | 否 | 排序权重 |

**请求示例**:

```json
{
  "channels": [
    { "id": 1, "sort_order": 0, "is_enabled": true },
    { "id": 2, "sort_order": 1, "is_enabled": false }
  ]
}
```

**成功响应** (200 OK):

```json
{
  "message": "批量更新成功",
  "updated_count": 2
}
```

**状态码**:
- `200`: 批量更新成功
- `400`: 参数错误
- `401`: 未授权
- `500`: 服务器内部错误

---

### 设计说明

1. **混合配置策略**
   - 数据库优先：运行时频道配置始终从数据库读取
   - 环境变量回退：首次启动时自动将 `.env` 中的 `CHANNELS` 迁移到数据库
   - 迁移幂等：相同频道不会重复创建

2. **运行时同步**
   - 每次增删改操作后，自动同步到运行时配置（`config.AppConfig.DefaultChannels`）
   - 无需重启服务

3. **搜索集成**
   - 搜索接口优先从数据库获取已启用频道列表
   - 仅启用状态的频道参与搜索（`is_enabled = true`）
   - 按 `sort_order` 排序

