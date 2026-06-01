# pansou 插件与频道更新开发计划

生成时间：2026-06-01 18:59:39 CST  
依据文档：`docs/pansou插件频道更新方案.md`  
上游仓库：`https://github.com/fish2018/pansou`  
上游提交：`81f933840259f9684977dc7879a661b8b27e0bc9`

## 1. 开发目标

本计划用于把前置方案落成可执行开发任务，目标是：

1. 修复当前默认启用插件中已经不可用或弱可用的来源。
2. 按批次迁入上游 pansou 可复用插件，并适配当前项目的插件清单、资源协议、插件中心和健康状态。
3. 合并上游新增 Telegram 频道，补齐频道标签和健康验证记录。
4. 建立可重复的本地验证流程，确保每次迁入都能独立编译、测试、回滚。

本计划不采用整体覆盖上游后端的方式。当前项目已有插件中心、健康状态、资源协议、用户后台、Redis 缓存和频道数据库管理，所有迁入工作必须围绕这些本地能力做适配。

## 2. 交付物清单

| 类型 | 交付物 | 说明 |
|---|---|---|
| 插件代码 | `backend/plugin/<name>/<name>.go` | 新增或修复插件实现 |
| 插件注册 | `backend/main.go` | 增加新增插件空导入 |
| 插件测试 | `backend/plugin/<name>/<name>_test.go` | 每个新增插件至少包含契约测试 |
| 插件清单 | 插件构造函数内 `SetManifest` | 补齐插件中心展示、能力、来源、优先级 |
| 默认配置 | `.env.example`、`README.md`、`docker-compose.yml` | 更新默认插件和频道示例 |
| 频道数据 | `.env.example`、`README.md`，必要时新增频道导入说明 | 增加 28 个上游频道并去重 |
| 验证记录 | `.Codex/verification-report.md` | 每批迁入记录本地验证结果 |
| 操作记录 | `.Codex/operations-log.md` | 记录迁入决策、失败原因和补救措施 |

## 3. 总体里程碑

| 里程碑 | 状态 | 名称 | 目标 | 预计改动规模 |
|---|---|---|---|---|
| M0 | 已完成 | 基线盘点 | 固化上游提交、当前默认插件、频道差异和验证关键词 | 文档与临时验证记录 |
| M1 | 未开始 | 默认插件修复 | 对当前 27 个默认启用插件做可用性审计和优先修复 | 中等 |
| M2 | 已完成 | P0 插件迁入 | 迁入 9 个高优先级上游插件 | 较大 |
| M3 | 已完成 | 插件清单与插件中心补齐 | 确保新增插件在后台可见、可测、可启停 | 中等 |
| M4 | 已完成 | 频道更新 | 追加上游 28 个新增频道，保留本地独有频道 | 小到中等 |
| M5 | 已完成 | 本地健康验证 | 对插件和频道做批量健康检查并记录结果 | 中等 |
| M6 | 已完成 | 默认启用收敛 | 只把通过验证的插件和频道写入默认配置 | 小 |
| M7 | 已完成 | 回归与交付 | 完整本地测试、文档、回滚说明 | 中等 |
| M8 | 已完成 | 用户指定全量启用 | 将本轮新增插件和频道全部写入默认启用配置 | 小 |

### 3.1 执行状态明细

| 任务 | 状态 | 完成时间 | 说明 |
|---|---|---|---|
| T0.1 固化上游源码基线 | 已完成 | 2026-06-01 18:59:39 CST | 已生成 `.Codex/pansou-baseline-20260601.md` |
| T0.2 建立健康验证关键词集 | 已完成 | 2026-06-01 18:59:39 CST | 已固定 `仙逆`、`庆余年`、`4K`、`短剧`、`纪录片` |
| T2.1 迁入 `zhizhen` | 已完成 | 2026-06-01 18:59:39 CST | 已迁入插件、注册入口、显式清单和测试 |
| T2.2 迁入 `duoduo` | 已完成 | 2026-06-01 18:59:39 CST | 已迁入插件、注册入口、显式清单和测试 |
| T2.3 迁入 `huban` | 已完成 | 2026-06-01 19:17:59 CST | 已迁入插件、注册入口、显式清单和测试 |
| T2.4 迁入 `jikepan`、`qupansou` | 已完成 | 2026-06-01 19:23:50 CST | 已迁入两个 API 型插件、注册入口、显式清单和测试 |
| T2.5 迁入 `panwiki` | 已完成 | 2026-06-01 19:28:48 CST | 已迁入论坛型插件、主备域名、详情页链接解析、显式清单和测试 |
| T2.6 迁入 `pan666`、`hdr4k`、`panyq` | 已完成 | 2026-06-01 19:36:40 CST | 已迁入三个补充 P0 插件、注册入口、显式清单和测试 |
| T7.1 后端完整回归 | 已完成 | 2026-06-01 20:09:41 CST | `go test ./...`、插件清单校验、服务与搜索冒烟工具测试均通过 |
| T7.2 前端后台回归 | 已完成 | 2026-06-01 20:09:41 CST | `pnpm run check`、`pnpm run lint`、插件与频道管理测试均通过 |
| T7.3 搜索链路冒烟 | 已完成 | 2026-06-01 20:09:41 CST | 已生成 `.Codex/pansou-search-smoke.md`，`src=tg` 与 `src=all` 有可用资源 |
| T8.1 启用新增插件 | 已完成 | 2026-06-01 20:28:07 CST | `ENABLED_PLUGINS` 追加 9 个新增插件，`PLUGIN_COUNT=36` |
| T8.2 启用新增频道 | 已完成 | 2026-06-01 20:28:07 CST | `CHANNELS` 追加本轮上游新增 28 个频道，总数 119 |

## 4. 任务拆分

### M0：基线盘点（已完成）

#### T0.1 固化上游源码基线（已完成）

- 涉及路径：`/private/tmp/pansou-upstream`、`.Codex/operations-log.md`
- 动作：
  1. 克隆或更新上游仓库到临时目录。
  2. 记录上游 HEAD。
  3. 重新统计本地与上游插件目录差异。
  4. 重新统计本地与上游频道差异。
- 验收标准：
  - 能明确列出本地 Go 插件数、上游 Go 插件数、缺失插件列表。
  - 能明确列出新增频道、重复频道、本地独有频道。
- 本地验证：
  ```bash
  git -C /private/tmp/pansou-upstream rev-parse HEAD
  node -e "const fs=require('fs'); console.log('基线统计使用本地脚本片段执行')"
  ```
- 完成记录：
  - 上游 HEAD：`81f933840259f9684977dc7879a661b8b27e0bc9`
  - 基线文件：`.Codex/pansou-baseline-20260601.md`

#### T0.2 建立健康验证关键词集（已完成）

- 涉及路径：`.Codex/operations-log.md`
- 动作：
  1. 固定至少 5 个验证关键词：`仙逆`、`庆余年`、`4K`、`短剧`、`纪录片`。
  2. 区分插件关键词和频道关键词。
  3. 记录空结果不等于不可用，网络错误、解析错误、超时才计为失败。
- 验收标准：
  - 每批插件使用同一组关键词验证，结果可横向比较。
- 完成记录：
  - 插件和频道健康验证关键词统一为：`仙逆`、`庆余年`、`4K`、`短剧`、`纪录片`。

### M1：默认插件修复

#### T1.1 对当前默认插件做健康审计

- 涉及路径：`.env.example`、`backend/plugin/*`、`.Codex/verification-report.md`
- 插件范围：
  `labi`、`shandian`、`muou`、`wanou`、`hunhepan`、`pansearch`、`panta`、`susu`、`thepiratebay`、`xuexizhinan`、`ouge`、`erxiao`、`fox4k`、`clmao`、`cldi`、`libvio`、`yuhuage`、`u3c3`、`javdb`、`jutoushe`、`djgou`、`nyaa`、`xinjuc`、`aikanzy`、`quark4k`、`quarksoo`、`ash`。
- 动作：
  1. 逐个执行插件搜索冒烟。
  2. 记录错误类型：请求失败、状态码异常、JSON 解析失败、HTML 选择器失效、链接为空、关键词无结果。
  3. 对照上游同名插件，标出可移植的域名、选择器、请求头、链接正则和分页逻辑。
- 验收标准：
  - 每个默认插件都有 `健康 / 弱可用 / 不可用 / 暂缓` 状态。
  - 不可用插件有明确原因和后续动作。

#### T1.2 修复同名插件的可用性问题

- 涉及路径：`backend/plugin/<name>/<name>.go`、`backend/plugin/<name>/<name>_test.go`
- 动作：
  1. 优先修复当前默认启用且上游同名插件已有更新的插件。
  2. 只迁移搜索逻辑差异，不覆盖本项目 `SetManifest` 和资源协议适配。
  3. 对解析逻辑变化新增 fixture 或最小解析测试。
  4. 对磁力、论坛聚合、英文资源类插件复核 `SkipServiceFilter`。
- 验收标准：
  - 修复插件至少通过契约测试。
  - 修复插件对验证关键词不 panic，错误可被搜索服务转为 warning。
  - 仍能在插件中心正常展示。
- 本地验证：
  ```bash
  cd backend
  go test ./plugin/<name> ./plugin
  go test ./service ./api
  go run tools/validate_plugin_manifests.go
  ```

### M2：P0 插件迁入

#### T2.1 迁入 `zhizhen`（已完成）

- 来源：上游 `plugin/zhizhen`
- 涉及路径：`backend/plugin/zhizhen/zhizhen.go`、`backend/plugin/zhizhen/zhizhen_test.go`、`backend/main.go`
- 动作：
  1. 复制上游实现。
  2. 替换 `pansou/...` 导入为 `unisearch/...`。
  3. 补齐 `SetManifest`，优先级设为 1。
  4. 增加空导入。
  5. 增加契约测试和基础解析测试。
- 验收标准：
  - `go test ./plugin/zhizhen` 通过。
  - 插件中心能显示完整清单，状态不是意外的 `generated`。
- 完成记录：
  - 已新增 `backend/plugin/zhizhen/zhizhen.go`。
  - 已新增 `backend/plugin/zhizhen/zhizhen_test.go`。
  - 已在 `backend/main.go` 注册空导入。
  - 已在 `backend/tools/validate_plugin_manifests.go` 注册清单校验导入。
  - 已补齐 `search.zhizhen` 显式插件清单。
  - 验证通过：`go test ./plugin/zhizhen ./plugin`、`go run tools/validate_plugin_manifests.go`、`go test ./...`。

#### T2.2 迁入 `duoduo`（已完成）

- 来源：上游 `plugin/duoduo`
- 涉及路径：`backend/plugin/duoduo/duoduo.go`、`backend/plugin/duoduo/duoduo_test.go`、`backend/main.go`
- 动作：
  1. 复制并适配导入路径。
  2. 补齐 `SetManifest`，优先级设为 2。
  3. 保留详情页缓存和并发限制。
  4. 增加契约测试。
- 验收标准：
  - 搜索结果含有效 `UniqueID`、`Title`、`Links`。
- 完成记录：
  - 已新增 `backend/plugin/duoduo/duoduo.go`。
  - 已新增 `backend/plugin/duoduo/duoduo_test.go`。
  - 已保留上游 `backend/plugin/duoduo/html结构分析.md` 作为解析依据。
  - 已在 `backend/main.go` 注册空导入。
  - 已在 `backend/tools/validate_plugin_manifests.go` 注册清单校验导入。
  - 已补齐 `search.duoduo` 显式插件清单。
  - 验证通过：`go test ./plugin/duoduo ./plugin`、`go run tools/validate_plugin_manifests.go`、`go test ./...`。

#### T2.3 迁入 `huban`（已完成）

- 来源：上游 `plugin/huban`
- 涉及路径：`backend/plugin/huban/huban.go`、`backend/plugin/huban/huban_test.go`、`backend/main.go`
- 动作：
  1. 迁入实现并移除不适合当前项目的硬编码来源控制。
  2. 补齐清单，优先级设为 2。
  3. 确认目标域名和详情页逻辑可用。
- 验收标准：
  - 失败时返回明确错误，不影响其他插件结果。
- 完成记录：
  - 已新增 `backend/plugin/huban/huban.go`。
  - 已新增 `backend/plugin/huban/huban_test.go`。
  - 已保留上游 `backend/plugin/huban/html结构分析.md` 与 `backend/plugin/huban/json结构分析.md` 作为解析依据。
  - 已移除上游硬编码来源控制逻辑，避免与当前项目插件中心启停和健康管理重复。
  - 已在 `backend/main.go` 注册空导入。
  - 已在 `backend/tools/validate_plugin_manifests.go` 注册清单校验导入。
  - 已补齐 `search.huban` 显式插件清单。
  - 验证通过：`go test ./plugin/huban ./plugin`、`go run tools/validate_plugin_manifests.go`、`go test ./...`。

#### T2.4 迁入 API 型插件 `jikepan`、`qupansou`（已完成）

- 来源：上游 `plugin/jikepan`、`plugin/qupansou`
- 涉及路径：
  - `backend/plugin/jikepan/jikepan.go`
  - `backend/plugin/qupansou/qupansou.go`
  - 对应测试文件
  - `backend/main.go`
- 动作：
  1. 复制实现并适配导入路径。
  2. 补齐清单，优先级设为 3。
  3. 保留 POST 请求结构和链接类型映射。
  4. 为 API 响应增加 JSON fixture 测试。
- 验收标准：
  - API 响应为空时不报错。
  - API 返回未知链接类型时跳过无效链接。
- 完成记录：
  - 已新增 `backend/plugin/jikepan/jikepan.go`。
  - 已新增 `backend/plugin/jikepan/jikepan_test.go`。
  - 已新增 `backend/plugin/qupansou/qupansou.go`。
  - 已新增 `backend/plugin/qupansou/qupansou_test.go`。
  - 已在 `backend/main.go` 注册两个插件空导入。
  - 已在 `backend/tools/validate_plugin_manifests.go` 注册两个插件清单校验导入。
  - 已补齐 `search.jikepan` 与 `search.qupansou` 显式插件清单。
  - 已覆盖空 API 列表返回空结果、未知链接类型跳过、基础链接类型映射和时间/标题解析。
  - 验证通过：`go test ./plugin/jikepan ./plugin/qupansou ./plugin`、`go run tools/validate_plugin_manifests.go`、`go test ./...`。

#### T2.5 迁入论坛型插件 `panwiki`（已完成）

- 来源：上游 `plugin/panwiki`
- 涉及路径：`backend/plugin/panwiki/panwiki.go`、`backend/plugin/panwiki/panwiki_test.go`、`backend/main.go`
- 动作：
  1. 迁入主备域名切换逻辑。
  2. 补齐清单。
  3. 复核 `NewBaseAsyncPluginWithFilter` 是否继续跳过 Service 层过滤。
  4. 为重定向和详情页链接解析增加测试。
- 验收标准：
  - 主域名失败时能切换备用域名。
  - 详情页链接提取失败不导致整体 panic。
- 完成记录：
  - 已新增 `backend/plugin/panwiki/panwiki.go`。
  - 已新增 `backend/plugin/panwiki/panwiki_test.go`。
  - 已迁入主备域名搜索逻辑，避免修改共享 `http.Client` 的重定向策略。
  - 已复用 `backend/plugin/parser` 解析详情页网盘链接。
  - 已保留 `NewBaseAsyncPluginWithFilter("panwiki", 3, true)`，并在插件清单中标记 `SkipServiceFilter`。
  - 已在 `backend/main.go` 注册空导入。
  - 已在 `backend/tools/validate_plugin_manifests.go` 注册清单校验导入。
  - 已补齐 `search.panwiki` 显式插件清单。
  - 验证通过：`go test ./plugin/panwiki ./plugin`、`go run tools/validate_plugin_manifests.go`、`go test ./...`。

#### T2.6 迁入补充 P0 插件 `pan666`、`hdr4k`、`panyq`（已完成）

- 来源：上游对应插件目录。
- 涉及路径：`backend/plugin/pan666`、`backend/plugin/hdr4k`、`backend/plugin/panyq`、`backend/main.go`
- 动作：
  1. 逐个迁入，不合并成单次大改。
  2. 每个插件补 `SetManifest` 和契约测试。
  3. 根据结果质量决定是否进入默认启用列表。
- 验收标准：
  - 每个插件能独立回滚。
  - 每个插件有健康验证记录。
- 完成记录：
  - 已新增 `backend/plugin/pan666/pan666.go` 与 `backend/plugin/pan666/pan666_test.go`。
  - 已新增 `backend/plugin/hdr4k/hdr4k.go` 与 `backend/plugin/hdr4k/hdr4k_test.go`。
  - 已新增 `backend/plugin/panyq/panyq.go` 与 `backend/plugin/panyq/panyq_test.go`。
  - 已在 `backend/main.go` 注册三个插件空导入。
  - 已在 `backend/tools/validate_plugin_manifests.go` 注册三个插件清单校验导入。
  - 已补齐 `search.pan666`、`search.hdr4k`、`search.panyq` 显式插件清单。
  - 已让 `pan666` 和 `hdr4k` 复用 `backend/plugin/parser` 解析网盘链接。
  - 已移除 `panyq` 上游文件缓存和来源白名单逻辑，保留动态 Action ID、搜索凭证、搜索结果和最终链接解析路径。
  - 验证通过：`go test ./plugin/pan666 ./plugin/hdr4k ./plugin/panyq ./plugin`、`go run tools/validate_plugin_manifests.go`、`go test ./...`。

### M3：插件清单与插件中心补齐

#### T3.1 补齐新增插件清单（已完成）

- 涉及路径：`backend/plugin/<name>/<name>.go`、`backend/plugin/manifest_test.go`
- 动作：
  1. 每个新增插件设置 `ID`、`Name`、`Version`、`Category`、`Description`。
  2. 设置 `Capabilities` 为 `resource.search`。
  3. 设置 `Resource.SourceLabel`、`SupportedMediaTypes`、`TargetTypes`、`Priority`。
  4. 磁力或特殊格式插件设置 `SkipServiceFilter`。
- 验收标准：
  - `go run tools/validate_plugin_manifests.go` 通过。
  - 插件中心展示信息完整。
- 完成记录：
  - M2 新增 9 个插件均已补齐显式清单：`zhizhen`、`duoduo`、`huban`、`jikepan`、`qupansou`、`panwiki`、`pan666`、`hdr4k`、`panyq`。
  - 已覆盖 `ID`、`Name`、`Version`、`Category`、`Description`、`Capabilities`、`Resource.SourceLabel`、`SupportedMediaTypes`、`TargetTypes`、`Priority`。
  - `panwiki` 已同步标记 `SkipServiceFilter`。
  - 验证通过：`go run tools/validate_plugin_manifests.go`、`go test ./plugin -run Manifest`。

#### T3.2 验证插件启停与健康状态（已完成）

- 涉及路径：`backend/service/plugin_state_service.go`、`backend/service/plugin_health_service.go`、`backend/api/admin_handler.go`
- 动作：
  1. 确认新增插件能被插件中心列出。
  2. 确认禁用后不会进入搜索执行器。
  3. 确认健康测试结果可持久化。
- 验收标准：
  - 禁用插件后搜索不会调用该插件。
  - 健康失败插件显示错误状态，但不影响其他插件。
- 本地验证：
  ```bash
  cd backend
  go test ./service -run 'Plugin|Search'
  go test ./api -run 'Plugin'
  ```
- 完成记录：
  - 新增插件已进入全局注册链路，`go run tools/validate_plugin_manifests.go` 显示插件总数为 52。
  - 插件中心相关 service/API 测试通过。
  - 验证通过：`go test ./service -run 'Plugin|Search'`、`go test ./api -run 'Plugin'`。

### M4：频道更新

#### T4.1 合并频道列表（已完成）

- 涉及路径：`.env.example`、`README.md`、`docker-compose.yml`
- 新增频道：
  `tgsearchers6`、`sbsbsnsqq`、`kkxlzy`、`alyp_1`、`dianyingshare`、`WFYSFX02`、`cctv1211`、`liangxingzhinan`、`ammmziyuan`、`cili8888`、`jzmm_123pan`、`Q_dianying`、`domgmingapk`、`dianying4k`、`q_dianshiju`、`tgbokee`、`ucshare`、`godupan`、`gokuapan`、`gimy115`、`WFYSFX03`、`peccxin`、`Movie888035`、`xlwpzy`、`zyywpzy`、`wydwpzy`、`gimy100`、`gimy115iso`。
- 保留频道：
  `SharePanBaidu`、`ali_yppan`。
- 动作：
  1. 在本地频道列表末尾追加新增频道。
  2. 去除重复频道，尤其是 `ucshare`。
  3. 保持频道顺序稳定，避免无意义重排。
- 验收标准：
  - 新列表无重复。
  - README、`.env.example`、部署示例一致。
- 完成记录：
  - 已更新 `.env.example` 中 `CHANNELS`。
  - 已更新 README 中 2 处 Zeabur 环境变量模板。
  - `docker-compose.yml` 当前未配置 `CHANNELS`，本次无需修改。
  - 合并后频道数为 119，包含本地独有 `SharePanBaidu`、`ali_yppan`，无重复频道。

#### T4.2 补充频道标签建议（已完成）

- 涉及路径：如实施时选择持久化标签，可使用管理端批量更新；默认文档先记录标签策略。
- 标签策略：
  - 影视：`Q_dianying`、`dianying4k`、`q_dianshiju`、`Movie888035`、`gimy100`、`gimy115`、`gimy115iso`
  - 网盘综合：`tgsearchers6`、`godupan`、`gokuapan`、`ucshare`、`xlwpzy`、`zyywpzy`、`wydwpzy`
  - 夸克/UC/115：`kkxlzy`、`alyp_1`、`WFYSFX02`、`WFYSFX03`
  - 短剧/资料/其他：`cctv1211`、`liangxingzhinan`、`domgmingapk`、`tgbokee`
- 验收标准：
  - 管理端能按标签筛选频道。
  - 标签词库无明显重复别名。
- 完成记录：
  - 标签策略已记录在本计划文档，后续如需持久化，可通过管理端频道管理批量更新。
  - 本批次不直接写库，避免覆盖已有部署中的人工标签。

#### T4.3 处理已有部署数据库同步（已完成）

- 涉及路径：`backend/service/tg_channel_service.go`、README 运维说明
- 动作：
  1. 明确 `MigrateFromEnv` 只追加缺失频道，不删除旧频道。
  2. 在 README 增加已有部署同步说明：更新环境变量后重启，或通过管理端批量导入。
  3. 如需要一键导入，单独设计幂等管理接口或工具，不在本批次混入插件迁入。
- 验收标准：
  - 已有数据库不会被默认配置覆盖。
  - 新增频道可通过现有管理端导入或启用。
- 完成记录：
  - README 已补充 Telegram 频道同步说明。
  - 已明确更新环境变量后重启会追加缺失频道，不删除数据库已有频道。
  - 验证通过：`go test ./service -run 'TGChannel|Channel'`、`go test ./api -run 'Channel'`。

### M5：本地健康验证

#### T5.1 插件健康矩阵（已完成）

- 涉及路径：`.Codex/verification-report.md`
- 动作：
  1. 对所有新增 P0 插件执行验证关键词搜索。
  2. 对已修复默认插件执行同样验证。
  3. 记录结果数、有效链接数、耗时、错误。
  4. 标记 `可默认启用 / 可安装不默认启用 / 暂缓迁入 / 保留关闭`。
- 验收标准：
  - 每个插件都有明确结论。
  - 默认启用列表只包含通过健康验证的插件。
- 完成记录：
  - 已新增可重复执行工具 `backend/tools/pansou_health_check/main.go`。
  - 已生成 `.Codex/pansou-health-matrix.md`。
  - 9 个新增 P0 插件均已完成 `仙逆`、`庆余年`、`4K`、`短剧`、`纪录片` 验证。
  - 本轮无新增插件达到“可默认启用”标准。
  - `huban`、`panwiki`、`panyq` 可请求但未返回有效链接，标记为暂缓迁入。
  - `zhizhen`、`duoduo`、`jikepan`、`qupansou`、`pan666`、`hdr4k` 当前外部源错误，标记为保留关闭。

#### T5.2 频道健康矩阵（已完成）

- 涉及路径：`.Codex/verification-report.md`
- 动作：
  1. 对新增频道访问 `https://t.me/s/<channel>`。
  2. 对健康频道执行关键词搜索。
  3. 记录 `healthy/error/untested`。
- 验收标准：
  - 健康失败频道不默认启用，或在管理端标记为错误。
- 完成记录：
  - 已对 28 个新增频道访问 `https://t.me/s/<channel>` 并使用关键词 `仙逆` 解析结果。
  - 健康频道：`tgbokee`、`gokuapan`、`gimy115`、`WFYSFX03`。
  - 其余新增频道为 `error` 或 `untested`，不进入 M6 默认启用列表。
  - 健康矩阵文件：`.Codex/pansou-health-matrix.md`。

### M6：默认启用收敛

#### T6.1 更新默认插件配置（已完成）

- 涉及路径：`.env.example`、`README.md`、`docker-compose.yml`
- 动作：
  1. 保留当前健康通过的默认插件。
  2. 加入健康通过的 P0 插件。
  3. 对弱可用插件保持可安装但默认关闭。
- 验收标准：
  - 默认插件列表和 `backend/main.go` 已注册插件一致。
  - 默认启动不会加载未迁入插件。
- 完成记录：
  - M5 健康矩阵显示本轮新增插件无“可默认启用”项。
  - `.env.example` 与 README 中 `ENABLED_PLUGINS` 保持原 27 个默认插件，不加入新增 P0 插件。
  - `PLUGIN_COUNT=27` 保持不变。

#### T6.2 更新默认频道配置（已完成）

- 涉及路径：`.env.example`、`README.md`、`docker-compose.yml`
- 动作：
  1. 加入健康通过的新增频道。
  2. 保留本地独有且健康通过的频道。
  3. 对健康失败频道标注为待复查，不进入默认列表。
- 验收标准：
  - 默认频道列表无重复。
  - 启动后 `DefaultConcurrency` 计算符合频道和插件数量。
- 完成记录：
  - 默认频道列表仅加入 M5 验证为 healthy 的新增频道：`tgbokee`、`gokuapan`、`gimy115`、`WFYSFX03`。
  - 未通过健康验证的新增频道不进入默认 `CHANNELS`，保留在 `.Codex/pansou-health-matrix.md` 等待复查。
  - `.env.example` 1 处和 README 2 处 `CHANNELS` 均为 95 个频道，无重复且内容一致。
  - 验证通过：`go test ./config ./service -run 'Channel|Config'`。

### M7：回归与交付（已完成）

#### T7.1 后端完整回归（已完成）

- 本地验证：
  ```bash
  cd backend
  go test ./...
  go run tools/validate_plugin_manifests.go
  ```
- 验收标准：
  - 后端全部测试通过。
  - 插件清单校验通过。
  - 新增插件不破坏搜索服务、插件中心、健康状态。
- 完成记录：
  - `go test ./...`：通过。
  - `go run tools/validate_plugin_manifests.go`：通过，注册插件数 52，历史生成清单插件 41。
  - `go test ./service ./tools/pansou_search_smoke`：通过。

#### T7.2 前端后台回归（已完成）

- 本地验证：
  ```bash
  cd frontend
  pnpm run check
  pnpm run lint
  pnpm test -- PluginManageWorkspace ChannelManageWorkspace --run
  ```
- 验收标准：
  - 插件管理页可展示新增插件。
  - 频道管理页可展示新增频道、标签和健康状态。
- 完成记录：
  - `pnpm run check`：通过。
  - `pnpm run lint`：通过。
  - `pnpm test -- PluginManageWorkspace ChannelManageWorkspace --run`：通过，实际执行全量 85 个测试文件、352 个测试。

#### T7.3 搜索链路冒烟（已完成）

- 动作：
  1. 启动本地后端和前端。
  2. 搜索 `仙逆`、`庆余年`、`4K`。
  3. 分别验证 `src=all`、`src=plugin`、`src=tg`。
  4. 验证禁用某个新增插件后搜索结果不包含该插件来源。
- 验收标准：
  - 搜索接口返回 `resources`。
  - 前端结果页无阻塞错误。
  - warnings 不影响可用结果展示。
- 完成记录：
  - 新增工具：`backend/tools/pansou_search_smoke/main.go`。
  - `go run ./tools/pansou_search_smoke`：通过，输出 `.Codex/pansou-search-smoke.md`。
  - `src=plugin` 返回 0 个资源且有 6 条 warnings，符合 M5 新增插件未默认启用的预期。
  - `src=tg` 对 `仙逆`、`庆余年`、`4K` 分别返回 47、9、58 个资源。
  - `src=all` 对 `仙逆`、`庆余年`、`4K` 分别返回 47、9、58 个资源，warnings 不影响可用结果汇总。

### M8：用户指定全量启用（已完成）

> 说明：M6 的默认策略是“仅启用健康矩阵通过项”。用户在 2026-06-01 明确要求“将新增的插件和频道都启用”，因此本阶段按用户指定策略覆盖 M6 的默认启用收敛结果。

#### T8.1 启用新增插件（已完成）

- 涉及路径：`.env.example`、`README.md`
- 新增启用插件：
  `zhizhen`、`duoduo`、`huban`、`jikepan`、`qupansou`、`panwiki`、`pan666`、`hdr4k`、`panyq`。
- 完成记录：
  - `.env.example` 中 `ENABLED_PLUGINS` 已追加 9 个新增插件。
  - `.env.example` 中 `PLUGIN_COUNT` 已从 27 调整为 36。
  - README Zeabur 环境变量模板已同步 `ENABLED_PLUGINS` 与 `PLUGIN_COUNT`。
  - 验证通过：启用插件数量 36，无重复，`PLUGIN_COUNT` 与列表数量一致。

#### T8.2 启用新增频道（已完成）

- 涉及路径：`.env.example`、`README.md`
- 新增启用频道：
  `tgsearchers6`、`sbsbsnsqq`、`kkxlzy`、`alyp_1`、`dianyingshare`、`WFYSFX02`、`cctv1211`、`liangxingzhinan`、`ammmziyuan`、`cili8888`、`jzmm_123pan`、`Q_dianying`、`domgmingapk`、`dianying4k`、`q_dianshiju`、`tgbokee`、`ucshare`、`godupan`、`gokuapan`、`gimy115`、`WFYSFX03`、`peccxin`、`Movie888035`、`xlwpzy`、`zyywpzy`、`wydwpzy`、`gimy100`、`gimy115iso`。
- 完成记录：
  - `.env.example` 中 `CHANNELS` 已包含本轮上游新增 28 个频道。
  - README Zeabur 环境变量模板已同步完整 `CHANNELS`。
  - 当前默认频道总数为 119，无重复。
  - 验证通过：`.env.example` 与 README 两处部署模板的 `CHANNELS` 完全一致。

## 5. 执行顺序建议

推荐按以下顺序开分支和提交，避免一次性改动过大：

1. `docs: 记录 pansou 同步基线`
2. `fix(plugin): 修复默认插件可用性第一批`
3. `feat(plugin): 迁入 zhizhen duoduo huban`
4. `feat(plugin): 迁入 jikepan qupansou panwiki`
5. `feat(plugin): 迁入 pan666 hdr4k panyq`
6. `feat(config): 更新默认频道清单`
7. `test(plugin): 补齐插件健康与清单验证`
8. `docs: 更新部署与回滚说明`

每个提交都必须保持 `go test ./...` 可通过；如果插件依赖外部站点导致测试不稳定，测试应使用 fixture 覆盖解析逻辑，把联网健康检查记录到验证报告。

## 6. 回滚计划

| 场景 | 回滚动作 |
|---|---|
| 新插件编译失败 | 移除对应插件目录和 `backend/main.go` 空导入 |
| 新插件运行超时 | 通过插件状态服务禁用，移出默认 `ENABLED_PLUGINS` |
| 插件中心展示异常 | 回退该插件 `SetManifest` 或临时标记为默认关闭 |
| 频道不可访问 | 管理端禁用频道，保留记录等待复查 |
| 默认配置导致启动慢 | 回退 `.env.example`、README 和部署示例中的新增默认启用项 |

## 7. 暂缓事项

以下事项不并入第一轮迁入，避免扩大风险：

1. `qqpd` 登录态、管理页面和 Web 路由适配。
2. 大规模迁入全部 P1/P2 插件。
3. 新增长期后台健康巡检任务。
4. 新增独立频道目录文件或数据库种子重构。
5. 对搜索排序算法做结构性调整。

## 8. 完成定义

本开发计划完成时应满足：

1. 当前默认插件完成健康审计，不可用插件有明确处理结果。
2. P0 插件迁入并通过本地测试。
3. 新增插件在插件中心可见、可启停、可健康测试。
4. 上游新增频道完成合并、去重和健康验证。
5. 默认配置只包含通过验证的插件和频道。
6. README、`.env.example`、部署示例、验证报告和操作日志同步更新。
