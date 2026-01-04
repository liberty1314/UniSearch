# UniSearch API 接口文档

## 概述

UniSearch 提供了一套完整的 RESTful API，支持网盘资源搜索、用户认证等功能。

**基础信息**：
- 基础 URL: `http://localhost:8888/api`
- 内容类型: `application/json`
- 字符编码: `UTF-8`

---

## 认证说明

当启用认证功能（`AUTH_ENABLED=true`）时，除登录和健康检测接口外的所有 API 接口都需要提供有效的 JWT Token。

### 请求头格式

```
Authorization: Bearer <token>
```

### 获取 Token

1. 调用登录接口获取 Token（详见下方认证 API）
2. 在后续所有 API 请求的 Header 中添加 `Authorization: Bearer <token>`
3. Token 过期后需要重新登录获取新 Token

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
| AUTH_TOKEN_MISSING | 缺少认证令牌 |
| AUTH_TOKEN_INVALID_FORMAT | 令牌格式错误 |
| AUTH_TOKEN_INVALID | 令牌无效或已过期 |

---

## 环境变量配置

### 认证配置

| 环境变量 | 描述 | 默认值 | 说明 |
|----------|------|--------|------|
| AUTH_ENABLED | 是否启用认证 | false | 设置为 `true` 启用认证功能 |
| AUTH_USERS | 用户账号配置 | 无 | 格式：`user1:pass1,user2:pass2` |
| AUTH_TOKEN_EXPIRY | Token 有效期（小时） | 24 | JWT Token 的有效时长 |
| AUTH_JWT_SECRET | JWT 签名密钥 | 自动生成 | 用于签名 Token，建议手动设置 |

### 基础配置

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| PORT | 服务端口 | 8888 |
| PROXY | SOCKS5 代理 | 无 |
| CHANNELS | 默认搜索的 TG 频道 | tgsearchers3 |
| ENABLED_PLUGINS | 指定启用插件 | 无 |

---

## 更新日志

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
