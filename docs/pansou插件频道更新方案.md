# pansou 插件与频道更新方案

生成时间：2026-06-01 18:51:55 CST  
上游仓库：[fish2018/pansou](https://github.com/fish2018/pansou)  
上游提交：`81f933840259f9684977dc7879a661b8b27e0bc9`

## 1. 目标与范围

本方案先回答两个问题：

1. 上游 `fish2018/pansou` 里哪些能力可以拿来用。
2. 当前项目应如何基于上游更新不可用插件和 Telegram 频道内容。

本阶段只输出方案文档，不直接修改插件代码、频道配置或数据库数据。后续实施必须先经过本地验证，不能依赖 CI 或人工外包验证。

## 2. 当前项目与上游差异结论

### 2.1 后端架构关系

当前项目仍保留 pansou 的核心异步插件接口：

- 插件接口在 `backend/plugin/plugin.go:20`。
- 插件基类在 `backend/plugin/baseasyncplugin.go:235`。
- 插件通过 `backend/main.go:9` 后的空导入触发 `init()` 注册。
- 启动时在 `backend/cmd/bootstrap/app.go:67` 按 `ENABLED_PLUGINS` 加载插件。

但当前项目已经扩展了以下本地能力，不能被上游代码整体覆盖：

- 插件清单与资源协议：`backend/plugin/manifest.go:21`、`backend/model/plugin_manifest.go`。
- 插件中心目录：`backend/service/plugin_catalog_service.go:61`。
- 插件健康与启停状态：`backend/service/plugin_health_service.go:27`、`backend/service/plugin_state_service.go`。
- TG 频道数据库管理：`backend/service/tg_channel_service.go:245`。
- 搜索响应统一为 `resources/facets/warnings`，不是上游旧的 `results/merged_by_type`。

结论：**只迁入上游插件实现、频道清单和可复用解析逻辑，不迁入上游主程序、缓存系统、路由和响应模型。**

### 2.2 插件数量差异

本次对比使用上游 `plugin` 目录和本地 `backend/plugin` 目录：

| 项目 | 本地 | 上游 | 结论 |
|---|---:|---:|---|
| 有 Go 实现的插件 | 43 | 89 | 本地缺少 46 个上游插件 |
| 当前 `.env.example` 默认启用插件 | 27 | 上游 compose 启用 78 | 本地默认启用范围明显偏小 |
| 目录已存在但无 Go 实现 | `yppan` | `pioz` 仅资料 | 不作为迁入对象 |

本地缺少的上游插件为：

`ahhhhfs`、`bixin`、`clxiong`、`cyg`、`ddys`、`discourse`、`duanjuw`、`duoduo`、`dyyjpro`、`gaoqing888`、`gying`、`haisou`、`hdmoli`、`hdr4k`、`huban`、`jikepan`、`jupansou`、`leijing`、`lingjisp`、`melost`、`miaoso`、`nsgame`、`pan666`、`panlian`、`panwiki`、`panyq`、`panzun`、`pianku`、`qiwei`、`qqpd`、`quarktv`、`qupanshe`、`qupansou`、`sdso`、`sousou`、`wuji`、`xb6v`、`xdpan`、`xdyh`、`xiaoji`、`xiaozhang`、`xys`、`yulinshufa`、`yunso`、`yunsou`、`zhizhen`。

### 2.3 频道数量差异

本地 `.env.example:226` 当前有 91 个频道。上游 `docker-compose.yml` 当前有 118 个频道，其中去重后 117 个。上游比本地多 28 个唯一频道，本地比上游多 2 个频道。

建议新增的上游频道：

`tgsearchers6`、`sbsbsnsqq`、`kkxlzy`、`alyp_1`、`dianyingshare`、`WFYSFX02`、`cctv1211`、`liangxingzhinan`、`ammmziyuan`、`cili8888`、`jzmm_123pan`、`Q_dianying`、`domgmingapk`、`dianying4k`、`q_dianshiju`、`tgbokee`、`ucshare`、`godupan`、`gokuapan`、`gimy115`、`WFYSFX03`、`peccxin`、`Movie888035`、`xlwpzy`、`zyywpzy`、`wydwpzy`、`gimy100`、`gimy115iso`。

建议暂时保留的本地独有频道：

`SharePanBaidu`、`ali_yppan`。

注意：上游频道列表中 `ucshare` 重复出现一次，落地时必须去重。

## 3. 可直接复用的上游能力

### 3.1 插件优先级经验

上游 `docs/插件开发指南.md` 给出插件质量分级：

- 优先级 1：高质量、稳定可靠，示例包含 `panta`、`zhizhen`、`labi`。
- 优先级 2：质量良好，示例包含 `huban`、`shandian`、`duoduo`。
- 优先级 3：普通质量，示例包含 `pansearch`、`hunhepan`、`pan666`。

当前项目已经沿用 `Priority()`，可以直接把这个分级纳入新增插件清单和默认启用顺序。

### 3.2 上游新增插件实现

建议优先迁入下面几类插件：

| 阶段 | 插件 | 理由 |
|---|---|---|
| P0 | `zhizhen`、`duoduo`、`huban` | 上游优先级高，和现有影视/网盘插件结构一致，适合快速恢复搜索质量 |
| P0 | `jikepan`、`qupansou`、`panwiki` | 上游默认启用靠前，API 或论坛型搜索，覆盖面较大 |
| P0 | `pan666`、`hdr4k`、`panyq` | 上游默认启用，补齐网盘与影视资源来源 |
| P1 | `miaoso`、`pianku`、`wuji`、`xiaozhang`、`leijing`、`xb6v`、`xys`、`ddys`、`hdmoli` | 增加资源站覆盖，需重点验证页面结构 |
| P1 | `clxiong`、`sdso`、`xiaoji`、`xdyh`、`haisou`、`bixin`、`qupanshe`、`xdpan`、`yunsou` | 补充多源搜索，按健康测试结果决定默认启用 |
| P2 | `qqpd` | 功能价值高，但涉及 Web 路由、本地存储、登录态和管理页面，需要单独设计适配 |
| P2 | `discourse`、`ahhhhfs`、`nsgame`、`gying`、`sousou`、`yulinshufa` 等 | 作为扩展来源迁入，默认不启用，先进入插件中心待测 |

### 3.3 上游已有同名插件更新

本地已有 43 个同名插件。对于同名插件，不能简单覆盖目录，迁入策略是：

1. 以本地版本为基线保留 `SetManifest`、中文注释、资源协议字段和测试。
2. 对比上游同名插件的域名、选择器、接口参数、请求头、链接正则和重试逻辑。
3. 只移植能修复可用性的搜索逻辑，不覆盖本项目插件中心和健康状态适配。
4. 对当前默认启用但反馈不可用的插件优先处理：`labi`、`shandian`、`muou`、`wanou`、`hunhepan`、`pansearch`、`panta`、`susu`、`thepiratebay`、`xuexizhinan`、`ouge`、`erxiao`、`fox4k`、`clmao`、`cldi`、`libvio`、`yuhuage`、`u3c3`、`javdb`、`jutoushe`、`djgou`、`nyaa`、`xinjuc`、`aikanzy`、`quark4k`、`quarksoo`、`ash`。

## 4. 插件更新实施方案

### 4.1 迁入原则

1. **保留本项目插件基础设施**：不替换 `backend/plugin/plugin.go`、`baseasyncplugin.go`、`manifest.go`。
2. **每个插件独立迁入**：一个插件一个目录、一个契约测试、一个解析或冒烟测试。
3. **新增插件默认先不全量启用**：先进入插件中心，健康验证通过后再加入默认启用列表。
4. **清单必须补齐**：每个新插件都应调用 `SetManifest`，避免插件中心显示为 `generated`。
5. **不可用插件先判定原因**：区分域名失效、接口变更、页面结构变更、目标站限流和关键词无结果。

### 4.2 代码适配步骤

1. 从上游复制目标插件目录到 `backend/plugin/<name>`。
2. 批量替换导入路径：
   - `pansou/model` → `unisearch/model`
   - `pansou/plugin` → `unisearch/plugin`
   - `pansou/util/json` → `unisearch/util/json`
3. 检查是否依赖上游专有工具、缓存或全局变量；如有，改为本项目已有工具。
4. 在构造函数中补 `SetManifest`：
   - `ID`：`search.<name>`
   - `Name`：中文展示名或站点名
   - `Version`：从 `1.0.0` 起
   - `Capabilities`：至少 `resource.search`
   - `Permissions`：`network`
   - `Resource.SourceLabel`、`SourceGroup`、`SupportedMediaTypes`、`TargetTypes`、`Priority`
5. 在 `backend/main.go` 增加空导入。
6. 对需要跳过二次过滤的插件使用 `NewBaseAsyncPluginWithFilter(name, priority, true)`。
7. 对带 Web 路由的插件确认 `PluginWithWebHandler` 是否已在本项目路由层注册；`qqpd` 单独评审。
8. 运行本地测试和健康测试，通过后才更新默认启用列表。

### 4.3 默认启用建议

第一批默认启用只建议加入经过验证的 P0 插件：

`zhizhen`、`duoduo`、`huban`、`jikepan`、`qupansou`、`panwiki`、`pan666`、`hdr4k`、`panyq`。

第二批启用根据健康测试结果决定：

`miaoso`、`pianku`、`wuji`、`xiaozhang`、`leijing`、`xb6v`、`xys`、`ddys`、`hdmoli`、`sdso`、`xiaoji`、`xdyh`、`haisou`、`bixin`、`qupanshe`、`xdpan`、`yunsou`。

特殊插件：

- `qqpd`：先迁入为实验插件，不默认启用；确认存储目录、登录流程、路由挂载和前端入口后再开放。
- `discourse`：如果需要外部论坛来源，单独验证配置和结果质量。

### 4.4 插件健康分级

实施时建议生成一份本地健康矩阵：

| 状态 | 判定条件 | 处理方式 |
|---|---|---|
| 可默认启用 | 连续 3 个关键词有有效链接，错误率低，无明显超时 | 加入默认 `ENABLED_PLUGINS` |
| 可安装不默认启用 | 能编译，偶发空结果或超时 | 加入插件中心，默认关闭 |
| 暂缓迁入 | 需要账号、登录态、复杂配置或站点访问不稳定 | 单独建适配任务 |
| 下线或保留关闭 | 编译可过但目标站长期不可访问 | 保留代码但默认关闭，记录原因 |

## 5. 频道更新实施方案

### 5.1 频道合并策略

1. 以本地 91 个频道为基础，追加上游新增 28 个频道。
2. 保留本地独有 `SharePanBaidu`、`ali_yppan`，除非健康测试确认不可访问。
3. 对最终频道列表去重，尤其是上游重复的 `ucshare`。
4. 更新 `.env.example`、`README.md` 和部署示例中的 `CHANNELS`。
5. 对已有部署，不能只依赖 env 文件：
   - `MigrateFromEnv` 只追加缺失频道，不删除旧频道。
   - 需要通过管理端批量导入或新增一次性同步脚本，把新增频道写入 `tg_channels`。

### 5.2 推荐新增频道标签

新增频道建议初始化标签，便于后台筛选和运营：

- 影视：`Q_dianying`、`dianying4k`、`q_dianshiju`、`Movie888035`、`gimy100`、`gimy115`、`gimy115iso`
- 网盘综合：`tgsearchers6`、`godupan`、`gokuapan`、`ucshare`、`xlwpzy`、`zyywpzy`、`wydwpzy`
- 夸克/UC/115：`kkxlzy`、`alyp_1`、`WFYSFX02`、`WFYSFX03`
- 短剧/资料/其他：`cctv1211`、`liangxingzhinan`、`domgmingapk`、`tgbokee`

### 5.3 频道验证步骤

1. 对新增频道执行 `TestChannel`，确认 `https://t.me/s/<channel>` 返回 200。
2. 对新增频道执行关键词搜索，如 `仙逆`、`庆余年`、`4K`，确认能解析出链接。
3. 将验证结果写入 `tg_channel_health_status`，管理后台展示 `healthy/error/untested`。
4. 健康失败的频道仍可入库，但默认禁用或标记为需复查。

## 6. 本地验证计划

### 6.1 编译与单元测试

在 `backend` 目录执行：

```bash
go test ./...
go run tools/validate_plugin_manifests.go
```

在 `frontend` 目录执行：

```bash
pnpm run check
pnpm run lint
pnpm test -- PluginManageWorkspace ChannelManageWorkspace --run
```

### 6.2 插件专项验证

建议新增本地只读验证脚本或测试用例，按插件逐个执行：

1. 构造插件实例，运行 `testutil.AssertPluginContract`。
2. 执行 `Search("仙逆", nil)`、`Search("庆余年", nil)`、`Search("4K", nil)`。
3. 校验返回结果：
   - 不 panic。
   - 有 `UniqueID`。
   - 有 `Title`。
   - 至少一个可识别 `Link.Type`。
   - `SourcePluginID` 和资源字段能被响应构建器补齐。
4. 每个插件设置 30 秒超时，超时记录为健康失败。

### 6.3 管理端验证

1. 插件中心能列出新增插件。
2. 插件启停状态能保存并影响搜索。
3. 插件健康测试能写入最近一次状态。
4. 频道管理能看到新增频道、标签、健康状态。
5. 搜索页选择插件和频道后结果展示正常。

## 7. 风险与回滚

### 7.1 风险

- 上游插件依赖的目标站点可能已经改版，复制后仍不可用。
- 一次性启用过多插件会增加响应时间和目标站请求压力。
- 部分插件使用详情页二次抓取，容易受超时影响。
- `qqpd` 不是普通搜索插件，涉及登录态和管理路由，不能放进普通迁入批次。
- 已有部署的频道来自数据库，更新 env 不会自动删除或重排旧数据。

### 7.2 回滚

- 插件层：通过插件状态服务禁用新插件；必要时从 `ENABLED_PLUGINS` 移除。
- 频道层：通过频道管理批量禁用新增频道，不直接删除历史数据。
- 配置层：保留旧 `.env` 配置快照，回滚默认插件和频道列表。
- 代码层：每批迁入独立提交，失败时只回退对应插件目录和 `backend/main.go` 空导入。

## 8. 建议执行顺序

1. 建立上游同步清单：记录上游提交、插件目录、频道列表、启用列表。
2. 修复同名默认启用插件：先对当前 27 个默认插件对比上游并移植可用性修复。
3. 迁入 P0 新插件：`zhizhen`、`duoduo`、`huban`、`jikepan`、`qupansou`、`panwiki`、`pan666`、`hdr4k`、`panyq`。
4. 补齐插件清单和测试：每个插件一个契约测试，复杂插件增加 fixture。
5. 更新频道列表：追加 28 个新增频道并去重。
6. 执行本地健康验证：插件和频道都写入健康状态。
7. 更新默认配置：只把健康通过的插件和频道加入默认启用。
8. 更新 README 和部署说明：说明新增来源、验证方式、回滚方式。

## 9. 本阶段结论

上游最值得复用的是插件目录、频道清单、插件优先级经验和部分解析实现。当前项目已经有更完整的插件中心、健康状态和资源协议，所以实施路线应是“插件级迁入 + 本地协议适配 + 健康验证后启用”，而不是用上游后端覆盖当前后端。

