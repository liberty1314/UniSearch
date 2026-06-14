# SeedHub 扫码转存支持开发方案

## 1. 背景

当前 UniSearch 已支持聚合 SeedHub 资源，并能在搜索结果与资源详情页中提供以下能力：

- 打开真实网盘链接
- 展示与复制提取码
- 打开原始详情页

但 SeedHub 中存在一类资源访问方式不是“桌面端直接打开网盘”，而是：

1. 先进入 SeedHub 的 `link_start` 跳转页；
2. 页面提示“请使用手机扫码转存”；
3. 用户必须在手机端通过二维码、短效口令或移动端深链完成转存；
4. 转存后再回到桌面端下载或观看。

当前系统缺少对这类访问方式的统一承接，所以用户在桌面端搜索到资源后，虽然能看到链接，但无法在 UniSearch 内完成“扫码转存”这一步的理解和操作闭环。

本方案的目标，是让 UniSearch 能把这类 SeedHub 资源明确标记为“扫码转存”，并在前端提供二维码、手机操作说明、复制口令，以及在 UniSearch 内重新获取当前资源二维码的能力。

---

## 2. 目标与范围

### 2.1 目标

- 支持识别 SeedHub 中“需要手机扫码转存”的资源链接。
- 在搜索结果页与资源详情页中，为此类资源展示统一的“扫码转存”访问面板。
- 在访问面板中提供：
  - 二维码展示
  - 手机端操作说明
  - 转存口令 / 提取码复制
  - 原始链接复制
  - 重新获取当前资源二维码
- 保持当前“直接打开”和“提取码打开”资源链路兼容。

### 2.2 本期范围

- **仅覆盖 SeedHub 插件**。
- **仅覆盖桌面端主流程**：搜索结果、资源详情、资源打开弹窗。
- **仅覆盖“提示 + 引导 + 二维码呈现”**，不实现自动登录网盘、自动转存、自动轮询转存结果。

### 2.3 不在本期范围

- 不做手机端专门页面。
- 不做跨插件统一接入开关。
- 不做第三方网盘账号托管。
- 不尝试绕过第三方 App 或网盘平台限制。

---

## 3. 现状分析

### 3.1 SeedHub 插件现状

当前 [backend/plugin/sidhub/sidhub.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub.go) 已具备：

- 搜索页卡片解析
- 详情页下载条目解析
- `link_start` 类型跳转链接识别
- 部分夸克链接二次解析（`resolveQuarkLinks`）
- 提取码提取（`extractPassword`）

但插件输出的 `Link` / `SearchResult` 仍默认假设“链接最终可直接打开”，没有把“扫码转存”作为单独访问模式暴露给前端。

### 3.2 资源协议现状

[backend/service/search_response_builder.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder.go) 会把插件输出的 `Link` 转成统一 `ResourceLink` 和 `ResourceAction`。

当前生成逻辑只支持：

- `open_link`
- `open_detail`

并把 `password` 作为 `payload.password` 塞给前端。  
缺口在于：没有“此链接需要扫码转存”的显式协议字段。

### 3.3 前端访问交互现状

当前前端主链路如下：

- [frontend/src/utils/resourceDisplay.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/utils/resourceDisplay.ts)
  - 负责把 `ResourceLink` 解析成 `ResourceOpenTarget`
- [frontend/src/components/PasswordModal.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/PasswordModal.tsx)
  - 负责展示提取码 / 链接 / 磁力
- [frontend/src/pages/ResourceDetailPage.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/pages/ResourceDetailPage.tsx)
  - 负责调起访问弹窗
- [frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx)
  - 负责详情页侧边操作入口

当前弹窗的设计前提是：

- 要么直接打开
- 要么复制提取码再打开
- 要么磁力链接复制/打开

它还不能承接以下信息：

- 二维码图片或二维码载荷
- “请在手机 App 中扫码转存”的说明
- 短效口令与刷新提示
- “此链接不适合桌面直接打开”的状态
- “重新获取当前资源二维码”的动作

### 3.4 二维码参考实现

[backend/plugin/weibo/weibo.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/weibo/weibo.go) 已存在二维码图片返回模式：

- 后端把二维码编码为 `qrcode_base64`
- 前端页面直接展示 `<img src="data:image/png;base64,...">`

这说明项目内已经接受“后端返回二维码图片 / Base64，前端展示”的实现方式，可作为本次二维码载荷协议的参考。

---

## 4. 需求拆解

从用户视角，本需求实际包含四层能力：

### 4.1 识别

系统要能判断：

- 这个 SeedHub 下载项是“真实网盘分享链接”
- 还是“必须扫码转存才能继续”的中间跳转项

### 4.2 表达

系统要把这种资源明确标记出来，例如：

- 链接状态：扫码转存
- 资源入口：手机扫码
- 访问方式：移动端完成

### 4.3 承接

用户点击资源时，不应直接无提示跳出，而应看到：

- 二维码
- 转存说明
- 口令 / 提取码
- 可复制内容
- 重新获取当前二维码入口

### 4.4 回退

当二维码无法解析、已过期、或页面结构变化时，用户至少还能：

- 复制原始链接
- 在 UniSearch 内重新获取当前资源二维码
- 看到明确提示，而不是无响应

---

## 5. 推荐方案概览

### 5.1 核心思路

在现有“资源访问目标”协议上增加**访问模式（access mode）**，把资源打开从单一的“open link”扩展为三类：

1. `direct_open`：可直接打开
2. `password_open`：需要提取码 / 访问码
3. `scan_transfer`：需要手机扫码转存

前端不再只区分“有没有密码”，而是基于访问模式决定弹窗内容。

### 5.2 推荐原因

- 不破坏现有“直接打开 / 提取码打开”逻辑
- SeedHub 先落地，后续其他插件可以复用
- 访问模式清晰，前后端职责边界稳定
- 可以逐步扩展：先支持展示二维码，再考虑刷新、失效处理

---

## 6. 数据协议设计

### 6.1 方案选择

这里有两条路：

#### 方案 A：只扩展 `ResourceAction.payload`

优点：

- 改动范围小
- 不必修改 `ResourceLink` 结构

缺点：

- `ResourceDetailLinksSection`、结果卡片等本来是基于 `links` 展示，协议信息会分散
- 同一条资源链接的访问语义落在 `action` 里，不利于前端统一处理

#### 方案 B：扩展 `Link` / `ResourceLink` 访问语义

优点：

- 链接是什么、怎么访问、需要什么辅助信息，都集中在 link 本身
- 结果列表、详情页、弹窗都能复用同一份结构
- `actions` 仍可从 `links` 自动生成

缺点：

- 需要改动后端模型、构建器和前端类型

### 6.2 推荐结论

**推荐采用方案 B。**

### 6.3 推荐协议

后端 `model.Link` / `model.ResourceLink` 建议扩展：

```go
type ScanTransferInfo struct {
    Provider        string `json:"provider,omitempty"`
    QRCodeBase64    string `json:"qr_code_base64,omitempty"`
    QRCodeImageURL  string `json:"qr_code_image_url,omitempty"`
    QRCodeValue     string `json:"qr_code_value,omitempty"`
    MobileURL       string `json:"mobile_url,omitempty"`
    TransferCode    string `json:"transfer_code,omitempty"`
    Instruction     string `json:"instruction,omitempty"`
    SourcePageURL   string `json:"source_page_url,omitempty"`
    ExpiresHint     string `json:"expires_hint,omitempty"`
    Refreshable     bool   `json:"refreshable,omitempty"`
    RefreshKey      string `json:"refresh_key,omitempty"`
}

type Link struct {
    Type         string            `json:"type"`
    URL          string            `json:"url"`
    Password     string            `json:"password"`
    AccessMode   string            `json:"access_mode,omitempty"`
    ScanTransfer *ScanTransferInfo `json:"scan_transfer,omitempty"`
    ...
}
```

前端 `ResourceLink` 同步扩展：

```ts
export interface ScanTransferInfo {
  provider?: string;
  qr_code_base64?: string;
  qr_code_image_url?: string;
  qr_code_value?: string;
  mobile_url?: string;
  transfer_code?: string;
  instruction?: string;
  source_page_url?: string;
  expires_hint?: string;
  refreshable?: boolean;
  refresh_key?: string;
}

export interface ResourceLink {
  type: string;
  url: string;
  password?: string;
  access_mode?: "direct_open" | "password_open" | "scan_transfer";
  scan_transfer?: ScanTransferInfo;
  ...
}
```

### 6.4 默认规则

- 普通真实链接：`access_mode = direct_open`
- 有提取码但可直接打开：`access_mode = password_open`
- 需要手机扫码完成转存：`access_mode = scan_transfer`

---

## 7. 后端改造方案

## 7.1 SeedHub 插件改造

主要改造点：  
[backend/plugin/sidhub/sidhub.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin/sidhub/sidhub.go)

### 7.1.1 识别 `scan_transfer`

在 `link_start` 或详情页解析中，增加以下识别逻辑：

- 如果解析后得到真实网盘链接，维持现有逻辑
- 如果页面中存在以下特征，则标记为 `scan_transfer`
  - “手机扫码转存”
  - “请使用手机”
  - “网盘链接容易被吞”
  - 二维码图片节点
  - 二维码 Base64
  - 深链 / mobile url
  - 转存口令、短效码

### 7.1.2 抽取扫码载荷

按优先级抽取：

1. `qr_code_base64`
2. `qr_code_image_url`
3. `qr_code_value`（二维码真实内容，前端自行渲染）
4. `mobile_url`
5. `transfer_code`
6. `instruction`

### 7.1.3 回退策略

如果无法完整抽取二维码，但能判断这是扫码链路：

- 仍设置 `access_mode = scan_transfer`
- 最少保留：
  - `source_page_url`
  - 原始 `url`
  - 说明文案
  - 若支持刷新则保留 `refresh_key`

这样前端仍能进入扫码转存弹窗，而不是误当成可直接打开。

## 7.2 资源协议构建器改造

主要改造点：  
[backend/service/search_response_builder.go](/Users/abner/Desktop/MyProject/UniSearch_dev/backend/service/search_response_builder.go)

需要保证：

- `SearchResult.Links[].AccessMode` 能透传到 `ResourceLink`
- `SearchResult.Links[].ScanTransfer` 中的二维码与刷新字段能透传到 `ResourceLink`
- 自动生成 `actions` 时，把访问模式一并写入 `payload`

推荐生成策略：

- `direct_open` / `password_open` 继续生成 `open_link`
- `scan_transfer` 也生成 `open_link`，但 `payload.access_mode = scan_transfer`

原因：前端现有动作类型分流很简单，先不新增复杂 action type，直接靠 payload 判断更稳。

## 7.3 二维码重新获取接口

由于本方案明确要求“不支持回到原始详情重新获取”，因此需要在 UniSearch 内提供二维码刷新能力。

### 7.3.1 推荐接口

新增后端接口，例如：

`POST /api/resources/scan-transfer/refresh`

请求体建议包含：

```json
{
  "resource_id": "resource-xxx",
  "link_url": "https://sidhub.cc/link_start/...",
  "refresh_key": "seedhub:120138:baidu:1"
}
```

返回：

- 最新 `scan_transfer` 载荷
- 若刷新失败，返回可展示的错误信息

### 7.3.2 推荐实现

- `refresh_key` 由 SeedHub 插件在解析时生成，至少能定位到“当前资源 + 当前下载项”
- 刷新时重新访问当前资源对应的 SeedHub 详情页或 `link_start` 页面
- 重新提取二维码 / 口令 / 手机链接
- 只刷新当前点击资源，不刷新整个搜索结果页

### 7.3.3 不采用的方案

不采用“引导用户回到原始详情页自行重新获取”，原因是：

- 会让用户离开 UniSearch 的主流程
- 交互不统一
- 后续无法在前端统计刷新成功率和失败原因

---

## 8. 前端改造方案

## 8.1 弹窗能力升级

主要改造点：  
[frontend/src/components/PasswordModal.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/PasswordModal.tsx)

推荐做法：

- 将其升级为更通用的资源访问弹窗
- 可以保留原文件名做过渡，但组件语义建议升级为 `ResourceAccessModal`

### 8.1.1 三种弹窗模式

#### 模式 1：直接打开

- 显示链接
- 支持复制
- 支持打开

#### 模式 2：提取码打开

- 保留当前体验
- 显示提取码
- 显示链接
- 支持复制提取码 / 链接 / 打开

#### 模式 3：扫码转存

- 显示二维码
- 显示操作说明
- 显示口令 / 提取码（若有）
- 显示原始链接
- 按钮：
  - 复制二维码内容 / 转存链接
  - 复制口令
  - 重新获取二维码

### 8.1.2 二维码展示策略

建议按优先级使用：

1. `qr_code_base64`：直接 `<img>` 展示
2. `qr_code_image_url`：直接 `<img>` 展示
3. `qr_code_value`：前端本地生成二维码

为减少首期复杂度，推荐：

- **首选后端返回 `base64` 或图片地址**
- 前端仅在没有图片但有 `qr_code_value` 时再本地生成二维码

## 8.2 资源目标解析改造

主要改造点：  
[frontend/src/utils/resourceDisplay.ts](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/utils/resourceDisplay.ts)

当前 `ResourceOpenTarget` 只有：

- `url`
- `password`
- `cloudType`

建议扩展为：

```ts
export interface ResourceOpenTarget {
  url: string;
  password: string;
  cloudType: string;
  accessMode?: "direct_open" | "password_open" | "scan_transfer";
  scanTransfer?: ScanTransferInfo;
}
```

并在 `resolveResourceOpenTarget` 中统一处理：

- 有 `scan_transfer` => 弹窗进入扫码模式
- 有 `password` => 弹窗进入提取码模式
- 否则走直接打开

## 8.3 入口接入点

需要至少覆盖以下入口：

- 搜索结果列表点击打开
- 详情页“打开主资源”
- 详情页“全部链接”中的每条资源

主要涉及：

- [frontend/src/pages/ResourceDetailPage.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/pages/ResourceDetailPage.tsx)
- [frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx)
- [frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx)
- [frontend/src/components/SearchResults.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/SearchResults.tsx)

### 8.3.1 文案建议

- 按钮文案：
  - `扫码转存`
  - `复制转存口令`
  - `复制手机链接`
  - `重新获取二维码`

- 状态文案：
  - `此资源需在手机端扫码完成转存`
  - `二维码通常为短效，请尽快扫码`
  - `若二维码失效，可在此重新获取当前资源二维码`

---

## 9. 交互设计建议

## 9.1 资源卡片层

如果当前主链接是 `scan_transfer`：

- 卡片上的主按钮不再直接写“打开资源”
- 改为“扫码转存”

## 9.2 详情页动作台

在 [frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx](/Users/abner/Desktop/MyProject/UniSearch_dev/frontend/src/components/resource-detail/ResourceDetailActionPanel.tsx) 中：

- `主链接状态` 增加第三种状态：`需手机扫码`
- `提取码` 一行可替换为 `转存方式`
- 主按钮动态文案：
  - `打开主资源`
  - `输入访问码`
  - `扫码转存`

## 9.3 弹窗内容

扫码模式下弹窗建议结构：

1. 顶部：来源网盘 / SeedHub 标签
2. 中部：二维码主体
3. 说明区：
   - 为什么需要扫码
   - 手机操作步骤
   - 是否有转存口令
4. 底部操作：
   - 复制口令
   - 复制手机链接 / 二维码内容
   - 重新获取二维码

---

## 10. 分阶段实施计划

## 阶段 1：协议与后端解析打底

### 目标

让 SeedHub 插件能识别并输出 `scan_transfer` 链接语义。

### 任务

- [ ] 扩展 `model.Link` / `ResourceLink` 协议
- [ ] 在 SeedHub `link_start` 解析中识别二维码 / 口令 / 手机转存提示
- [ ] 透传到 `search_response_builder`
- [ ] 补后端 fixture 回归测试

### 完成标志

- 返回的 `ResourceLink` 中能看到 `access_mode = scan_transfer`
- 至少一组 fixture 能返回二维码相关载荷

## 阶段 2：前端访问弹窗升级

### 目标

前端能正确识别并展示扫码转存模式。

### 任务

- [ ] 扩展前端 `ResourceLink` / `ResourceOpenTarget` 类型
- [ ] 升级 `PasswordModal` 为多模式访问弹窗
- [ ] 接入“重新获取当前资源二维码”按钮与刷新状态
- [ ] 接入详情页动作台与全部链接列表
- [ ] 补前端单测

### 完成标志

- 用户点击扫码类资源后，看到二维码和说明，而不是直接跳出

## 阶段 3：搜索结果入口统一

### 目标

搜索结果页与详情页体验一致。

### 任务

- [ ] 搜索结果卡片主按钮动态文案
- [ ] 搜索结果页点击进入扫码弹窗
- [ ] 保持磁力 / 提取码资源行为不回退

### 完成标志

- 同一条扫码资源，无论从结果卡片还是详情页进入，交互一致

## 阶段 4：异常与回退体验

### 目标

让短效二维码和解析失败场景也可用。

### 任务

- [ ] 无二维码但有原页链接时的回退态
- [ ] 二维码失效提示
- [ ] 当前资源二维码重新获取按钮
- [ ] 刷新中 / 刷新失败 / 刷新成功状态反馈

### 完成标志

- 任何扫码资源至少都有可理解的下一步，不会“点了没反应”
- 二维码失效后用户无需离开 UniSearch，即可重新拿到当前资源的新二维码

---

## 11. 测试与验证方案

## 11.1 后端测试

建议新增 / 补充：

- `link_start` 返回真实夸克链接 => `direct_open`
- `link_start` 返回二维码图片 => `scan_transfer`
- `link_start` 返回二维码内容 + 转存口令 => `scan_transfer`
- 无法解析二维码但能识别扫码提示 => 进入回退态
- 刷新接口能基于 `refresh_key` 重新返回当前资源二维码

重点文件：

- `backend/plugin/sidhub/sidhub_test.go`
- `backend/service/search_response_builder_test.go`

## 11.2 前端测试

建议新增 / 补充：

- 扫码转存模式弹窗渲染
- 复制口令 / 复制链接按钮
- 二维码图片 / 本地二维码兜底渲染
- 结果页与详情页入口一致性

重点文件：

- `frontend/src/components/__tests__/PasswordModal.test.tsx`
- `frontend/src/pages/__tests__/ResourceDetailPage.test.tsx`
- `frontend/src/components/__tests__/SearchResults.test.tsx`

## 11.3 本地验证步骤

```bash
cd backend && go test ./plugin/sidhub ./service
cd frontend && pnpm test -- --run src/components/__tests__/PasswordModal.test.tsx src/pages/__tests__/ResourceDetailPage.test.tsx src/components/__tests__/SearchResults.test.tsx
cd frontend && pnpm build
```

---

## 12. 风险与应对

## 12.1 SeedHub 页面结构持续变化

### 风险

二维码位置、字段、提示文案可能继续变化。

### 应对

- 用 fixture 固定多种页面样式
- 保留回退态，不把所有逻辑绑定到单一 class 名

## 12.2 二维码是短效的

### 风险

用户打开时二维码可能已失效。

### 应对

- 在协议中预留 `expires_hint`
- 在协议中预留 `refreshable` 与 `refresh_key`
- 弹窗中增加“重新获取当前资源二维码”按钮

## 12.3 无法拿到二维码原始内容

### 风险

有的页面可能只给图片，不给真实链接；也可能只给脚本渲染节点。

### 应对

- 优先支持 `qr_code_base64` / `qr_code_image_url`
- 拿不到原始值时仍支持“展示图片 + 当前资源内刷新重试”

## 12.4 语义扩展影响面较大

### 风险

`ResourceLink` 协议变动会影响前后端类型。

### 应对

- 以可选字段方式扩展
- 所有老链接默认视为 `direct_open`

---

## 13. 推荐实施顺序

建议按下面顺序推进：

1. 先做后端协议与 SeedHub 解析
2. 再做前端访问弹窗升级
3. 然后补搜索结果页入口统一
4. 最后补异常态与交互打磨

这样做的好处是：

- 每一步都能独立验证
- 协议先稳定，前端不会反复改
- 即使阶段 2 未完成，阶段 1 也能先把数据能力准备好

---

## 14. 验收标准

满足以下条件即可认为本期完成：

- 用户在 UniSearch 中搜索到 SeedHub 的扫码类资源时，能明确看出这是“扫码转存”资源。
- 点击资源后，系统不会直接把用户丢到无法操作的桌面页，而是先展示二维码和说明。
- 用户至少可以完成以下任一操作：
  - 扫码转存
  - 复制口令
  - 复制原始链接
  - 在 UniSearch 内重新获取当前资源二维码
- 原有磁力、提取码、直达链接资源行为不受影响。

---

## 15. 结论

本需求的关键，不是单纯“显示一个二维码”，而是把资源访问协议从“直接打开”升级为“可表达多种访问方式”的统一模型。

推荐做法是：

- 后端先把 SeedHub 的扫码转存语义识别出来；
- 资源协议增加 `access_mode + scan_transfer`；
- 前端把当前 `PasswordModal` 升级为统一访问面板；
- 先在 SeedHub 落地，再视效果推广到其他插件。

这是当前代码结构下最稳、最容易验证、也最适合后续扩展的路径。
