# UniSearch API 接口文档

## 概述

UniSearch 提供了一套完整的 RESTful API，支持网盘资源搜索、用户认证等功能。

**基础信息**：
- 基础 URL: `http://localhost:8888/api`
- 内容类型: `application/json`
- 字符编码: `UTF-8`

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

## 认证 API

### 1. 用户登录

获取 JWT Token 用于后续 API 调用。

**接口地址**: `/api/auth/login`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**请求示例**:

```json
{
  "username": "admin",
  "password": "password123"
}
```

**成功响应**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": 1704067200,
  "username": "admin"
}
```

**错误响应**:

```json
{
  "error": "用户名或密码错误"
}
```

**状态码**:
- `200`: 登录成功
- `400`: 参数错误
- `401`: 用户名或密码错误
- `403`: 认证功能未启用
- `500`: 服务器内部错误

---

### 2. 验证 Token

验证当前 Token 是否有效。

**接口地址**: `/api/auth/verify`  
**请求方法**: `POST`  
**是否需要认证**: 是

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

## 管理员 API

管理员 API 用于管理 API Keys 和查看系统状态，所有接口都需要管理员 JWT Token 认证。

### 1. 管理员登录

管理员通过密码登录获取管理员 JWT Token。

**接口地址**: `/api/admin/login`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 否

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| password | string | 是 | 管理员密码 |

**请求示例**:

```json
{
  "password": "your_admin_password"
}
```

**成功响应**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": 1704067200
}
```

**错误响应**:

```json
{
  "error": "密码错误",
  "code": "ADMIN_LOGIN_FAILED"
}
```

**状态码**:
- `200`: 登录成功
- `400`: 参数错误
- `401`: 密码错误
- `429`: 请求过于频繁（速率限制）
- `500`: 服务器内部错误

**速率限制**: 每个 IP 地址每分钟最多尝试 5 次登录

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
      "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "created_at": "2026-01-05T10:30:00Z",
      "expires_at": "2026-02-05T10:30:00Z",
      "is_enabled": true,
      "description": "测试用密钥"
    },
    {
      "key": "sk-x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0",
      "created_at": "2026-01-04T15:20:00Z",
      "expires_at": "2026-01-11T15:20:00Z",
      "is_enabled": false,
      "description": "已禁用的密钥"
    }
  ]
}
```

**字段说明**:
- `key`: API Key 字符串（格式：`sk-` + 40位十六进制）
- `created_at`: 创建时间（ISO 8601 格式）
- `expires_at`: 过期时间（ISO 8601 格式）
- `is_enabled`: 是否启用
- `description`: 密钥描述信息

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
    "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "created_at": "2026-01-05T10:30:00Z",
    "expires_at": "2026-02-05T10:30:00Z",
    "is_enabled": true,
    "description": "生产环境密钥"
  }
}
```

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
curl -X DELETE http://localhost:8888/api/admin/keys/sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 \
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

### 5. 获取插件状态

获取所有插件的运行状态。

**接口地址**: `/api/admin/plugins`  
**请求方法**: `GET`  
**是否需要认证**: 是（需要管理员 Token）

**请求示例**:

```bash
curl -X GET http://localhost:8888/api/admin/plugins \
  -H "Authorization: Bearer <admin_token>"
```

**成功响应**:

```json
{
  "plugins": [
    {
      "name": "duoduo",
      "status": "active",
      "last_update": 1704451680
    },
    {
      "name": "hdr4k",
      "status": "active",
      "last_update": 1704451500
    },
    {
      "name": "panta",
      "status": "inactive",
      "last_update": 1704448080
    }
  ]
}
```

**字段说明**:
- `name`: 插件名称
- `status`: 运行状态（`active` 活跃、`inactive` 不活跃）
- `last_update`: 最后更新时间（Unix 时间戳）

**状态码**:
- `200`: 获取成功
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

---

### 6. 更新 API Key 有效期

更新指定 API Key 的过期时间。

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
| expires_at | string | 否 | 新的过期时间（ISO 8601 格式），与 extend_hours 二选一 |
| extend_hours | number | 否 | 延长的小时数（正整数），与 expires_at 二选一 |

**注意**: `expires_at` 和 `extend_hours` 必须至少提供一个。

**请求示例**:

```bash
# 方式1：直接设置新的过期时间
curl -X PATCH http://localhost:8888/api/admin/keys/sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "expires_at": "2026-03-05T10:30:00Z"
  }'

# 方式2：延长指定小时数
curl -X PATCH http://localhost:8888/api/admin/keys/sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "extend_hours": 168
  }'
```

**成功响应**:

```json
{
  "key": {
    "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "created_at": "2026-01-05T10:30:00Z",
    "expires_at": "2026-03-05T10:30:00Z",
    "is_enabled": true,
    "description": "测试用密钥"
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
      "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "sk-x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0"
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
      "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "success": true,
      "new_expires_at": "2026-03-05T10:30:00Z"
    },
    {
      "key": "sk-x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0",
      "success": true,
      "new_expires_at": "2026-03-04T15:20:00Z"
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
      "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "success": true,
      "new_expires_at": "2026-03-05T10:30:00Z"
    },
    {
      "key": "sk-invalid-key",
      "success": false,
      "error": "密钥不存在"
    }
  ]
}
```

**字段说明**:
- `success_count`: 成功更新的密钥数量
- `failed_count`: 失败的密钥数量
- `results`: 每个密钥的操作结果
  - `key`: API Key
  - `success`: 是否成功
  - `new_expires_at`: 新的过期时间（成功时返回）
  - `error`: 错误信息（失败时返回）

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

批量生成多个 API Key。

**接口地址**: `/api/admin/keys/batch-create`  
**请求方法**: `POST`  
**Content-Type**: `application/json`  
**是否需要认证**: 是（需要管理员 Token）

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| count | number | 是 | 生成数量（1-100） |
| ttl_hours | number | 是 | 有效期（小时），最小值为 1 |
| description_prefix | string | 否 | 描述前缀，生成的密钥描述为"前缀+序号" |

**请求示例**:

```bash
curl -X POST http://localhost:8888/api/admin/keys/batch-create \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "ttl_hours": 720,
    "description_prefix": "批量生成-"
  }'
```

**成功响应**:

```json
{
  "success_count": 10,
  "failed_count": 0,
  "keys": [
    {
      "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "created_at": "2026-01-05T10:30:00Z",
      "expires_at": "2026-02-05T10:30:00Z",
      "is_enabled": true,
      "description": "批量生成-1"
    },
    {
      "key": "sk-x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0",
      "created_at": "2026-01-05T10:30:01Z",
      "expires_at": "2026-02-05T10:30:01Z",
      "is_enabled": true,
      "description": "批量生成-2"
    }
  ]
}
```

**字段说明**:
- `success_count`: 成功创建的密钥数量
- `failed_count`: 失败的密钥数量
- `keys`: 成功创建的 API Key 列表

**错误响应**:

```json
{
  "error": "请求参数错误",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "批量创建失败: 生成数量必须在1-100之间",
  "code": "BATCH_CREATE_FAILED"
}
```

**状态码**:
- `200`: 创建成功
- `400`: 参数错误
- `401`: 未授权
- `403`: 禁止访问
- `500`: 服务器内部错误

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
      "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "sk-x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0"
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
      "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "success": true
    },
    {
      "key": "sk-x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0",
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
      "key": "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "success": true
    },
    {
      "key": "sk-invalid-key",
      "success": false,
      "error": "密钥不存在"
    }
  ]
}
```

**字段说明**:
- `success_count`: 成功删除的密钥数量
- `failed_count`: 失败的密钥数量
- `results`: 每个密钥的操作结果
  - `key`: API Key
  - `success`: 是否成功
  - `error`: 错误信息（失败时返回）

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

## 搜索 API

### 搜索网盘资源

搜索网盘资源，支持多种网盘类型和过滤条件。

**接口地址**: `/api/search`  
**请求方法**: `POST` 或 `GET`  
**Content-Type**: `application/json`（POST 方法）  
**是否需要认证**: 取决于 `AUTH_ENABLED` 配置

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
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
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

### v2.2.0 (2026-01-05)

**新增功能**:
- ✅ API Key 管理增强
- ✅ 单个 API Key 有效期更新
- ✅ 批量延长 API Key 有效期
- ✅ 批量创建 API Key
- ✅ 批量删除 API Key

**新增接口**:
- `PATCH /api/admin/keys/:key` - 更新 API Key 有效期
- `POST /api/admin/keys/batch-extend` - 批量延长 API Key 有效期
- `POST /api/admin/keys/batch-create` - 批量创建 API Key
- `POST /api/admin/keys/batch-delete` - 批量删除 API Key

**功能改进**:
- 支持两种方式更新有效期：直接设置过期时间或延长指定小时数
- 批量操作支持部分成功，返回详细的操作结果
- 批量创建支持自定义描述前缀
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

## 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues: https://github.com/fish2018/UniSearch
- 项目主页: https://so.252035.xyz/
