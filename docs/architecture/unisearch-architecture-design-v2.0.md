# UniSearch 新架构设计方案文档

| 项 | 内容 |
|---|---|
| 版本 | v2.0 |
| 日期 | 2026-09-30 |
| 基线 | `https://github.com/liberty1314/UniSearch.git` @ `4f54d88` |
| 前置文档 | 《UniSearch 代码架构分析与重设计方案》（2026-09-29，架构评审报告）；《UniSearch 架构重构与 UI 重设计需求文档》v2.0 |
| 交互原型 | UniSearch UI 重构原型（`unisearch-ui`，19 个页面，玻璃拟态设计语言） |
| 状态 | 待评审确认 |

## 1. 引言

### 1.1 编写目的

本方案将架构评审报告第 5 章提出的目标架构方向，细化为可实施的详细设计：模块边界、依赖规则、数据流、接口契约、数据策略、非功能设计与分阶段迁移计划；并纳入经交互原型验证的前台与管理后台 UI 重设计（设计系统、页面架构与各页面视觉语言，详见 §6.9–§6.11）。本文档是《UniSearch 架构重构与 UI 重设计需求文档》v2.0 的技术依据，也是各阶段实施与验收的基准。

### 1.2 范围

- 范围内：后端（Go 1.25 / Gin / GORM / MySQL / Redis）与前端（React 18 / TypeScript / Vite / Zustand）的模块重组、依赖治理、插件 SDK 重设计、API 契约、持久化策略、部署与迁移方案；前台与管理后台 UI 视觉重设计（共享设计系统、页面架构、各页面视觉语言，见 §6.9–§6.11）。
- 范围外：产品功能的新增或交互逻辑变更（UI 重设计严格基于现有功能与现有交互逻辑，不新增字段、筛选维度、排序选项或操作）；插件针对各网盘站点的具体适配逻辑重写（仅迁移插件基座）；数据库选型变更。

### 1.3 读者对象

架构评审决策人、后端负责人、前端负责人、QA 与运维。

### 1.4 引用文档

- 《UniSearch 代码架构分析与重设计方案》（2026-09-29），下文简称"评审报告"。
- 仓库内 `docs/readme_26xx.md`（开发日志，过程性参考）、`docs/` 下注册反滥用设计文档。

### 1.5 术语表

| 术语 | 含义 |
|---|---|
| 限界上下文 | DDD 概念：一个内聚的业务边界，拥有独立的领域模型与语言。本方案划分 6 个上下文（§4.3） |
| 端口与适配器 | Hexagonal 架构：领域层定义接口（端口），基础设施层提供实现（适配器），依赖方向指向领域 |
| Composition Root | 应用唯一的装配点，负责构造全部对象图。本方案为 `internal/app/wire.go` |
| 绞杀者模式 | 新旧实现并存，按边界逐步替换旧实现，最终绞杀旧路径的迁移策略 |
| Source | 统一搜索源抽象：插件与 TG 频道都实现该接口（§5.2.2） |
| Facade | 对外提供统一门面的服务，内部可保持多个子服务协作 |
| G-xxx / P-xxx / DR-xxx / FR-xxx / NFR-xxx | 本方案与需求文档中的编号：架构目标 / 设计原则 / 依赖规则 / 功能需求 / 非功能需求 |

## 2. 现状诊断摘要

下表浓缩评审报告第 2–4 章的结论，每条均可在评审报告中找到文件级证据。"对策"列指向本方案对应章节。

| # | 现状问题 | 代表性证据 | 主要影响 | 本方案对策 |
|---|---|---|---|---|
| 1 | 全局可变单例网络，DI 名存实亡 | `config/config.go:173` 的 `var AppConfig`；`database/connection.go:159/164` 的 `GetDB()/SetDB()`；`api/` 约 10 个包级 `Set*` 全局；`service/secret_manager.go:186` 的 `SetGlobalSecretManager` | 隐式依赖、初始化顺序敏感、无法并行测试 | §5.3 依赖规则 DR-1/DR-4；§5.8 不可变配置；`internal/app/wire.go` 唯一装配点 |
| 2 | 插件系统"伪插件化" | `backend/main.go` 32 行空白导入；`plugin/plugin.go:14` 全局注册表；`AsyncSearch` 接口方法全仓零调用 | 新增插件仪式化、静默缺失、基类变更爆炸半径 32 个插件 | §5.2.2 显式注册表 + 无状态插件 + kit 拆分 |
| 3 | 无 Repository 层，Service 即 DAO | 21 个 service 文件直接 import GORM；约 45 处 `db *gorm.DB` 字段；`apikey_service.go:20-28` 直连 `database.GetDB()` | 换 ORM/分库改 21 个文件；单测必须依赖真实 MySQL | §5.5 Repository 层；DR-2 |
| 4 | 搜索域上帝对象 | `search_service.go` 19 字段 + 6 个 `Set*`；`Search()` 9 个参数（`:117`）；与 `PluginHealthChecker` 双向持有（`plugin_health_checker.go:37`） | 核心链路无人敢改；循环依赖 | §5.2.1 SearchUsecase + pipeline 四包拆分 |
| 5 | 执行器与特定插件硬耦合 | `search_executor.go:485` 对 `sidhub` 的 `normalizePluginName` 特例分支 | 通用核心随特定插件腐化 | §5.2.2 manifest 声明 `result_semantics` |
| 6 | 审计无界 goroutine | `api/handler.go:62` → `search_audit_service.go:53` 的 fire-and-forget `db.Create` | 高并发下静默丢审计、DB 抖动 | §5.2.4 有界 channel + scheduler worker |
| 7 | 前端状态层直接编排 IO | `stores/searchStore.ts` 692 行直连 services；`SearchUnifiedFilterCard.tsx` 636 行混容器/展示 | 逻辑不可复用、难测试 | §6.2/§6.3 features 垂直切片，usecase 层剥离 IO |
| 8 | 前端 HTTP 逃逸通道 | `components/admin/adminWorkspaceApi.ts:74` 自建 fetch；`services/searchService.ts:128` 原生 fetch 手工复制 401 逻辑 | 401 刷新、错误标准化丢失 | §6.5 唯一 apiClient 出口 |
| 9 | 前后端类型手写映射 | `buildSearchRequestPayload` 手工映射 `kw/conc/res/src/cloud_types` | 契约漂移 | §5.6 OpenAPI + §6.6 类型生成 |
| 10 | 错误响应三套格式 | `error_response.go`（26 处调用）vs `gin.H{"error"}` vs `LoginResponse{Code,Message,Data}`；`middleware/admin_auth.go` 死代码 | 前端错误处理分支爆炸 | §5.6 统一错误模型；删除死代码 |
| 11 | `AutoMigrate` 无版本化迁移 | `database/` 自动建表，无迁移版本概念 | 生产 schema 演进不可审计、不可回滚 | §5.5 golang-migrate 版本化迁移 |
| 12 | 插件样板重复约 8k–10k 行 | 31/32 插件手写 User-Agent；`extractPassword` 6 处重复；`http_helpers.go` 仅 2 个插件使用 | 每个插件 30–40% 样板 | §5.2.2 kit（httpkit/parsekit/cachekit） |

## 3. 设计目标与原则

### 3.1 总体目标

在不改变产品功能与 API 语义的前提下，将 UniSearch 从"有机生长型单体"重组为"模块化单体"：依赖显式、边界清晰、插件真插件化、前后端契约先行，使后续功能迭代与站点适配的边际成本显著下降，且全程可回滚、可验证。

### 3.2 可度量架构目标

| 编号 | 目标 | 基线（评审报告） | 验收方式 |
|---|---|---|---|
| G-1 | 包级可变全局清零（白名单：错误哨兵、只读常量） | `config.AppConfig`、`database.GetDB()/SetDB()`、`SetGlobal*`、`api` 约 10 个 `Set*`、插件全局注册表、基类 `sync.Map` | CI grep 门禁（白名单制） |
| G-2 | 热力图红区文件清零 | 后端 15 个 🔴 文件、前端 9 个 🔴 文件（评审报告 §7） | 按 §7 方法复评 |
| G-3 | 插件注册 100% 显式化 | 32 个空白导入 + `init()` 自注册 | CI 断言注册表与插件目录一致 |
| G-4 | Repository 覆盖全部持久化访问 | 21 个 service 文件直连 GORM | CI 禁止 `service` import `gorm`（重组后为 `application` 禁止 import `infrastructure/persistence`） |
| G-5 | 前端 HTTP 出口唯一 | `adminWorkspaceApi` 自建 fetch、NDJSON 原生 fetch | ESLint 禁止裸 `fetch(` |
| G-6 | OpenAPI 覆盖全部后端接口，前端类型 100% 生成 | 手写 `types/` 17 文件 + 手工键映射 | `api/openapi/openapi.yaml` 覆盖率检查 |
| G-7 | 统一错误模型覆盖全部接口 | 三套错误格式并存 | 接口契约测试 |
| G-8 | 搜索核心链路 p95 不劣化 | 缺失（Phase 0 建立） | Phase 0 基线 vs 各阶段对比，阈值 10% |
| G-9 | 全部后台 goroutine 纳入统一生命周期 | 21 个插件文件自启 goroutine、无界审计 goroutine | `scheduler` 注册表审计 |
| G-10 | 版本化迁移覆盖全部表结构变更 | `AutoMigrate` 无版本 | `migrations/` 唯一 DDL 来源（生产） |

### 3.3 设计原则

- **P-1 显式依赖**：所有依赖经构造函数注入；禁止包级可变全局；禁止经 `gin.Context` 传递服务（现状 `router_auth.go` → `auth_controller.go:409-427` 的反模式不再出现）。
- **P-2 依赖倒置**：领域层只定义接口；基础设施层实现接口；上层不依赖下层具体类型。
- **P-3 限界上下文**：按业务内聚分包，跨上下文调用必须经 Facade；禁止 service 间直接持有对方具体类型（消除 `SearchService` ↔ `PluginHealthChecker` 式循环）。
- **P-4 绞杀者迁移**：新旧并存、按边界灰度；每阶段以现有测试门禁全绿为退出条件；每阶段独立可回滚。
- **P-5 契约先行**：OpenAPI 是前后端唯一契约源；错误模型、分页、命名规范先定后实现。
- **P-6 无状态插件**：插件不持有跨请求可变状态；全部参数经方法签名显式传递。
- **P-7 渐进式加固**：先止血（横切统一）→ 再解耦（消灭全局）→ 后重组（领域绞杀）→ 最后加固；不允许跳阶段。
- **P-8 统一材质、独立表达**：UI 重设计以前台现有玻璃拟态风格为家族基线，全站统一材质与设计 token；每个页面拥有独立的布局、排版与视觉隐喻，禁止机械换皮；不新增功能、不改变现有交互逻辑。

### 3.4 非目标

1. 不拆分为微服务（见附录 B ADR-1）。
2. 不更换后端框架（Gin）、ORM（GORM）、前端框架（React 18）与状态库（Zustand）。
3. 不改变任何面向用户的产品功能与 API 语义；重构期间 API 保持兼容（兼容策略见 §5.6）。
4. 不变更数据库选型（MySQL + Redis）。
5. 插件针对各站点 HTML 结构的具体解析逻辑不重写，只迁移其基座（kit 化）。

## 4. 总体架构

### 4.1 架构风格选型

采用**模块化单体（Modular Monolith）+ Clean / Hexagonal 分层**。决策依据见附录 B ADR-1：代码库约 14.2 万行、32 个插件、单一部署单元（Docker + Supervisor），未发现需要独立部署、独立扩展或独立团队所有的诉求证据；拆微服务将引入分布式事务、网络延迟与运维复杂度，收益无法覆盖成本。

### 4.2 分层模型与依赖方向

```
┌─────────────────────────────────────────────────────────┐
│ transport: internal/infrastructure/httpapi (Gin)          │  HTTP ⇄ DTO 翻译，薄层
│              │                                           │
│              ▼                                           │
│ application: internal/application/* (用例编排)            │  业务流程编排，依赖 domain 接口
│              │                                           │
│              ▼                                           │
│ domain: internal/domain/* (模型 + 端口接口)               │  零外部依赖：不 import gin/gorm/redis
│              ▲                                           │
│              │  实现接口                                  │
│ infrastructure: persistence / cache / searchsources /     │  GORM / Redis / 插件实现 /
│                 scheduler / secrets                      │  后台任务 / 密钥
└─────────────────────────────────────────────────────────┘
横切: internal/pkg (无业务语义通用库)；internal/app/wire.go (唯一装配点)
```

依赖规则：`httpapi → application → domain ← infrastructure`；`application` 不直接 import `infrastructure` 具体类型；`domain` 不 import 任何外部框架包。强制方式见 §5.3。

### 4.3 限界上下文划分与上下文映射

| 上下文 | 职责 | 现状来源 |
|---|---|---|
| search（搜索） | 搜索编排：参数归一化 → 源选择 → 并发执行 → 合并评分 → 响应构建；SSE 渐进式 | `service/search_*.go` 13 文件 |
| searchsource（搜索源） | 统一搜索源抽象；32 个插件实现 + kit；TG 频道收敛为 Source 实现；插件注册表、manifest | `plugin/` 26,294 行 + `service/tg_channel_*` |
| identity（身份） | 用户、会话、四种 token 统一、API Key、密码策略、封禁 IP、验证码 | `service/auth_service.go`、`user_service.go` 等 |
| ops（运营） | 插件运行态门面（state/health/metrics/runtime_config）、审计、公告、系统设置、标签 | 8 个 `plugin_*` service、`admin_handler.go` 等 |
| ranking（热榜） | TMDB 聚合、加权评分、排序、预热 | `hot_ranking_service.go` 等 4 文件 |

上下文映射：`search` 依赖 `searchsource` 的 `Source` 端口；`ops` 通过各上下文 Facade 只读运行态；`identity` 被 `httpapi` 中间件依赖；上下文之间禁止直接共享领域模型，跨上下文数据经 DTO。

### 4.4 部署架构

保持现有部署形态不变：多阶段 Docker 构建 → 3 个二进制（`unisearch`、`unisearch-migrate`、`unisearch-rotate-master-key`）+ 前端静态资源 → Nginx + Supervisor。变更点：

1. `migrate` 二进制从"辅助工具"升级为生产 DDL 唯一入口（`migrations/` 版本化 SQL），与 `AutoMigrate` 双跑校验后转正。
2. 新增 `/healthz`（存活）与 `/readyz`（就绪：DB/Redis/关键插件注册表自检）端点，供 Supervisor 与编排层使用。
3. 配置以内嵌默认值 + 环境变量 + 配置文件三层覆盖，全部在 `wire.go` 组装为不可变 `Config`（见 §5.8）。

## 5. 后端详细设计

### 5.1 目录结构

```
backend/
├── cmd/
│   ├── server/main.go            # 薄 main：解析参数 → app.Run
│   ├── migrate/main.go           # 版本化迁移 CLI（golang-migrate）
│   └── rotate-master-key/main.go # 主密钥轮换（保持现状）
├── internal/
│   ├── app/
│   │   └── wire.go               # 唯一装配点（Composition Root）
│   ├── config/
│   │   └── config.go             # 不可变 Config 值对象；Reload 显式重建
│   ├── domain/                   # 零外部依赖
│   │   ├── search/               # 搜索领域模型 + 端口（Source 接口见 5.2.2）
│   │   ├── searchsource/         # Manifest schema、插件元数据
│   │   ├── identity/             # User、Session、Token 模型 + Repository 接口
│   │   ├── ranking/              # 热榜领域模型
│   │   └── ops/                  # 审计事件、公告、系统设置模型
│   ├── application/
│   │   ├── search/
│   │   │   ├── search_usecase.go # 编排（现 search_service.go 275 行的瘦身版）
│   │   │   ├── progressive.go    # SSE 形态（现 search_progressive.go）
│   │   │   └── pipeline/
│   │   │       ├── selector/     # 源选择 + 优先级计算（plugin_priority_calculator 并入）
│   │   │       ├── executor/     # 并发执行 + 超时 + 熔断（内聚）
│   │   │       ├── merger/       # 合并 + 评分 + 分面
│   │   │       └── builder/      # 响应构建；token codec 独立子包
│   │   ├── pluginops/            # 插件运行态 Facade（state/health/metrics/runtime_config）
│   │   ├── identity/             # AuthUseCase（登录/注册/刷新/吊销统一）
│   │   ├── ranking/              # 热榜用例（TMDB 适配器、评分策略、预热分离）
│   │   └── ops/                  # 审计、公告、系统设置用例
│   ├── infrastructure/
│   │   ├── persistence/          # Repository 的 GORM 实现（按聚合根）
│   │   ├── cache/                # Redis 实现（现 util/cache 上移）
│   │   ├── httpapi/              # Gin 薄层
│   │   │   ├── router.go         # 纯路由表（无装配副作用）
│   │   │   ├── middleware/       # 合并后的唯一 middleware 包
│   │   │   └── v1/               # 按版本分组的 handler
│   │   ├── searchsources/
│   │   │   ├── registry.go       # 显式注册表（替代 init 自注册）
│   │   │   ├── kit/              # httpkit / parsekit / cachekit
│   │   │   ├── plugins/          # 32 个插件子目录（渐进迁移）
│   │   │   └── tgchannel/        # TG 频道实现 Source 接口
│   │   ├── scheduler/            # 后台任务统一生命周期
│   │   └── secrets/              # SecretManager 双实现（Reader/Writer 分离）
│   └── pkg/                      # 无业务语义通用库（http client、crypto、worker pool）
├── migrations/                   # 版本化 SQL（V1__baseline.sql 起）
└── api/openapi/
    └── openapi.yaml              # 前后端唯一契约源
```

### 5.2 限界上下文详细设计

#### 5.2.1 搜索上下文（search）

**现状问题**：`SearchService` 19 个字段 + 6 个重建式 `Set*` setter（`search_service.go:71-113`）；`Search()` 9 个参数（`:117`）；与 `PluginHealthChecker` 双向持有；`search_executor.go` 661 行混合 TG/插件双执行器、并发、缓存、超时、熔断、指标、健康上报；`search_response_builder.go` 995 行混合构建、排序、过滤、token 编解码。

**设计**：

1. `SearchUsecase`（编排，目标 <200 行）：依赖 `SourceSelector`、`SearchExecutor`、`ResultMerger`、`ResponseBuilder` 四个端口接口，全部经构造函数一次性注入，构造后不可变。删除全部 `Set*` setter。
2. `SearchParams` 值对象替代 9 个参数：`Keyword`、`Channels`、`Concurrency`、`ForceRefresh`、`ResultType`、`SourceType`、`Plugins`、`CloudTypes`、`Ext`。参数归一化逻辑（现 `search_request.go`）收敛为 `SearchParams.Normalize()`。
3. pipeline 四包职责：
   - `selector`：候选源过滤（熔断器状态、运行时配置、用户指定）+ 优先级排序。现 `plugin_priority_calculator` 并入；`search_plugin_selector.go`（166 行）迁入。
   - `executor`：并发执行 + 单源超时 + 自适应超时（现 `search_adaptive_timeout.go`）+ 熔断器（现 `plugin_circuit_breaker.go` 内聚于此，不再散落）。删除 `search_executor.go:485` 的 sidhub 硬编码，改为读取源 manifest 的 `result_semantics` 字段（见 §5.2.2）。
   - `merger`：多源合并 + 去重 + 评分（现 `search_scoring.go` 的纯函数部分；包级 `sync.Map` 全局改为 executor 构造注入的实例）+ 分面（现 `search_facets.go`）。
   - `builder`：响应组装；token 编解码拆为独立 `builder/codec` 包（现直接持有未导出的 `resourceResolveTokenCodec`）；排序/过滤规则显式化为可测试的纯函数。
4. 循环依赖消除：`PluginHealthChecker` 不再持有 `*SearchService`；健康探测改为订阅执行器发布的领域事件（`SourceHealthReported`），或经 `pluginops` Facade 接口回调。`SearchUsecase` 仅依赖 `pluginops.HealthReporter` 接口。
5. 审计：搜索完成时发布 `SearchAudited` 领域事件 → `scheduler` 的有界 channel（容量 1000，可配置）→ worker 批量落库；channel 满时按策略（默认丢弃最旧并计数告警，策略可在配置中切换为阻塞，见需求文档 OPEN-05）。消除 `search_audit_service.go:53` 无界 goroutine。

#### 5.2.2 搜索源上下文（searchsource）

**现状问题**：32 个插件靠 `main.go` 空白导入 + `init()` 注册（漏一行静默缺失）；接口含零调用死方法 `AsyncSearch`；`baseasyncplugin.go` 998 行神对象且 `SetMainCacheKey`/`SetCurrentKeyword` 写进程级单例可变字段（跨请求竞态面）；11 个插件自建私有缓存、21 个插件文件自启 goroutine；manifest 27/32 为占位；约 8k–10k 行样板重复。

**设计**：

1. 统一 `Source` 接口（domain 层，拟）：

```go
// domain/searchsource/source.go（拟）
type SearchOptions struct {
    Concurrency int
    Timeout     time.Duration
    ForceRefresh bool
    Ext         map[string]string
}

type Source interface {
    // 无状态：全部输入经参数显式传递；实现者不得持有跨请求可变状态
    Search(ctx context.Context, keyword string, opts SearchOptions) (SearchResult, error)
    Manifest() Manifest
}

type Manifest struct {
    Name           string   // 必填，唯一
    Version        string   // 必填，语义化版本，禁止 "0.0.0" 占位
    ResultSemantics string  // 结果语义声明，替代 search_executor.go:485 硬编码
    HealthCheck    HealthCheckSpec
}
```

2. 插件扩展接口：`AsyncSearchPlugin` 的 `AsyncSearch` 死方法删除；实际被调用的 `AsyncSearchWithResult` 语义收敛为 `Source.Search`；`InitializablePlugin`（现仅 weibo 实现）保留为可选扩展接口 `InitializableSource`，初始化由 `registry` 在装配期显式调用（替代 `init()` 副作用）。
3. kit 拆分（替代 998 行神对象基类，插件按需组合，无强制继承）：
   - `kit/httpkit`：浏览器头、重试、超时（收敛现状 `http_helpers.go`，补齐后推广到全部插件，消除 31/32 手写 User-Agent 与版本不一致）。
   - `kit/parsekit`：链接标准化、密码提取、去重（`parser/link_parser.go` 上位替代，消除 `extractPassword` 6 处重复定义）。
   - `kit/cachekit`：受控缓存（TTL、容量上限、key 规范），替代 11 个插件私有缓存与基类无界 `sync.Map`。
4. 显式注册：`searchsources/registry.go` 提供 `Register(name string, factory SourceFactory)`；`internal/app/wire.go` 集中调用 32 次注册；删除全部 `init()` 自注册与 `main.go` 空白导入。CI 增加断言：注册表键集合 == `plugins/` 目录集合（防静默缺失）。`GetRegisteredPlugins` 改为按注册顺序返回（消除 map 随机顺序）。
5. manifest 强制化：`Manifest()` 必填字段缺失或 `Version == "0.0.0"` 时，`wire.go` 装配期直接失败（fail-fast），替代现状 `tools/validate_plugin_manifests.go` 的事后标记。
6. 健康检查轻量化：替代"固定关键词真实搜索"（现状误熔断根源）。两级探针：L1 轻量探针（HEAD/版本接口，低频）；L2 站点结构指纹校验（将各插件目录下 `html结构分析.md` 沉淀为 CSS 选择器断言，高频低成本）。探针逻辑由 `scheduler` 统一调度，生命周期受控（替代 21 个插件自启 goroutine）。
7. TG 频道收敛：`tgchannel` 包实现 `Source` 接口，复用 `executor` 的并发/超时/熔断/指标管线；删除与 `plugin_metrics_collector.go`（558 行）镜像复制的 `tg_channel_metrics_collector.go`（513 行）。数据表保持不变，只切换写路径。

#### 5.2.3 身份上下文（identity）

**现状问题**：四种 token 四种存储四个所有者（access/refresh/吊销 JTI/资源解析 token）；`EnvironmentSecretManager` 的写方法恒返回"不支持"错误（`secret_manager_env.go:57-74`，Liskov 违规），调用方靠类型断言区分（`system_settings_service.go:538/594`）；登录链路经 `gin.Context` 隐式传递 `RefreshTokenService`（`auth_controller.go:409-427`）；`user_service.go` 751 行混合 CRUD/统计/密码/批量。

**设计**：

1. `TokenService` 统一门面：`IssueAccess` / `IssueRefresh` / `Revoke` / `ResolveResource` 四个方法，内部按 token 种类路由到 JWT / DB（refresh 摘要）/ Redis（吊销 JTI）/ 资源 codec 四种存储。调用方只依赖门面接口。
2. `SecretReader` / `SecretWriter` 接口分离：env 实现只实现 `SecretReader`，编译期即保证不可写；DB 实现同时实现两者。删除全部类型断言分支。
3. `AuthUseCase`：登录/注册/刷新/吊销统一编排；`RefreshTokenService` 经构造函数注入 `AuthController`，删除 `c.Set`/`c.Get` 隐式传递。
4. `user_service.go` 拆分：`UserRepository`（CRUD）+ `UserStatsService`（DAU/MAU 统计）+ 密码策略保持独立（现 `password_policy.go`）。

#### 5.2.4 运营上下文（ops）

**现状问题**：插件运行态拆进 8 个 service / 4 张表 / 3 套内存结构，无统一门面，`recordPluginHealth` 内部分叉两套写入路径；`admin_handler.go` 856 行跨域混装；`system_settings_service.go` 978 行五类职责；`AdminAuditMiddleware` 异步落库路径与搜索审计同样无界。

**设计**：

1. `application/pluginops` Facade：对外暴露 `SetSourceStatus`、`ReportHealth`、`RecordMetrics`、`GetRuntimeConfig` 等统一方法；内部 state/health/metrics/runtime_config 保持分离实现，但写入路径收敛为一条（消除 `recordPluginHealth` 分叉）。现 `SetPluginStatusHandler` 为取 `PluginManager` 而传递整个 `SearchService`（`admin_handler.go:718`、`plugin_center_handler.go:17`）的模式改为只注入 `pluginops.Facade` 接口。
2. 审计：搜索审计与管理审计统一走 `scheduler` 有界 channel（见 §5.2.1-5）。
3. `admin_handler.go` 按域拆分为 `admin_user_handler.go`、`admin_plugin_handler.go`、`admin_metrics_handler.go`、`admin_system_handler.go`；`system_settings_service.go` 按设置类别拆分为 system/cache/runtime/tmdb/announcement 五个内聚服务（或值对象分组，视迁移成本二选一，默认拆服务）。
4. 错误模型统一与 middleware 合并见 §5.6、§5.8。

#### 5.2.5 热榜上下文（ranking）

**现状问题**：`hot_ranking_service.go` 1079 行/61 函数混合 TMDB 三源聚合、加权评分、排序、预热；`WarmCache(_ *SystemSettingsService, …)` 参数被直接丢弃（残留签名）。

**设计**：拆分为 `tmdb.Adapter`（三源聚合，`tmdb_service.go` 上移）、`ranking.Scorer`（加权评分纯函数，可单测）、`ranking.Prewarmer`（预热任务，纳入 `scheduler`）。清理残留签名。

### 5.3 依赖规则（硬性）

| 编号 | 规则 | 强制方式 |
|---|---|---|
| DR-1 | `domain` 禁止 import `application` / `infrastructure` / `httpapi` 相关包（含 gin、gorm、redis） | CI：`scripts/tests/depcheck.sh` 用 `go list -deps` 断言 |
| DR-2 | `application` 只依赖 `domain` 接口与 `pkg`；禁止 import `infrastructure` 具体类型 | 同上 |
| DR-3 | `infrastructure/httpapi` 禁止 import `infrastructure/persistence`（防 handler 直连 DB 回潮） | 同上 |
| DR-4 | 禁止包级可变全局（白名单：错误哨兵 `var ErrXxx`、只读常量） | CI：grep `^var [A-Z]` 白名单制；`go vet` 自定义检查（可选） |
| DR-5 | 跨限界上下文调用必须经 `application` Facade 接口；禁止直接持有他上下文具体类型 | 代码评审 + depcheck |
| DR-6 | 插件包禁止 import `config`（现 `weibo.go:453` 反模式）；插件所需配置经 `SearchOptions` / `Manifest` 显式传入 | depcheck |

### 5.4 关键数据流（新）

**F-1 同步搜索 `POST /api/v1/search`**：`middleware（认证/限流）` → `SearchHandler`（校验 + 翻译为 `SearchParams`，现 `parseSearchRequest` 逻辑上移）→ `SearchUsecase.Search(params)` → `selector.Select` → `executor.Execute`（熔断过滤 → 缓存 → 并发 `Source.Search` → 健康/指标事件）→ `merger.Merge` → `builder.Build` → 发布 `SearchAudited` 事件 → 返回。对比现状：9 参数消除、双执行器胶水收敛、审计移出同步链路。

**F-2 渐进式搜索（SSE）**：`progressive.go` 用例复用同一 pipeline，仅在 `executor` 处以流式回调增量推送；前端经 `apiClient.stream()` 消费（见 §6.5）。对比现状：`search_progressive.go` 跨文件给 `SearchService` 加方法的模式消除。

**F-3 登录 `POST /api/v1/auth/login`**：`LoginHandler`（构造注入 `AuthUseCase`）→ `authUsecase.Login` → `TokenService.IssueAccess/IssueRefresh`。对比现状：`gin.Context` 隐式传参消除；`LoginResponse{Code,Message,Data}` 收敛为统一错误模型。

**F-4 插件启停 `POST /api/v1/admin/plugins/:name/status`**：`AdminAuthMiddleware`（合并后唯一）→ `AdminAuditMiddleware`（事件采样 → 有界 channel）→ `PluginAdminHandler`（注入 `pluginops.Facade`）→ `facade.SetSourceStatus` → `selector` 缓存失效。对比现状：不再为取 `PluginManager` 而传递整个 `SearchService`。

**F-5 异步审计/指标**：各用例发布领域事件 → `scheduler` 有界 channel → worker 批量落库（失败重试 + 计数告警 + 背压指标）。对比现状：无界 goroutine 消除，丢失可观测。

### 5.5 持久化设计

1. **Repository 层**：`domain/<ctx>` 定义接口（如 `UserRepository`、`PluginStateRepository`、`SearchAuditRepository`、`SystemSettingRepository`），`infrastructure/persistence` 提供 GORM 实现。迁移顺序：identity 域试点 → ops 域 → 全量。现散布 21 个文件的 `s.db.Where(...).Find(...)` 全部迁入 Repository。
2. **事务边界**：事务由 `application` 用例拥有；Repository 方法接受 `Tx` 上下文参数（`WithTx` 模式），禁止 service 内私自起事务嵌套。
3. **版本化迁移**：引入 `golang-migrate`；`migrations/V1__baseline.sql` 由当前 `AutoMigrate` 结果导出；与 `AutoMigrate` 双跑校验一致后，生产切换为 `migrate` 二进制；`AutoMigrate` 降级为开发环境 bootstrap；保留 `ValidateRuntimeSchema` 作为启动校验。表结构零变更（只加迁移版本表）。
4. **查询性能**：Repository 拆分以"不产生 N+1"为评审项；Phase 0 的 p95 基线作为回归门禁（劣化超 10% 阻断）。

### 5.6 API 设计

1. **版本化**：新路由挂载 `/api/v1`；旧路径在 Phase 1–3 保留兼容，Phase 4 下线（下线前经 OpenAPI 标记 `deprecated`）。
2. **统一错误模型**：`{ "code": "<域>.<错误名>", "message": "<可读信息>", "data": <可选>, "trace_id": "<请求追踪ID>" }`。错误码按域分段（`search.*`、`identity.*`、`ops.*`、`ranking.*`、`searchsource.*`）。`error_response.go` 的 `writeAPIError` 推广为唯一出口；替换约 60 处 `gin.H{"error"}` 与 `LoginResponse`。
3. **REST 规范**：资源名词复数、HTTP 动词语义、分页统一 `{page, page_size, total, items}`、过滤/排序查询参数命名以 OpenAPI 为准。
4. **契约流程**：`api/openapi/openapi.yaml` 为唯一契约源 → 后端 CI 校验实现与契约一致（契约测试）→ 前端经 `openapi-typescript` 生成类型。删除 `buildSearchRequestPayload` 手工映射，前后端键名以 OpenAPI 为准。
5. **兼容策略**：Phase 1 先加兼容层（同时返回新旧字段），前端同步改造后移除旧字段。

### 5.7 插件 SDK 设计

1. **最小接口**（见 §5.2.2 `Source` + `Manifest`）：新插件只需实现 `Search` + `Manifest` 两个方法。
2. **开发步骤**（4 步 → 2 步）：① 在 `infrastructure/searchsources/plugins/<name>/` 实现接口（按需组合 kit）；② 在 `internal/app/wire.go` 加一行 `registry.Register`。删除 `init()` 自注册与 `main.go` 空白导入。
3. **测试契约**：复活 `testutil.ReadFixture`，升级为 fixture 回放测试：每个插件提供一组录制响应 fixture，CI 在无外网环境下回放断言解析正确性；`AssertPluginContract` 补强为校验 manifest 必填字段。
4. **站点适配指南**：将各插件 `html结构分析.md` 沉淀为选择器指纹，随 L2 健康探针运行；站点改版导致指纹失效时探针告警（替代现状"靠用户投诉发现"）。

### 5.8 横切关注点设计

1. **配置**：不可变 `Config` 值对象，经 `wire.go` 构造注入；`ApplyRuntimeSettings` / `UpdateDefaultConcurrency` 的运行时修改语义改为"生成新 Config + 重建受影响组件"（Phase 2 先支持重启生效，热更新延后）。DR-6 禁止插件直读配置。
2. **Middleware**：合并为 `infrastructure/httpapi/middleware` 单一包；删除 `middleware/admin_auth.go` 与 `middleware.go:324` 的 `AuthMiddleware` 死代码；`validation_middleware.go` 并入。职责：认证（3 个 JWT 变体收敛为可配置的单一中间件）、限流（`router.go:15-68` 的限流器初始化上移至 `wire.go`）、审计采样、trace_id 注入。
3. **日志/指标/追踪**：结构化日志（`trace_id` 全链路）；Prometheus 指标命名规范 `<ctx>_<object>_<action>`（如 `search_executor_source_duration_seconds`）；关键链路预留 OpenTelemetry 埋点位（Phase 4 接入）。
4. **熔断/超时/限流**：熔断器内聚于 `pipeline/executor`；单源超时 + 自适应超时保留；限流器在 `wire.go` 构造并注入路由。
5. **健康检查**：`/healthz`（进程存活）、`/readyz`（DB/Redis/注册表自检）；替代 `router_health.go:8-56` 内联业务逻辑的模式。
6. **后台任务**：`scheduler` 统一注册表：任务名、触发器（ticker/cron/事件）、优雅停机（`context` 取消 + in-flight 排空）。审计 worker、健康探针、指标聚合/清理、热榜预热全部纳入。

## 6. 前端详细设计

### 6.1 目录结构

```
frontend/src/
├── app/                    # 路由装配 + 全局 providers（现 routes/ 上移）
├── features/               # 按领域垂直切片
│   ├── search/
│   │   ├── components/     # 纯展示（禁止 import ../api、@/services、stores）
│   │   ├── containers/     # 容器：接 store + 触发 usecase
│   │   ├── api.ts          # 领域 API（唯一经 apiClient；含 stream 扩展）
│   │   ├── store.ts        # 领域状态：只管状态与派生，不做 IO
│   │   ├── usecase.ts      # IO 编排（现 searchStore.performSearch 等迁入）
│   │   └── types.ts        # 由 OpenAPI 生成（ thin re-export ）
│   ├── auth/               # 登录/注册/会话（刷新逻辑收敛至 apiClient 拦截器）
│   ├── admin/              # 后台（表格单一化；巨型 hooks 拆分）
│   ├── trending/
│   └── account/
├── shared/
│   ├── ui/                 # 唯一设计系统（合并 AppleTable/AdminDataTable 等）
│   └── lib/
│       ├── apiClient.ts    # 唯一 HTTP 出口
│       ├── error.ts        # 统一 AppError（对齐后端错误模型）
│       └── storage.ts      #（现 safeStorage 上移）
└── types/                  # 全部由 openapi-typescript 生成；手写类型冻结
```

### 6.2 Feature 内部结构约定

- `components/`：纯展示组件，props in / callbacks out；禁止 import `../api`、`@/services`、`stores`；禁止 `useNavigate`（导航由 containers 负责，现 `SearchUnifiedFilterCard` 反模式消除）。
- `containers/`：连接 store 与 usecase，处理副作用（导航、toast）。
- `usecase.ts`：IO 编排（请求、竞态守卫、重试、分页拼接）；不 import 组件。
- `api.ts`：薄封装，只做"参数 → apiClient 调用 → 类型化返回"；NDJSON 流经 `apiClient.stream()`。
- `store.ts`：zustand 切片，只存状态与派生选择器；持久化白名单显式声明。

### 6.3 Search Feature 拆分设计

| 现状 | 新位置 | 说明 |
|---|---|---|
| `stores/searchStore.ts` 692 行中的状态/派生 | `features/search/store.ts` | 历史、分页、过滤、偏好 |
| 其中 `performSearch` 等 IO 编排 | `features/search/usecase.ts` | 竞态守卫（现 `searchRequestGuard`）内聚于此 |
| `services/searchService.ts` 563 行 | `features/search/api.ts` | 删除原生 fetch，改用 `apiClient.stream()` |
| `buildSearchRequestPayload` | 删除 | 键名以 OpenAPI 生成类型为准 |
| `components/SearchUnifiedFilterCard.tsx` 636 行 | `components/SearchFilterCard.tsx`（展示）+ `containers/SearchFilterContainer.tsx` | 拆容器/展示 |
| `hooks/useSearchBoxController.ts` 546 行 | `containers/SearchBoxContainer.tsx` + usecase | 登录检查/toast/导航收敛到 container；`globalThis` 缓存删除，改由 TanStack Query 承担服务端数据缓存（D-7，见 ADR-5） |
| `hooks/use*Controller` 其余 | 按 feature 归位 | 控制器超过 300 行必须拆分 |

### 6.4 Admin Feature 拆分设计

1. **表格体系合并**：`AppleTable` / `AdminDataTable` / `AppleUserTable` / `ApplePluginTable` 收敛为 `shared/ui/DataTable` 单一实现（含排序/分页/批量选择/空态）；10 个引用文件逐个迁移。
2. **巨型 hooks 拆分**：`useChannelManageController`（748 行，反向依赖 components，层级倒置）与 `usePluginManageController`（690 行，同构复制）按"列表查询 / 表单编辑 / 批量操作"拆为 ≤300 行的小 hooks；`components/admin` 下的辅助模块（`adminWorkspaceApi`、`channelManageStateUtils`）上移为 feature 内 `api.ts` / `utils.ts`，消除 hook → components 反向依赖。
3. **逃逸通道删除**：`adminWorkspaceApi.ts` 并入 `apiClient`（补上 401 单飞刷新与错误标准化）。
4. `SystemInfoView.tsx`（740 行）按信息分组拆分子组件。

### 6.5 唯一 HTTP 出口设计

`shared/lib/apiClient.ts`（现 `lib/api.ts` 348 行演进）能力清单：

1. axios 单例 + baseURL + 超时；请求拦截器注入 token（`authStore` 只读）。
2. 响应拦截器：解包 `{code,message,data}` → 统一 `AppError`（`shared/lib/error.ts`，对齐后端错误模型）；401 且非豁免端点 → `authRefreshManager` 单飞刷新后重试一次；刷新失败 → 登出跳转（现分散在拦截器/`useAutoRefreshToken`/refreshManager 三处的逻辑收敛：预刷新保留在 `auth` feature，拦截器只做"401 时刷新重试"）。
3. `apiClient.stream()`：NDJSON/SSE 流式扩展，复用同一拦截器链（消除 `searchService.ts:128` 手工复制 401 逻辑）。
4. 豁免端点名单从拦截器硬编码移至 `features/auth/authConfig.ts`。

### 6.6 类型契约设计

1. `api/openapi/openapi.yaml` → CI 生成 `frontend/src/types/generated/`（`openapi-typescript`）；`types/` 下手写类型冻结（只允许 re-export generated）。
2. 后端先覆盖 `/search`、`/auth/*`（Phase 0 试点），Phase 3 转正全量。
3. 契约漂移门禁：前端 CI 校验 generated 类型为最新（`openapi.yaml` 变更未重新生成则失败）。

### 6.7 状态管理规则

- zustand 保持（不引入新状态库，避免额外迁移成本）。
- 跨 feature 共享状态只允许经 `shared` 层（如 `authStore` 上移至 `features/auth/store.ts`，他处只读）。
- 派生数据用选择器，避免在 store 内缓存可推导值。

### 6.8 依赖规则（ESLint）

1. `features/*/components` 禁止 import `../api`、`@/services`、`**/stores/**`（`eslint-plugin-import` restrict）。
2. 禁止裸 `fetch(`（`no-restricted-globals`），唯一例外 `apiClient` 内部实现。
3. `features/*` 之间禁止跨 import（经 `shared` 或顶层 `app` 组装）。

### 6.9 前端设计系统（前后台共享）

UI 重设计以前台现有玻璃拟态风格为家族基线（D-9，见 ADR-6），前后台共享同一套设计系统，`frontend/src/shared/ui` 为唯一组件来源。

1. **设计 token**：色彩（品牌青蓝、11 类网盘纯色、中性灰阶）、字阶、间距、圆角、阴影、动效曲线全部 token 化；网盘 pill 配色与生产站现有配色一致，选中态使用纯色背景（禁止渐变）。
2. **统一组件库**：按钮、输入框、筛选 pill、分页、空态、骨架屏、二次确认弹窗、toast 收敛为单一实现；后台四套表格（`AppleTable` / `AdminDataTable` / `AppleUserTable` / `ApplePluginTable`）收敛为 `shared/ui/DataTable`。
3. **页面框架**：前台三栏式粘性导航壳（见 FR-U-2）+ 统一页脚；后台 `AdminShell`（见 §6.10）。
4. **异步状态规范**：骨架屏为默认加载态，禁止数字先显示 0 再跳变；错误态与空态统一样式。
5. **响应式规范**：390px / 768px / 1440px 三档；筛选项自动换行，禁止横向滚动（数据表格除外）。
6. **视觉回归**：关键页面建立基线截图，PR 级对比。

### 6.10 管理后台 UI 架构（AdminShell）

1. **AdminShell**：深色控制轨 + 模块编号 + 技术状态栏 + 各页面强调色；"运营控制台"视觉隐喻，与前台、登录页、个人中心明显区分；窄窗口下导航收敛为双列，无横向滚动。
2. **五类页面模板**：总览仪表盘（指挥舱构图）、行式数据表、卡片集合、表单/设置、监控图表；同类页面结构一致。
3. **数据密集型组件规范**：筛选器、分页（默认条数/省略号/布局统一）、批量操作、空态统一；筛选弹层支持 Escape 关闭且无遮罩残留。
4. **权限与危险操作反馈**：危险操作（封禁、删除、下线插件）二次确认；操作结果明确反馈；无权限入口不渲染；头像菜单按账户权限显示（管理员：个人中心/管理后台/退出登录；普通用户：个人中心/退出登录）。
5. **登录统一**：前后台共用 `/login`，删除独立后台登录页；身份由后端按账户权限区分。

### 6.11 各页面视觉语言（原型已验证）

全站统一玻璃拟态材质，各页面视觉隐喻如下（详见交互原型 `unisearch-ui`）：

| 页面 | 视觉隐喻 | 要点 |
|---|---|---|
| 首页 | 悬浮玻璃 + 资源轨道 | 大号玻璃搜索框、资源来源轨道、节奏化功能卡片 |
| 搜索结果 | 检索仪表 | 结果总数 + 排序 + 卡片/列表切换；11 类网盘纯色 pill 筛选；包含/排除关键词高级筛选；加载更多（~48 条/次）；回到顶部 |
| 热榜 | 编辑式领奖台 | 榜单模式 × 时间维度 × 内容分类口径筛选；当前口径与周期；前三名领奖台 + 榜单流 |
| 登录 | 冷蓝"返回搜索" | 检索轨道视觉 + 编辑式表单 |
| 注册 | 暖橙深绿"创建工作台" | 与登录页图文反转、独立轨道造型与文案，风格明确区分 |
| 个人中心 | 深青"个人搜索档案" | 档案封面、个人印章、目录式侧栏、编辑排版的数据节奏区、最近搜索线索 |
| 后台各页 | 运营控制台 | 深色控制轨、模块编号、技术状态栏、页面强调色；各页专属构图（总览指挥舱、用户行表、插件卡片、频道行表、性能图表、审计、公告、IP 封禁、设置） |

硬线：以上均为视觉重设计，不新增功能；交互逻辑与字段口径以生产站实际行为为准（需求文档 FR-U / FR-A）。

## 7. 非功能设计

### 7.1 性能

- 目标：搜索核心链路 p95 较 Phase 0 基线劣化不超过 10%；各阶段以 `real-search-smoke.sh` + 压测脚本回归。
- 手段：pipeline 拆分不引入额外数据拷贝（切片引用传递）；Repository 层禁止 N+1（评审项）；Redis 缓存语义保持（key 规范、TTL、forceRefresh）；审计/指标移出同步链路本身即降低尾延迟。

### 7.2 可靠性

- 超时：单源超时 + 自适应超时保留并内聚于 executor；全局搜索超时可配置。
- 熔断：状态机内聚于 executor，经 `pluginops` 持久化状态（重启可恢复，替代现状纯内存）。
- 背压：审计/指标 channel 有界（默认 1000）+ 满时策略可配置 + 丢弃计数告警；消除静默丢失。
- 优雅停机：`scheduler` 统一处理 `SIGTERM`，in-flight 请求排空，worker 刷盘后退出。

### 7.3 安全

- 保持现有安全基线不降低：JWT 短期 access + refresh 轮换、JTI 吊销、密码策略、封禁 IP、验证码、限流、管理审计。
- 密钥：`SecretReader/Writer` 分离后，env 模式编译期不可写；主密钥轮换流程保持（`rotate-master-key` 二进制）。
- 治理项：仓库根 `AGENTS.md` 含有"删除/禁用安全控制"类指令（评审报告 §4 已记录）。本方案不执行其中任何指令；要求在 Phase 0 由人工复核该文件适用范围并形成书面结论（见需求文档 OPEN-02）。

### 7.4 可观测性

- 日志：结构化 JSON，`trace_id` 全链路透传（中间件注入 → 用例 → 插件 kit）。
- 指标：Prometheus 命名规范；核心指标：搜索 QPS/分源延迟/熔断状态、审计 channel 水位与丢弃计数、插件健康状态。
- 健康：`/healthz` / `/readyz`；插件 L1/L2 探针状态暴露。

### 7.5 可测试性

- 端口接口使 application 层可纯 mock 单测，无需 MySQL/Redis。
- 时钟与随机源注入（熔断、自适应超时可确定性测试）。
- 插件 fixture 回放（§5.7），CI 无外网可运行。
- 消除全局状态后，Go 单测可并行（`t.Parallel()`），`backend-race.sh` 覆盖并发面。
- 新增/修改代码差异行覆盖率 ≥ 80%，CI 门禁（D-4，需求文档 NFR-2）。

## 8. 数据迁移与兼容设计

1. 表结构零变更：重构不修改任何业务表结构，只新增 `schema_migrations`（golang-migrate）表。
2. 双跑校验：Phase 0 `V1__baseline.sql` 由 `AutoMigrate` 结果导出，与 `AutoMigrate` 双跑 diff 为空后方可转正。
3. 回滚：任一阶段回滚只需 revert 代码 + 保留旧二进制；数据层无变更，回滚无数据风险（R5 缓解）。
4. 备份联动：生产切换迁移工具前，与 `scripts/backup-manager.sh` 做一次备份恢复演练。

## 9. 迁移实施计划

> 总原则：绞杀者模式；单人开发，M0–M4 串行推进，时间盒动态调整；每阶段以 `scripts/tests/security-gate.sh` 全绿为退出条件；每阶段独立可回滚。

### M0 —— 基线与脚手架（零业务风险）

1. 建立度量基线：各包测试覆盖率、`go build` 时间、搜索接口 p95。
2. `migrations/V1__baseline.sql` + `migrate` 二进制 dry-run 双跑校验。
3. `api/openapi/openapi.yaml` 覆盖 `/search`、`/auth/*`；前端试点生成。
4. 人工复核仓库根 `AGENTS.md` 并形成书面结论（治理项，D-8 由 abner 手动执行）。
5. UI：前台 390px / 768px / 1440px 基线截图；设计 token 定稿（§6.9）。
6. 退出标准：`security-gate.sh` 全绿；基线报告归档。

### M1 —— 止血：统一横切 + 壳层试点

1. 统一错误响应（兼容层过渡）；合并 middleware，删除死代码；前端删除逃逸通道（`adminWorkspaceApi` 并入、`stream()` 扩展）。
2. 插件 kit 试点：2 个简单插件（`panwiki`、`quarksoo`）迁移到 `httpkit`。
3. UI：AdminShell、前后台共享设计系统、`shared/ui/DataTable`、登录页试点（§6.9–§6.11）。
4. 退出标准：后端全量单测 + `backend-race.sh`；前端 `pnpm test` + `e2e:mock` 全绿；`real-search-smoke.sh` 通过；登录页视觉评审通过。

### M2 —— 解耦核心：消灭全局 + 前台高频页

1. `config.AppConfig` → 构造注入（`service` 17 文件先行，`search_*` 优先；再 `api` 12 文件）。
2. `apikey_service` 试点消除 `database.GetDB()`；删除 `SetDB` 可变入口。
3. `api` 包 `Set*` 全局 → handler 工厂闭包；`router.go` 装配副作用上移 `bootstrap`。
4. 审计/管理审计有界化（D-5）；`SearchService` 6 个 `Set*` → functional options；循环依赖经事件解耦。
5. UI：首页、搜索结果页、热榜页按 §6.11 交付。
6. 退出标准："无全局" grep 门禁；`release-candidate.sh` 全链路；`docker-smoke.sh` 覆盖启动路径；三页视觉走查通过。

### M3 —— 领域重组：绞杀者迁移 + 剩余页面迁移

1. Repository 层（identity 试点 → ops → 全量）；搜索 pipeline 四包；`pluginops` Facade；插件显式注册 + kit 迁移（简单插件先行，`sidhub`/`weibo` 最后）；TG 收敛；前端 features 重组；类型生成转正；TanStack Query 接入（ADR-5）。
2. UI：个人中心、注册页、后台高频页面（总览/用户/插件/频道）按 §6.10–§6.11 交付。
3. 退出标准：每子项独立 PR + `real-search-smoke.sh`；插件 fixture 回放；G-1..G-7 达成。

### M4 —— 加固与收尾（持续）

1. `migrations/` 转正；插件无状态化完成；健康检查 L1/L2 探针；`SecretReader/Writer` 分离；旧 API 路径下线（D-6）；G-8..G-10 复核。
2. UI：剩余后台页面（性能/审计/公告/IP 封禁/设置）收口；视觉回归全量。
3. 退出标准：`release-candidate.sh` 全绿；热力图红区复核清零；本方案验收标准（§11）全达成。

## 10. 风险与应对

| 编号 | 风险 | 概率 | 影响 | 缓解 | 验证 |
|---|---|---|---|---|---|
| R1 | 错误格式统一影响前端解析 | 中 | 中 | 兼容字段过渡 | e2e:mock |
| R2 | 全局消除引入初始化顺序 bug | 中 | 高 | 逐个消除 + `wire.go` 启动自检（依赖非空断言） | docker-smoke.sh、backend-race.sh |
| R3 | 插件重构致搜索回归 | 中 | 高 | 新旧基类共存 + 按插件灰度 + `ENABLED_PLUGINS` 开关 | real-search-smoke.sh、fixture 回放 |
| R4 | Repository 拆分性能回退 | 低 | 中 | 先迁低频域 + p95 基线对比（>10% 阻断） | Phase 0 基线 |
| R5 | 版本化迁移数据风险 | 低 | 高 | 双跑校验 + 备份恢复演练 | docker-entrypoint-test.sh |
| R6 | 前端大重组 UI 回归 | 中 | 中 | 按 feature 逐个迁移 | playwright mock e2e + 视觉走查 |
| R7 | `AGENTS.md` 安全指令被自动化执行 | 低 | 高 | Phase 0 人工复核并书面定界 | 人工评审 |
| R8 | 团队容量不足导致阶段拉长、半截工程 | 中 | 高 | 阶段可独立交付；P-7 禁止跳阶段；每阶段结束可暂停 | 里程碑评审 |

## 11. 验收标准

1. G-1..G-10 全部达成（§3.2），以 CI 门禁 + 复评报告为证据。
2. `scripts/tests/security-gate.sh` 全绿；`release-candidate.sh` 全绿。
3. 全部 P0/P1 问题（评审报告 §4）在本方案中有对应设计（追踪矩阵见需求文档附录 A）。
4. 附录 B 的 ADR 全部经评审确认。
5. 新增/修改代码差异行覆盖率 ≥ 80% 持续达成（§7.5）。
6. UI：需求文档 FR-U / FR-A 走查问题逐项关闭；视觉回归基线全绿；390px / 768px / 1440px 无布局破损。

## 附录 A：现状文件到新架构的映射总表（主要）

| 现状 | 新位置 | 阶段 |
|---|---|---|
| `backend/main.go`（56 行 + 32 空白导入） | `cmd/server/main.go`（薄）+ `internal/app/wire.go`（显式注册） | Phase 3 |
| `cmd/bootstrap/` 619 行 | `internal/app/wire.go` | Phase 2 |
| `config/`（`AppConfig` 全局） | `internal/config`（不可变值对象） | Phase 2 |
| `database/`（`GetDB/SetDB`） | `wire.go` 唯一持有 `*gorm.DB`；`infrastructure/persistence` | Phase 2/3 |
| `api/router*.go`、`handler.go` 等 | `infrastructure/httpapi/router.go` + `v1/` handlers（工厂闭包） | Phase 2 |
| `api/middleware*.go`、`middleware/` | `infrastructure/httpapi/middleware`（合并，删死代码） | Phase 1 |
| `service/search_service.go` 等 13 文件 | `application/search/` + `pipeline/{selector,executor,merger,builder}` | Phase 3 |
| `service/plugin_*.go` 8 文件 | `application/pluginops` Facade + 内部实现 | Phase 3 |
| `service/tg_channel_*.go` | `infrastructure/searchsources/tgchannel`（实现 Source） | Phase 3 |
| `service/*` 其余（含 user/auth/apikey/settings） | `application/identity`、`application/ops` + `infrastructure/persistence` | Phase 2/3 |
| `plugin/plugin.go` 接口部分 | `domain/searchsource`（Source/Manifest） | Phase 3 |
| `plugin/baseasyncplugin.go` 998 行 | `searchsources/kit/{httpkit,parsekit,cachekit}` | Phase 1 试点 → Phase 3 |
| `plugin/<32 子目录>` | `infrastructure/searchsources/plugins/<name>`（渐进） | Phase 3 |
| `plugin/testutil` | fixture 回放契约测试 | Phase 1 |
| `util/` | `internal/pkg`（无业务语义部分）+ `infrastructure/cache` | Phase 2 |
| `frontend/src/stores/searchStore.ts` | `features/search/{store,usecase,api}.ts` | Phase 3 |
| `frontend/src/services/searchService.ts` | `features/search/api.ts`（`apiClient.stream()`） | Phase 1 |
| `frontend/src/components/admin/adminWorkspaceApi.ts` | 删除，并入 `apiClient` | Phase 1 |
| `frontend/src/hooks/use*Controller.ts` | 各 `features/*/containers` + 小 hooks | Phase 3 |
| `frontend/src/types/` 手写 | `types/generated`（openapi-typescript） | Phase 0 试点 → Phase 3 |
| `AppleTable/AdminDataTable` 等 | `shared/ui/DataTable` | Phase 3 |

## 附录 B：架构决策记录（ADR）

### ADR-1：采用模块化单体，不拆微服务

- 背景：约 14.2 万行代码、单一部署单元、无证据表明存在独立扩展/独立部署诉求。
- 决定：保持单体进程与单体部署，以模块边界 + 依赖规则保证内聚。
- 后果：若未来出现某上下文需独立扩展（如搜索执行），可将 `pipeline/executor` 提取为独立服务；当前不预付分布式成本。

### ADR-2：采用 golang-migrate 做版本化迁移

- 背景：`AutoMigrate` 无版本、不可审计、不可回滚（评审报告 §3.1 P1-4）。
- 决定：`migrations/` 为生产唯一 DDL 来源；`AutoMigrate` 降级为开发 bootstrap。
- 后果：需一次基线导出 + 双跑校验；回滚只需 revert 代码。

### ADR-3：OpenAPI 为前后端唯一契约源，前端类型生成

- 背景：手写类型 17 文件 + `buildSearchRequestPayload` 手工键映射，漂移风险（评审报告 §2.2 链路 4）。
- 决定：`api/openapi/openapi.yaml` 为准，`openapi-typescript` 生成前端类型；CI 防漂移。
- 后果：后端新增接口必须先写契约。

### ADR-4：插件保持编译期注册，不做运行时动态加载

- 背景：现状"热管理"实为对编译进二进制插件的启停，非运行时加载；真动态加载（go plugin / WASM / 独立进程）将引入版本、安全与运维复杂度。
- 决定：保留编译期注册，但改为显式注册表（`wire.go` 集中注册），消除 `init()` 自注册与空白导入。
- 后果：新增插件仍需重新编译部署；换来确定性与可测试性。

### ADR-5：引入 TanStack Query 承担服务端数据缓存

- 背景：`useSearchBoxController.ts` 经 `globalThis` 做服务端数据缓存，逃逸 React 状态体系，不可测试、易泄漏（评审报告 §2.2）。
- 决定：引入 TanStack Query 作为服务端数据缓存的唯一机制；`globalThis` 缓存删除。
- 后果：缓存策略（staleTime / gcTime / key 规范）需在 features 层统一约定；新增一个前端依赖。

### ADR-6：UI 以现有玻璃拟态为家族基线，统一材质、页面独立表达

- 背景：生产站走查发现多套色板、两套页脚、热榜风格割裂、技术文案外露等视觉不一致；决策人已确认前台现有玻璃拟态首页方向。
- 决定：全站统一玻璃拟态材质与共享设计系统（§6.9）；每个页面拥有独立的布局、排版与视觉隐喻（§6.11），禁止机械换皮；只做视觉重设计，不新增功能、不改变现有交互逻辑。
- 后果：每个页面需要独立的视觉设计（原型先行验证）；视觉回归基线覆盖关键页面。

## 附录 C：未核实项

1. 未编译验证：分析环境无 Go 工具链，依赖图来自源码读取与 grep；import 关系未做 `go build` 交叉确认。
2. 运行时行为为推断：如基类 `SetCurrentKeyword` 跨请求竞态、健康检查误熔断，未做并发复现。
3. 测试覆盖率未实测：未运行 `go test -cover` 与前端 coverage。
4. 性能数据缺失：M0 必须先建 p95 基线，否则 G-8 无法验收。
5. 行号引用以 commit `4f54d88` 为准；仓库演进可能导致行号漂移，文件名与结构结论稳定。
6. UI 交互细节来自生产站只读走查与原型验证：搜索结果"每次约 48 条"为观测值，真实分页参数以代码为准；后台系统设置走查仅覆盖两个标签页；地址栏直达后台偶发会话丢失的根因未定位，需开发环境复现确认；移动端/窄窗口以原型验证为准，真机需复核。

## 附录 D：修订记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-09-29 | 初稿，待架构评审确认 |
| v1.1 | 2026-09-29 | 落定 7 个开放问题：不拆微服务、插件编译期注册、单人里程碑动态调整、差异行覆盖率 ≥80%、审计满时丢弃最旧+指标、旧 API Phase 4 下线、TanStack Query 替代 globalThis 缓存 |
| v1.2 | 2026-09-29 | 纳入前台 UI 视觉统一（设计 token、统一组件库、页面框架、异步状态、响应式、视觉回归） |
| v1.3 | 2026-09-29 | 纳入管理后台 UI 重设计（AdminShell、后台五类页面模板、数据密集型组件规范、权限与危险操作反馈、前后台共享设计系统）；里程碑调整为 M0–M4 |
| v2.0 | 2026-09-30 | 完整重整：新增 §6.9–§6.11（共享设计系统、AdminShell、各页面视觉语言），ADR-5/ADR-6，P-8 设计原则，NFR-2 覆盖率门禁，里程碑 M0–M4 对齐需求文档 v2.0 |
