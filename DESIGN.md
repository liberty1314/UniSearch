---
name: UniSearch
description: 多源聚合网盘资源搜索工具的克制产品界面系统
colors:
  brand-blue: "#007AFF"
  action-cyan: "#0891B2"
  search-orange: "#FF9500"
  success-green: "#34C759"
  danger-red: "#FF3B30"
  page-bg: "#F9FAFB"
  panel-bg: "#FFFFFF"
  panel-muted: "#F3F4F6"
  border-soft: "#E5E7EB"
  text-strong: "#111827"
  text-body: "#374151"
  text-muted: "#6B7280"
  dark-bg: "#020617"
  dark-panel: "#0F172A"
  dark-panel-raised: "#111827"
  dark-text: "#F8FAFC"
  dark-muted: "#CBD5E1"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.brand-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-search:
    backgroundColor: "{colors.search-orange}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    typography: "{typography.label}"
  chip-filter:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    typography: "{typography.label}"
  card-default:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-search:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.xl}"
    padding: "14px 18px"
    typography: "{typography.body}"
---

# Design System: UniSearch

## 1. Overview

**Creative North Star: "清晰的检索工作台"**

UniSearch 的界面系统服务于搜索、筛选、判断和维护，不服务于展示欲。它应该像一个稳定的资源检索工作台：搜索入口醒目，结果信息密度足够，详情页帮助用户在外跳前做判断，后台让运营者快速确认状态并完成动作。

现有代码已经形成了系统字体、蓝青交互色、浅灰页面背景、深色曜石背景、圆角面板、筛选芯片和动效反馈等基础。新的设计方向不是推倒重来，而是收敛视觉噪声：保留清楚的状态反馈和必要的层级，减少渐变文字、渐变按钮、过重玻璃态、强发光和夸张大圆角。

公共页面可以比后台更有呼吸感，但仍应优先呈现搜索框、热门榜单、来源筛选和资源判断信息。后台是密集工作区，应使用更平、更稳的面板、表格、工具栏和状态标签。

**Key Characteristics:**

- 单一系统字体栈，字号层级紧凑，适合中文与后台数据并存。
- 蓝色用于主操作和导航选中，青色用于辅助高亮，橙色只用于搜索启动等强行动作。
- 浅色模式以 `#F9FAFB`、白色面板和柔和边界组织层级；深色模式以 `#020617` 与深蓝灰面板承载夜间搜索。
- 面板圆角控制在 12px-20px，药丸只用于标签、筛选芯片和小型入口。
- 动效表达状态，不制造入场表演；常规过渡控制在 150-250ms。

## 2. Colors

UniSearch 的色彩应从“蓝青高光玻璃”收敛为“浅灰工作台 + 稀有行动色 + 明确状态色”。

### Primary

- **检索蓝** (`#007AFF`): 主按钮、导航选中、链接、焦点环和关键操作。每个屏幕的蓝色面积应少而明确。
- **行动青** (`#0891B2`): 搜索辅助入口、选中筛选、平台识别和深色模式中的轻量强调。不要和检索蓝同时大面积出现。
- **搜索橙** (`#FF9500`): 搜索提交、热门榜单跳转或需要立即行动的入口。橙色不能用于装饰性图标网格。

### Secondary

- **成功绿** (`#34C759`): 可用、启用、健康、已完成。
- **危险红** (`#FF3B30`): 删除、失败、停用、不可恢复操作。

### Neutral

- **页面浅灰** (`#F9FAFB`): 浅色模式主体背景。
- **面板白** (`#FFFFFF`): 卡片、输入框、表格容器和弹出层。
- **静音灰** (`#F3F4F6`): 工具栏、筛选区域、分组背景和骨架屏底色。
- **柔和边界** (`#E5E7EB`): 面板边界、列表分隔和表格线。
- **强文本** (`#111827`): 标题、主要数据和高优先级标签。
- **正文文本** (`#374151`): 正文、说明和普通控件文字。
- **弱文本** (`#6B7280`): 次级元信息、占位辅助、时间和说明。正文不要使用比这个更浅的灰。
- **曜石底色** (`#020617`): 深色模式根背景。
- **深色面板** (`#0F172A`): 深色模式卡片、工具栏和输入框。
- **深色抬升面板** (`#111827`): 深色模式弹出层、下拉菜单和重点容器。
- **深色正文** (`#F8FAFC`): 深色模式标题与主要文字。
- **深色弱文本** (`#CBD5E1`): 深色模式次级文字，避免使用过低对比的 slate-500。

### Named Rules

**稀有行动色规则。** 蓝色、青色和橙色只用于可点击、当前选中、搜索启动或状态判断，不用于大面积装饰背景。

**无渐变核心规则。** 不使用渐变文字、渐变按钮或渐变背景作为核心视觉语言。已有渐变代码在后续迭代中应逐步替换为纯色、边界、字号和状态层级。

## 3. Typography

**Display Font:** 系统 sans 栈，优先 `-apple-system` / `BlinkMacSystemFont` / `SF Pro Display`，回退到 `Helvetica Neue`、`Arial`、`sans-serif`。

**Body Font:** 同一系统 sans 栈，减少字体切换带来的复杂度。

**Character:** 字体应服务于快速扫读。中文标题需要稳重清楚，后台标签和数据需要紧凑但不拥挤。除资源详情页的特殊海报语境外，不使用衬线字体作为常规 UI 语言。

### Hierarchy

- **Display** (700, 48px, 1.08): 只用于首页品牌名或资源详情页主标题。最大字距不小于 `-0.03em`，避免中文与英文挤压。
- **Headline** (700, 32px, 1.15): 页面主标题、重要区块标题。
- **Title** (650, 20px, 1.3): 卡片标题、结果标题、后台面板标题。
- **Body** (400, 16px, 1.6): 正文、说明、结果摘要。长文本行宽控制在 65-75ch。
- **Label** (600, 14px, 1.35): 按钮、筛选、状态标签、表头和元信息标题。
- **Caption** (500, 12px, 1.45): 时间、来源、辅助提示和小型说明。必须保持足够对比度。

### Named Rules

**任务优先排版规则。** 产品 UI 不使用流式超大标题作为默认模式；后台、表格、筛选器和弹窗使用固定 rem 尺度，保证同一控件在不同屏幕上保持可预期。

**少用花体规则。** 衬线、极细字重和过紧字距只能用于极少数资源视觉展示，不进入导航、按钮、表单、表格和后台。

## 4. Elevation

UniSearch 使用“边界 + 色层 + 少量阴影”的混合层级。默认表面应接近平面，只有弹出层、悬浮菜单、搜索框聚焦、卡片 hover 和深色模式容器需要轻度抬升。玻璃拟态可以作为历史样式存在，但不应作为新增组件默认方案。

### Shadow Vocabulary

- **面板低阴影** (`0 2px 8px rgba(0, 0, 0, 0.08)`): 普通卡片和结果容器，浅色模式下谨慎使用。
- **悬浮阴影** (`0 8px 24px rgba(0, 0, 0, 0.15)`): 下拉菜单、用户菜单、浮层和 hover 后需要脱离背景的容器。
- **深色面板阴影** (`0 12px 28px rgba(0, 0, 0, 0.28)`): 深色模式弹出层和后台重点面板。
- **搜索聚焦光晕** (`0 0 0 4px rgba(8, 145, 178, 0.16)`): 搜索框、输入框和主操作的焦点反馈。优先用 ring，不用大面积发光。

### Named Rules

**平面优先规则。** 静态卡片不要同时使用明显边框、强阴影和透明玻璃背景。默认选择边界和背景色；需要交互反馈时再增加小幅阴影或 ring。

**圆角上限规则。** 常规卡片和面板不超过 20px；32px 以上的大圆角只允许在当前遗留 hero/搜索容器中逐步收敛，不作为新增标准。

## 5. Components

组件词汇应保持一致：同一层级的按钮、筛选芯片、输入框和面板在公共页与后台中共享形状与状态，只通过密度和信息量调整，而不是重新发明样式。

### Buttons

- **Shape:** 默认 12px 圆角；标签式按钮和小入口可以用药丸。
- **Primary:** 检索蓝背景、白色文字、10px 16px 内边距，字体 14px/600。用于提交、保存、确认和主要导航动作。
- **Search:** 搜索橙背景、白色文字、12px 18px 内边距。只用于真正发起搜索或跳转热门搜索。
- **Secondary:** 白色或深色面板背景，柔和边界，正文色文字。用于取消、筛选、次级入口。
- **Hover / Focus:** hover 可轻微变深或抬升 1-2px；focus 必须有 2px 以上可见 ring；disabled 降低透明度并禁止 hover 抬升。

### Chips

- **Style:** 药丸形状，浅色模式使用白色或 `#F3F4F6` 背景加柔和边界；深色模式使用 `#0F172A` 或青色 10% 透明背景。
- **State:** 选中态使用蓝/青色边界和更深文字，同时保留文本说明；不要只靠颜色区分选中。
- **Use:** 平台类型、来源、热门关键词、资源标签和筛选条件。

### Cards / Containers

- **Corner Style:** 默认 16px；紧凑后台面板 12px；公共搜索主容器可到 20px。
- **Background:** 浅色模式白色面板优先；深色模式使用深蓝灰面板，不叠加多层渐变。
- **Shadow Strategy:** 默认无阴影或低阴影；hover 和浮层才使用悬浮阴影。
- **Border:** 使用 `#E5E7EB` 或深色模式低透明白边。不要使用粗侧边条作为装饰。
- **Internal Padding:** 普通卡片 16-24px；后台密集面板 12-20px；移动端可降到 12-16px。

### Inputs / Fields

- **Style:** 白色或深色面板背景，12-20px 圆角，柔和边界，正文色输入文字，占位文字必须达到可读对比。
- **Focus:** 边界切换到行动青或检索蓝，并增加 4px 以内柔和 ring。
- **Error / Disabled:** 错误态使用危险红边界和错误文本；禁用态降低透明度并保留标签说明。
- **Search Box:** 搜索框是公共页最高优先级控件。它可以比普通输入更宽、更高，但不应依赖大光晕或玻璃模糊表达重要性。

### Navigation

- **Style:** 顶部导航保持固定、轻量、可扫读。Logo、首页、搜索、热门榜单、通知、主题和账户入口是主要结构。
- **Active:** 当前页面应有明确选中态，可使用蓝/青色文字、背景胶囊或下划线，但不要使用渐变文字。
- **Mobile:** 移动端优先保留搜索、热门榜单和账户动作；菜单展开后必须有清晰触控目标。
- **Admin:** 后台导航使用更高密度的侧栏或工作区导航，状态和批量动作优先于品牌展示。

### Search Results

- **Style:** 桌面端可使用网格或列表，移动端默认列表。结果项必须突出标题、来源、云盘类型、更新时间、可打开状态和详情入口。
- **State:** 加载使用骨架屏；空状态给出下一步建议；错误状态说明是否可重试。
- **Action:** 外跳前尽量引导到详情页进行判断，尤其是需要提取码、转存码或二维码的资源。

### Resource Detail

- **Style:** 详情页可以承载更强的视觉氛围，但核心仍是“打开前速览”。标题、云盘类型、链接数量、访问方式、体积、发布时间和预览图必须在首屏易读。
- **Media:** 有海报图时可以使用暗色背景承托；没有图时用明确空状态说明，不用装饰插画补位。
- **Decision Card:** 详情页必须保留一个判断区，帮助用户确认是否值得打开外部资源。

### Admin Workspace

- **Style:** 后台使用高密度面板、表格、筛选器、批量操作栏和状态标签。减少玻璃、渐变和大面积背景装饰。
- **State:** 插件、频道、用户和系统配置必须有明确的启用、停用、失败、加载、保存成功和保存失败反馈。
- **Density:** 后台内容宽度可更大，布局优先支持扫描、比较和重复操作。

## 6. Do's and Don'ts

### Do:

- **Do** 让搜索框、热门榜单入口、筛选器和详情判断区成为公共页面的视觉优先级。
- **Do** 使用 `#007AFF` 作为主操作色，`#0891B2` 作为辅助选中和深色强调，`#FF9500` 只用于搜索启动或热门搜索动作。
- **Do** 使用 12px-20px 的圆角范围构建卡片、输入框和面板，药丸只用于芯片、小按钮和标签。
- **Do** 为按钮、输入框、筛选器、菜单和后台批量动作补齐 hover、focus、active、disabled、loading 和 error 状态。
- **Do** 在深色模式中保持正文高对比，次级文字优先使用 `#CBD5E1`，不要让信息灰到不可读。
- **Do** 用骨架屏和明确空状态解释加载、无结果、无权限和外部资源不可达。
- **Do** 让后台保持密度、秩序和明确反馈，服务稳定运营。

### Don't:

- **Don't** 做成杂乱资源站、广告堆叠页、强营销落地页或重装饰后台。
- **Don't** 使用渐变文字、渐变按钮、渐变背景或依赖渐变制造层次的卡片。
- **Don't** 为了显得高级而增加不必要的玻璃拟态、发光、漂浮阴影、大面积装饰动效或晦涩文案。
- **Don't** 在新增组件中使用 32px 以上的大圆角卡片、强 blur 玻璃面板或多层阴影作为默认样式。
- **Don't** 用颜色作为唯一状态表达；平台、错误、成功、加载和空状态都必须有文本或图标辅助。
- **Don't** 让后台继承首页的装饰表达；后台不是品牌海报，而是工作台。
- **Don't** 在每个区块都放小号大写 eyebrow 或编号标记；只有真实流程步骤才使用序号。
