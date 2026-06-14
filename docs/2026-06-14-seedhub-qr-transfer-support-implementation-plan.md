# SeedHub 扫码转存支持详细开发计划

> **目标：** 在不破坏现有“直接打开 / 提取码 / 磁力链接”访问链路的前提下，为 SeedHub 中“需要手机扫码转存”的资源建立统一协议、刷新机制和前端访问面板，让用户在 UniSearch 内完成二维码查看与重新获取。

生成时间：2026-06-14 17:48:00 CST

关联方案文档：
- [docs/2026-06-14-seedhub-qr-transfer-support-development-plan.md](/Users/abner/Desktop/MyProject/UniSearch_dev/docs/2026-06-14-seedhub-qr-transfer-support-development-plan.md)

---

## 1. 开发目标

本计划聚焦把方案文档落成可执行任务，目标分为四层：

1. **协议层**  
   让 `Link` / `ResourceLink` 能表达 `scan_transfer` 访问模式与二维码刷新语义。

2. **插件层**  
   让 SeedHub 插件能识别扫码转存页面，提取二维码载荷，并支持“重新获取当前资源二维码”。

3. **前端交互层**  
   让结果页、详情页、弹窗统一识别扫码资源，并在 UniSearch 内刷新二维码。

4. **验证层**  
   建立稳定的后端 fixture、前端单测和构建验证，保证后续 SeedHub 页面结构变化后能快速回归。

---

## 2. 交付范围

### 2.1 本次必须交付

- 后端模型扩展：
  - `access_mode`
  - `scan_transfer`
  - `refreshable`
  - `refresh_key`
- SeedHub 插件扫码页识别与二维码载荷提取
- 当前资源二维码刷新接口
- 前端扫码转存模式弹窗
- 结果页 / 详情页入口接入
- 单测、回归测试、构建验证

### 2.2 本次不交付

- 自动轮询二维码失效状态
- 自动跳转手机 App
- 自动转存确认
- 其他插件接入扫码协议
- 服务端持久缓存二维码历史

---

## 3. 当前基线与问题归纳

### 3.1 后端现状

当前基线文件：

- [backend/plugin/sidhub/sidhub.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub.go)
- [backend/service/search_response_builder.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder.go)
- [backend/model/response.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/model/response.go)

现有能力：

- 能抓 SeedHub 搜索卡片与详情页下载条目
- 能解析真实网盘链接、`link_start`、提取码、磁力
- 能自动把 `Link` 转成 `ResourceLink` 与 `actions`

当前缺口：

- `Link` 结构没有访问模式
- `link_start` 只能被当作普通链接或部分真实链接解析
- 没有“重新获取当前资源二维码”的后端入口

### 3.2 前端现状

当前基线文件：

- [frontend/src/components/PasswordModal.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/PasswordModal.tsx)
- [frontend/src/utils/resourceDisplay.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/utils/resourceDisplay.ts)
- [frontend/src/pages/ResourceDetailPage.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/pages/ResourceDetailPage.tsx)
- [frontend/src/components/SearchResults.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/SearchResults.tsx)
- [frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx)
- [frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx)

现有能力：

- 可统一打开资源
- 可展示提取码与磁力
- 可在详情页与结果页复用相同访问入口

当前缺口：

- 没有扫码转存模式
- 没有二维码展示
- 没有刷新二维码动作
- 没有二维码刷新过程状态（刷新中 / 成功 / 失败）

---

## 4. 总体实施策略

采用“协议先行、插件跟进、前端承接、最后联调”的顺序推进：

1. 先扩展协议，稳定数据边界
2. 再做 SeedHub 扫码识别与刷新接口
3. 再做前端弹窗与入口
4. 最后补齐联调与回归测试

原因：

- 避免前端在协议未定时反复返工
- 先有刷新接口，前端按钮才有明确落点
- 插件解析一旦稳定，前后端测试用例都能固化

---

## 5. 阶段计划

## 阶段 0：开发准备

### 目标

建立本次开发所需的 fixture、文档引用和验证基线。

### 任务

- [x] 确认当前方案文档为唯一设计依据
- [x] 收集至少 2 类 SeedHub 扫码页 HTML 样本
- [x] 补充 `.Codex` 上下文摘要与日志
- [x] 确认前端二维码实现方式

### 输出

- 固化的扫码页样本
- 当前计划文档
- 后续测试所需 fixture 来源说明

### 风险门槛

- 若拿不到稳定样本，不进入阶段 1 编码

---

## 阶段 1：资源协议扩展

### 目标

为扫码转存和二维码刷新建立统一数据结构。

### 任务分解

#### T1.1 扩展后端模型

文件：

- [backend/model/response.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/model/response.go)

任务：

- [x] 新增 `ScanTransferInfo`
- [x] 为 `Link` 增加：
  - `AccessMode`
  - `ScanTransfer`
- [x] 为 `ResourceLink` 增加：
  - `AccessMode`
  - `ScanTransfer`

验收：

- Go 模型编译通过
- 旧字段兼容，不影响现有 JSON 输出

#### T1.2 扩展前端类型

文件：

- [frontend/src/types/resource.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/types/resource.ts)
- 若 API 类型镜像还存在，则同步更新对应 `api.ts` 类型定义

任务：

- [x] 新增 `ScanTransferInfo`
- [x] 扩展 `ResourceLink`
- [x] 约束 `access_mode` 联合类型

验收：

- TypeScript 校验通过
- 旧资源对象不需要补字段也能工作

#### T1.3 构建器透传协议

文件：

- [backend/service/search_response_builder.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder.go)
- [backend/service/search_response_builder_test.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder_test.go)

任务：

- [x] `Link -> ResourceLink` 时透传 `access_mode`
- [x] 透传 `scan_transfer`
- [x] 自动生成 `actions` 时透传：
  - `access_mode`
  - `scan_transfer`
  - `password`

验收：

- 单测覆盖普通链接、提取码链接、扫码链接三类资源

---

## 阶段 2：SeedHub 插件扫码识别

### 目标

让 SeedHub 插件输出真实的扫码转存语义。

### 任务分解

#### T2.1 扫码页特征识别

文件：

- [backend/plugin/sidhub/sidhub.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub.go)
- [backend/plugin/sidhub/sidhub_test.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub_test.go)

任务：

- [x] 为 `link_start` 页面补扫码特征识别
- [x] 识别以下信息：
  - 二维码图片节点
  - Base64 二维码
  - 手机深链
  - 转存口令
  - 扫码提示文案

验收：

- fixture 中能正确识别 `scan_transfer`

#### T2.2 二维码载荷提取

任务：

- [x] 按优先级提取：
  - `qr_code_base64`
  - `qr_code_image_url`
  - `qr_code_value`
  - `mobile_url`
  - `transfer_code`
  - `instruction`
- [x] 生成 `refreshable`
- [x] 生成 `refresh_key`

推荐 `refresh_key` 组成：

```text
seedhub:{movie_id}:{link_type}:{index}
```

验收：

- 同一详情页多条扫码资源的 `refresh_key` 唯一且稳定

#### T2.3 扫码资源回退态

任务：

- [x] 无法拿到二维码但确认是扫码链路时，仍输出：
  - `access_mode = scan_transfer`
  - 原始 `url`
  - `instruction`
  - 可选 `source_page_url`
- [x] 禁止把此类资源误判为 `direct_open`

验收：

- “半残缺扫码页”仍能被前端识别为扫码模式

---

## 阶段 3：二维码刷新接口

### 目标

让前端无需离开 UniSearch，即可重新获取当前资源二维码。

### 任务分解

#### T3.1 设计接口契约

推荐接口：

`POST /api/resources/scan-transfer/refresh`

请求体建议：

```json
{
  "resource_id": "resource-xxx",
  "link_url": "https://sidhub.cc/link_start/...",
  "refresh_key": "seedhub:120138:baidu:1"
}
```

响应体建议：

```json
{
  "success": true,
  "data": {
    "access_mode": "scan_transfer",
    "scan_transfer": {
      "qr_code_base64": "...",
      "transfer_code": "abcd",
      "instruction": "请使用手机扫码转存",
      "refreshable": true,
      "refresh_key": "seedhub:120138:baidu:1"
    }
  }
}
```

#### T3.2 实现刷新服务

文件建议：

- `backend/api/` 下新增 handler
- 复用 `backend/plugin/sidhub/sidhub.go`

任务：

- [x] 基于 `refresh_key` 定位当前资源下载项
- [x] 重新抓取详情页或对应 `link_start`
- [x] 返回最新二维码载荷
- [x] 对失效、解析失败、找不到资源给出可读错误

#### T3.3 刷新接口测试

任务：

- [x] 成功刷新返回新二维码
- [x] `refresh_key` 无效返回 4xx
- [x] 页面结构变化时返回可提示错误
- [x] 同资源重复刷新时不污染其他结果

---

## 阶段 4：前端访问弹窗升级

### 目标

将当前 `PasswordModal` 升级为支持扫码转存模式的统一访问面板。

### 任务分解

#### T4.1 升级访问目标解析

文件：

- [frontend/src/utils/resourceDisplay.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/utils/resourceDisplay.ts)

任务：

- [x] 扩展 `ResourceOpenTarget`
- [x] `resolveResourceOpenTarget` 支持：
  - `direct_open`
  - `password_open`
  - `scan_transfer`
- [x] `resolveResourceActionTarget` 透传扫码字段

验收：

- 结果页与详情页用同一逻辑得到一致目标对象

#### T4.2 升级弹窗组件

文件：

- [frontend/src/components/PasswordModal.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/PasswordModal.tsx)

任务：

- [x] 保留原组件文件，内部升级为多模式
- [x] 新增扫码模式 UI：
  - 二维码展示区
  - 口令区
  - 说明区
  - 原始链接区
- [x] 新增“重新获取二维码”按钮
- [x] 新增刷新状态：
  - 空闲
  - 刷新中
  - 刷新成功
  - 刷新失败

验收：

- 扫码模式不再显示错误的“打开链接即可使用”心智

#### T4.3 接入二维码刷新请求

任务：

- [x] 新增前端请求服务，如 `scanTransferService`
- [x] 点击“重新获取二维码”时请求后端刷新接口
- [x] 成功后只更新当前弹窗内容，不刷新整个页面
- [x] 失败后显示 toast 或行内错误

验收：

- 用户在弹窗内即可完成二维码刷新

---

## 阶段 5：结果页与详情页接入

### 目标

保证扫码资源从所有主入口进入体验一致。

### 任务分解

#### T5.1 搜索结果页入口

文件：

- [frontend/src/components/SearchResults.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/SearchResults.tsx)

任务：

- [x] 扫码类资源点击后进入扫码模式弹窗
- [x] 搜索结果卡片主按钮文案支持：
  - `打开资源`
  - `输入访问码`
  - `扫码转存`

#### T5.2 详情页动作台入口

文件：

- [frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx)

任务：

- [x] `主链接状态` 增加“需手机扫码”
- [x] 主按钮支持“扫码转存”
- [x] 若支持刷新，显示二维码刷新入口状态

#### T5.3 详情页链接列表入口

文件：

- [frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx)

任务：

- [x] 为扫码类条目标记模式
- [x] 打开时进入扫码模式弹窗
- [x] 显示口令 / 二维码提示标签

---

## 阶段 6：测试与联调

### 目标

建立完整回归面，确保 SeedHub 页面变化不会把交互打碎。

### 后端测试

文件：

- [backend/plugin/sidhub/sidhub_test.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub_test.go)
- [backend/service/search_response_builder_test.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder_test.go)

任务：

- [x] 普通链接仍为 `direct_open`
- [x] 带密码链接仍为 `password_open`
- [x] 二维码图片页 => `scan_transfer`
- [x] 仅口令 / 仅手机链接页 => `scan_transfer`
- [x] 刷新接口成功 / 失败 / 非法 key

### 前端测试

文件：

- [frontend/src/components/__tests__/PasswordModal.test.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/__tests__/PasswordModal.test.tsx)
- [frontend/src/pages/__tests__/ResourceDetailPage.test.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/pages/__tests__/ResourceDetailPage.test.tsx)
- [frontend/src/components/__tests__/SearchResults.test.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/__tests__/SearchResults.test.tsx)

任务：

- [x] 弹窗三模式渲染
- [x] 二维码刷新按钮状态切换
- [x] 结果页入口一致性
- [x] 详情页动作台入口一致性
- [x] 刷新失败反馈

### 构建验证

```bash
cd backend && go test ./plugin/sidhub ./service ./api
cd backend && go test ./...
cd frontend && pnpm test -- --run src/components/__tests__/PasswordModal.test.tsx src/pages/__tests__/ResourceDetailPage.test.tsx src/components/__tests__/SearchResults.test.tsx
cd frontend && pnpm build
```

---

## 6. 文件级改动清单

### 后端必改

- [x] [backend/model/response.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/model/response.go)
- [x] [backend/plugin/sidhub/sidhub.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub.go)
- [x] [backend/plugin/sidhub/sidhub_test.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub_test.go)
- [x] [backend/service/search_response_builder.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder.go)
- [x] [backend/service/search_response_builder_test.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder_test.go)
- [x] `backend/api` 下新增扫码刷新 handler 与测试

### 前端必改

- [x] [frontend/src/types/resource.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/types/resource.ts)
- [x] [frontend/src/utils/resourceDisplay.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/utils/resourceDisplay.ts)
- [x] [frontend/src/components/PasswordModal.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/PasswordModal.tsx)
- [x] [frontend/src/pages/ResourceDetailPage.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/pages/ResourceDetailPage.tsx)
- [x] [frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx)
- [x] [frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx)
- [x] [frontend/src/components/SearchResults.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/SearchResults.tsx)
- [x] [frontend/src/services/searchService.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/services/searchService.ts) 中新增扫码刷新请求方法

### 测试必改

- [x] [frontend/src/components/__tests__/PasswordModal.test.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/__tests__/PasswordModal.test.tsx)
- [x] [frontend/src/pages/__tests__/ResourceDetailPage.test.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/pages/__tests__/ResourceDetailPage.test.tsx)
- [x] [frontend/src/components/__tests__/SearchResults.test.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/__tests__/SearchResults.test.tsx)

---

## 7. 里程碑与完成定义

## M1：协议完成

完成定义：

- 后端与前端类型都支持 `scan_transfer`
- 构建器可透传扫码字段

## M2：插件识别完成

完成定义：

- SeedHub fixture 能输出扫码资源
- 二维码与刷新 key 可提取

## M3：刷新接口完成

完成定义：

- 前端能请求接口并拿到新二维码

## M4：前端弹窗完成

完成定义：

- 三模式弹窗稳定
- 扫码模式支持刷新

## M5：全入口接入完成

完成定义：

- 结果页、详情页动作台、链接列表行为一致

## M6：回归通过

完成定义：

- 后端测试通过
- 前端定向测试通过
- `pnpm build` 通过

---

## 8. 风险与阻断条件

### R1：SeedHub 页面彻底脚本化

影响：

- 当前基于 HTML 抓取的二维码提取可能失败

应对：

- 保留“仅识别扫码模式 + 返回原始链接 + 刷新失败提示”的最小回退

### R2：二维码需要复杂 JS 才能生成

影响：

- 插件可能无法直接拿到二维码值或图片

应对：

- 优先抓取页面中已渲染的图片 / Base64
- 次选抓取移动深链与口令

### R3：刷新接口无法稳定定位当前资源

影响：

- “重新获取二维码”按钮无确定目标

应对：

- `refresh_key` 设计必须在阶段 2 完成前定稿
- 如果 `refresh_key` 无法稳定生成，本期不进入前端刷新开发

### 阻断条件

遇到以下情况必须暂停编码并回到设计阶段：

- 连续 3 次无法从样本页提取到稳定二维码载荷
- `refresh_key` 无法唯一定位下载项
- 前端弹窗需要依赖额外未评估的重型二维码库

---

## 9. 建议开发顺序

建议按下面顺序逐项落地：

1. `response.go` 协议扩展
2. `search_response_builder` 透传
3. `sidhub.go` 扫码识别与 fixture
4. 后端刷新接口
5. 前端类型与解析工具
6. 弹窗升级
7. 结果页 / 详情页接入
8. 测试与联调

这是最稳的顺序，因为每一步都有清晰的验证边界，不会把问题混在一起。

---

## 10. 验收清单

- [x] SeedHub 扫码资源在结果页可被正确识别
- [x] 点击扫码资源后进入扫码模式弹窗
- [x] 弹窗可展示二维码或二维码替代载荷
- [x] 弹窗可复制口令与原始链接
- [x] 二维码失效后可在 UniSearch 内重新获取当前资源二维码
- [x] 重新获取成功后当前弹窗内容即时更新
- [x] 原有提取码、直达链接、磁力资源行为不回退
- [x] 后端与前端测试全部通过
- [x] 前端构建通过

---

## 11. 开发完成标记模板

后续执行时建议按下面格式在文档或日志中打勾：

- [x] 完成部分1：协议扩展与类型透传
- [x] 完成部分2：SeedHub 扫码页识别与二维码载荷提取
- [x] 完成部分3：当前资源二维码刷新接口
- [x] 完成部分4：前端扫码弹窗与刷新状态
- [x] 完成部分5：搜索结果页与详情页入口接入
- [x] 完成部分6：测试、构建与回归验证

## 11.1 追加回归完成标记：SeedHub 夸克 4K+1080P 筛选

追加时间：2026-06-14 20:42:09 CST

用户复现场景：

- UniSearch URL：`/search?q=大濛&include=4k`
- SeedHub 原页：`https://sidhub.cc/movies/120138/`
- 原页夸克资源：`✅【大濛】【4K+1080P】【内嵌简中字幕】【流媒体正式版】`

根因：

- SeedHub 详情资源行中，真实资源标题可能在整行文本中。
- 可点击链接本身可能只显示“打开”等短按钮文案。
- 旧标题解析优先取链接文本，导致结果标题变成“打开”，`4K+1080P` 没有进入高级筛选文本。

完成项：

- [x] 完成部分1：补充 SeedHub 夸克页签 `4K+1080P` 行标题 fixture
- [x] 完成部分2：确认 RED，复现标题被解析成“打开”的问题
- [x] 完成部分3：修复低信息链接文案的整行标题回退策略
- [x] 完成部分4：扩展高级筛选回归，覆盖 `WEB-4K` 与 `4K+1080P`
- [x] 完成部分5：完成后端全量测试、前端全量测试和前端构建验证

## 11.2 解析场景矩阵与验收门禁引用

追加时间：2026-06-14 21:11:41 CST

关联计划：

- [docs/2026-06-14-seedhub-parser-scenario-matrix-development-plan.md](/Users/abner/Desktop/MyProject/UniSearch_dev/docs/2026-06-14-seedhub-parser-scenario-matrix-development-plan.md)

后续 SeedHub 解析相关完成标记必须遵循该矩阵计划：

- [x] 完成项必须能对应到场景矩阵编号
- [x] 完成项必须绑定 fixture 或明确验证样本
- [x] 完成项必须绑定测试函数或本地验证命令
- [x] 新 DOM 变体必须先补 RED 测试，再修实现，再回填文档

## 11.3 追加回归完成标记：高级筛选旧缓存自愈

追加时间：2026-06-14 22:01:19 CST

用户复现场景：

- UniSearch URL：`/search?q=大濛&include=4k`
- 后端普通缓存请求：`refresh=false` 时返回筛选后空结果
- 后端强制刷新请求：`refresh=true` 时返回 3 条 SeedHub 4K 资源

根因：

- `include=4k` 的 URL 编解码和 SeedHub 详情解析均已覆盖。
- 真实页面仍为空，是因为搜索服务命中了修复前写入的旧搜索缓存。
- 重启后端进程不会清空 Redis 或持久搜索缓存，因此旧解析结果仍会被用于高级筛选。

完成项：

- [x] 完成部分1：直接调用真实后端确认 `refresh=true` 可返回 SeedHub 4K 资源
- [x] 完成部分2：复现 `refresh=false` 命中旧缓存后筛选为空
- [x] 完成部分3：新增 `F7` 场景，定义“旧搜索缓存导致高级筛选为空时自动强刷一次”
- [x] 完成部分4：补充后端 RED/GREEN 测试覆盖缓存空结果强刷、强刷失败保底、缓存已命中不强刷
- [x] 完成部分5：实现后端搜索过滤自愈逻辑并通过定向测试

## 11.4 追加交互完成标记：最近有效搜索记录管理

追加时间：2026-06-14 22:39:17 CST

关联计划：

- [docs/2026-06-14-search-launchpad-optimization-development-plan.md](/Users/abner/Desktop/MyProject/UniSearch_dev/docs/2026-06-14-search-launchpad-optimization-development-plan.md)

用户诉求：

- 最近有效搜索需要像搜索历史一样支持单条清除。
- 最近有效搜索还需要提供一键清空按钮。

完成项：

- [x] 完成部分1：`searchStore` 新增单条删除最近有效搜索并同步本地存储
- [x] 完成部分2：`searchStore` 新增清空最近有效搜索并移除本地存储
- [x] 完成部分3：搜索启动台最近有效搜索卡片接入单条删除按钮
- [x] 完成部分4：搜索启动台最近有效搜索标题区接入“清空”按钮
- [x] 完成部分5：补齐 Store 与搜索页交互测试，确认删除和清空不会触发搜索恢复
- [x] 完成部分6：通过前端定向测试与生产构建验证

---

## 12. 结论

这份详细计划的重点，不是把“扫码转存”当成一个前端弹窗小改动，而是把它当成一条完整的资源访问协议来交付。

只要按这个顺序推进，我们就能比较稳地实现：

- SeedHub 扫码资源可识别
- UniSearch 内可查看二维码
- UniSearch 内可重新获取当前资源二维码
- 老链路不被破坏

后续我可以直接按这份计划进入开发阶段，从 **阶段 1：协议扩展** 开始逐步实现。
