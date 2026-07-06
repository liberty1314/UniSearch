# UniSearch 前端页面设计优化开发计划

## 1. 文档目标

本文基于 `docs/frontend-ui-optimization-plan.md`，将前端全站页面设计优化方案拆解为可执行开发计划。计划覆盖导航与后台分流、表面层级体系、首页搜索热榜移动端压缩、认证与账号页面微调、动效降级、免责声明与 404 收尾、测试验证和回滚策略，作为后续实现、排期、勾选进度和验收依据。

本文不直接修改业务代码。后续开发应按本文阶段逐步执行，每完成一个开发任务后同步勾选本文件对应条目，并补充本地验证结果。

## 2. 背景与现状

### 2.1 已有能力

- 公共路由已经集中在 `frontend/src/routes/AppRoutes.tsx`，可统一控制导航、页脚、认证页、后台页和 404 页的展示规则。
- 顶部导航已经由 `frontend/src/components/Navbar.tsx` 统一承载，包含主导航、通知、主题切换、账号菜单和移动端菜单入口。
- 公共页面背景已经由 `frontend/src/components/PublicPageShell.tsx` 统一承载，包含网格背景和顶部辉光。
- 首页、搜索页、热榜页已经拆出多个子组件，后续可在局部组件内压缩移动端信息密度。
- 管理后台已有独立侧栏、状态管理和设计常量，参考 `frontend/src/pages/Admin.tsx`、`frontend/src/components/admin/Sidebar.tsx`、`frontend/src/components/admin/adminDesign.ts`。
- 前端已有 Vitest 页面/组件测试和 Playwright E2E，验证入口包括 `pnpm check`、`pnpm test`、`pnpm e2e:mock`。

### 2.2 当前缺口

- `Navbar` 未匹配公共主导航路径时会回退高亮首页，导致登录、注册、账号、免责声明、后台等页面定位错误。
- 后台页面仍显示公共顶部导航，与后台侧栏形成信息架构冲突。
- 基础 `Card` 默认使用高强度玻璃样式，重复卡片、筛选区、工具栏和页面容器层级接近。
- 首页、搜索页和热榜页移动端纵向链路偏长，主操作和下一步入口需要更早出现。
- 动效来源分散在 Framer Motion、CSS animation、背景网格、页脚跑马灯和 404 动画中，减少动态效果模式覆盖不足。
- 免责声明和 404 页视觉收束不足，与公共站点的导航策略和表面层级体系没有完全对齐。

## 3. 总体原则

- 先改全局结构，再改单页细节，避免同一类问题在多个页面重复修补。
- 优先复用现有组件、设计常量和工具函数，不引入新的 UI 框架。
- 若后续需要新增复杂交互组件，先评估 21st.dev Community Components 的候选组件，再按项目设计语言改造。
- 保留 UniSearch 的青蓝科技感，但降低重复发光、重阴影和高强度玻璃叠加。
- 页面语义优先，主页面必须具备清晰 `h1`、主操作、辅助入口和空状态说明。
- 移动端优先检查首屏效率，390px 宽度下必须能看见主操作或明确下一步入口。
- 所有验证均在本地执行，Node 包管理统一使用 `pnpm`。
- 每个阶段独立可回滚，避免一次性重做全站导致问题定位困难。

## 4. 交付范围

### 4.1 前端代码交付

- 调整公共导航激活规则和后台导航分流。
- 建立页面表面层级样式令牌，并下沉到基础卡片、按钮和页面局部容器。
- 压缩首页、搜索页、热榜页移动端布局。
- 微调资源详情页、认证页、个人中心、免责声明和 404 页。
- 扩展减少动态效果模式覆盖范围。
- 补充或更新相关组件、页面和路由测试。

### 4.2 文档与验证交付

- 持续更新本文阶段任务勾选状态。
- 更新 `.Codex/operations-log.md` 记录关键决策、验证命令和未验证项。
- 更新 `.Codex/verification-report.md` 输出本地审查结论。
- 必要时补充截图验收记录，可放入后续开发任务说明或验证报告。

### 4.3 不在本计划范围内

- 不重构后端接口。
- 不调整搜索、热榜、登录、账号或后台的业务数据协议。
- 不新增认证、鉴权、加密或审计能力。
- 不更换前端技术栈、路由库、状态管理库或 UI 框架。

## 5. 核心集成点

| 集成点 | 计划动作 | 验收重点 |
| --- | --- | --- |
| `frontend/src/routes/AppRoutes.tsx` | 区分公共页、认证页、后台页、404 页的导航和页脚策略 | 后台不显示公共主导航，认证页不误高亮首页 |
| `frontend/src/components/Navbar.tsx` | 修正 active path，支持无激活状态和页面类型差异 | `/login`、`/register`、`/account`、`/disclaimer` 不高亮首页 |
| `frontend/src/pages/Admin.tsx` | 接入后台专属顶部条或页面标题区 | 后台视觉与公共站点分离，移动端侧栏仍可打开 |
| `frontend/src/components/ui/card.tsx` | 降低基础卡片默认视觉强度 | 重复卡片不再全部呈现高强度玻璃态 |
| `frontend/src/components/ui/button.tsx` | 统一按钮层级和尺寸策略 | 主按钮、次按钮、图标按钮、危险按钮区分稳定 |
| `frontend/src/index.css` | 新增或整理表面层级与减少动态效果规则 | 深浅色模式边界清晰，减少动态效果模式无持续动画 |
| `frontend/src/components/PublicPageShell.tsx` | 统一公共背景强度和移动端装饰策略 | 页面背景不与内容卡片抢层级 |
| `frontend/src/pages/Home.tsx` | 首页语义和移动端首屏压缩 | 移动端首屏可见品牌、搜索框和下一步入口 |
| `frontend/src/pages/SearchPage.tsx` | 搜索启动台、空状态和筛选区压缩 | 搜索框成为唯一最高层级操作 |
| `frontend/src/pages/HotPage.tsx` 与 `frontend/src/components/trending/*` | 热榜工具栏和卡片信息密度优化 | 390px 宽度下筛选入口不挤压内容 |
| `frontend/src/pages/ResourceDetailPage.tsx` 与 `frontend/src/components/resource-detail/*` | 详情页 Hero、操作台和内容区层级微调 | 资源判断信息更集中，粘性操作不遮挡内容 |
| `frontend/src/pages/LoginPage.tsx`、`RegisterPage.tsx`、`AdminLogin.tsx` | 认证页导航、背景和表单层级统一 | 表单可读性和返回路径清晰 |
| `frontend/src/pages/AccountPage.tsx` 与 `frontend/src/components/account/*` | 个人中心结构和卡片密度微调 | 账号概览、偏好、安全设置主次清晰 |
| `frontend/src/pages/DisclaimerPage.tsx` | 文本页面阅读宽度和层级收束 | 文本可读，导航不误导 |
| `frontend/src/components/ui/page-not-found.tsx` | 404 页动作和动效降级 | 减少动态效果模式下无持续动画 |
| `frontend/src/components/ui/motion-footer.tsx` | 首页影院式页脚移动端策略 | 移动端不过度拉长页面 |

## 6. 阶段计划

### 阶段一：导航与后台分流，P0，预计 1-2 个工作日

#### 6.1 开发任务

- [x] 在 `Navbar` 中将主导航激活路径从默认 `/` 改为可空状态。
- [x] 仅对 `/`、`/search`、`/trending` 激活 Tubelight 主导航。
- [x] 为认证页、账号页、免责声明和 404 页明确无主导航激活状态。
- [x] 在 `AppRoutes` 中整理 `showNavbar`、`showSiteFooter`、`showCinematicFooter` 的页面类型判断。
- [x] 在后台路由中隐藏公共主导航，保留后台自身侧栏和移动端菜单入口。
- [x] 为后台补充专属顶部条或页面标题区，承载当前模块标题、主题切换和必要账号操作。
- [x] 更新 `AdminNavigation.test.tsx`、`AppRoutes.test.tsx` 或新增导航测试，覆盖公共页、认证页、后台页、404 页。
- [x] 修复桌面端头像下拉菜单浮层定位，避免 `glass-panel` 的 `relative` 覆盖 `absolute` 后撑开或错位导航。
- [x] 补齐后台顶部条用户头像下拉菜单，支持点击展开账号操作并执行退出登录。
- [x] 统一后台顶部导航与前台页面导航样式，复用 UniSearch 品牌、玻璃导航、右侧操作按钮和 80px 顶部节奏。
- [x] 移除后台顶部导航中间的“管理后台 / 当前模块”胶囊组件，保留无障碍页面标题。
- [x] 移除后台顶部显式“返回首页”按钮，并将通知、主题切换和用户头像恢复到导航栏右侧。
- [x] 为插件性能监控和频道性能监控表格补充分页，默认每页 5 条，并支持切换每页 10、20、50 条。

#### 6.2 验收条件

- [x] 访问 `/login`、`/register`、`/account`、`/disclaimer` 时，不再错误高亮首页。
- [x] 访问 `/admin` 时，不显示公共“首页 / 搜索 / 热门榜单”主导航。
- [x] 移动端 `/admin` 仍可打开后台侧栏。
- [x] 公共首页、搜索页、热门榜单仍正常高亮对应导航项。
- [x] 404 页不展示公共主导航高亮，也不出现页脚误导。
- [x] 点击头像打开用户菜单时，头像、通知、主题按钮和主导航保持在同一导航条内，菜单作为浮层向下展开。
- [x] 后台管理页点击右上用户头像可弹出后台用户菜单，菜单包含个人中心和退出登录操作。
- [x] 后台顶部导航展示前台一致的 UniSearch 品牌文字和玻璃表面，不再显示中间模块胶囊，侧栏与内容区从 80px 顶部导航下方开始。
- [x] 后台顶部右侧操作区固定在导航 grid 第三列，显式“返回首页”按钮不再展示，logo 仍可返回首页。
- [x] 性能监控页面的插件和频道表格不再一次性铺满全部数据，翻页与每页条数切换可用。

#### 6.3 测试建议

```bash
cd frontend && pnpm test -- --run src/pages/__tests__/AdminNavigation.test.tsx src/routes/__tests__/AppRoutes.test.tsx
cd frontend && pnpm check
```

### 阶段二：表面层级与按钮层级，P0，预计 2-3 个工作日

#### 6.4 开发任务

- [x] 在 `index.css` 中建立 `surface-page`、`surface-panel`、`surface-card`、`surface-focus` 四级表面样式。
- [x] 调整 `Card` 默认样式，降低重复卡片默认阴影、模糊和顶部高光强度。
- [x] 梳理 `glass-card-premium`、`glass-panel`、`glass-toolbar` 的用途边界，减少页面级容器嵌套强玻璃卡。
- [x] 调整 `button.tsx` 的主按钮、次按钮、outline、ghost、图标按钮视觉层级。
- [x] 同步检查 `adminDesign.ts`、`accountDesign.ts`，让后台和个人中心使用同一层级语义。
- [x] 更新受影响的卡片、按钮和页面测试快照或断言。

#### 6.5 验收条件

- [x] 首页、搜索页、热榜页中主操作比普通信息卡更突出。
- [x] 搜索结果卡、热榜卡、后台指标卡 hover 不再全部产生强烈上浮和大阴影。
- [x] 深色模式下卡片边界清晰，但不出现大面积青蓝发光叠加。
- [x] 基础 `Card` 仍支持通过 `className` 局部增强为聚焦层。
- [x] 按钮文字、图标和焦点环在深浅色模式下均可读。

#### 6.6 测试建议

```bash
cd frontend && pnpm test -- --run src/pages/__tests__/Home.test.tsx src/pages/__tests__/SearchPage.test.tsx src/pages/__tests__/HotPage.test.tsx src/pages/__tests__/AccountPage.test.tsx src/pages/__tests__/Admin.test.tsx
cd frontend && pnpm check
```

### 阶段三：首页、搜索页和热榜移动端压缩，P1，预计 3-5 个工作日

#### 6.7 开发任务

- [x] 将首页 `UniSearch` 调整为唯一 `h1`，原价值主张降级为副标题。
- [x] 压缩首页首屏，保留品牌、价值主张、搜索框、信任点和热门榜单入口。
- [x] 合并首页“核心能力”和“使用建议”为“如何找到资源”紧凑区块。
- [x] 将平台类型展示改为更紧凑的芯片或分组列表，移动端默认控制在两行内。
- [x] 调整首页影院式页脚，移动端优先使用普通页脚或显著缩短展示高度。
- [x] 压缩搜索页启动台标题、说明和空状态热榜条目密度。
- [x] 将搜索页筛选卡和结果工具栏的视觉强度降为 `surface-panel` 或 `surface-card`。
- [x] 优化热榜页工具栏在移动端的分组、折叠和横向滚动策略。
- [x] 热榜页采用“榜单工具型”方向，保留筛选效率，降低海报式视觉占用。
- [x] 更新首页、搜索页、热榜页相关单测与 E2E 断言。

#### 6.8 验收条件

- [x] 390px 宽移动端首页首屏能同时看到品牌、搜索框和至少一个下一步入口。
- [x] 首页移动端总高度相对优化前减少 25% 以上。
- [x] 搜索页空状态在移动端不需要长滚动即可看到热榜直搜入口。
- [x] 搜索结果状态下，筛选入口不会遮挡或弱化结果列表。
- [x] 热榜页首屏能看到页面标题、核心筛选和榜单首项。
- [x] 桌面端布局不因移动端压缩而显得稀疏或错位。

#### 6.9 测试建议

```bash
cd frontend && pnpm test -- --run src/pages/__tests__/Home.test.tsx src/pages/__tests__/SearchPage.test.tsx src/pages/__tests__/HotPage.test.tsx src/components/trending/__tests__/HotToolbar.test.tsx
cd frontend && pnpm e2e:mock -- home-search.spec.ts trending-search.spec.ts
cd frontend && pnpm check
```

### 阶段四：认证页、个人中心和详情页微调，P2，预计 2-4 个工作日

#### 6.10 开发任务

- [x] 统一 `LoginPage`、`RegisterPage`、`AdminLogin` 的页面壳、表单宽度、标题层级和返回入口。
- [x] 降低认证页背景粒子与渐变动画强度，确保表单始终是最高视觉层级。
- [x] 调整 `AccountPage` 与 `components/account/*` 的概览、偏好、安全设置卡片密度。
- [x] 统一个人中心与全局表面层级，减少局部自定义高强度阴影。
- [x] 微调 `ResourceDetailPage` 与 `components/resource-detail/*` 的 Hero、元信息、链接区和粘性操作台。
- [x] 确认详情页移动端粘性操作不遮挡资源说明、链接列表或底部页脚。
- [x] 更新认证恢复搜索、账号页、资源详情页相关测试。

#### 6.11 验收条件

- [x] 登录、注册、管理员登录页面视觉语言一致，但管理员登录保持后台入口辨识。
- [x] 认证页移动端表单无需额外横向滚动，主按钮始终可见。
- [x] 个人中心首屏能区分账号概览、搜索偏好和安全设置。
- [x] 资源详情页的主判断信息、链接操作和补充说明层级清晰。
- [x] 详情页空状态、错误状态和正常状态均可读。

#### 6.12 测试建议

```bash
cd frontend && pnpm test -- --run src/pages/__tests__/AuthEntryPages.test.tsx src/pages/__tests__/AccountPage.test.tsx src/pages/__tests__/ResourceDetailPage.test.tsx
cd frontend && pnpm e2e:mock -- auth-resume-search.spec.ts
cd frontend && pnpm check
```

### 阶段五：动效降级、免责声明和 404 收尾，P3，预计 1-2 个工作日

#### 6.13 开发任务

- [x] 扩展 `@media (prefers-reduced-motion: reduce)`，覆盖骨架屏、认证背景、首页入场、页脚跑马灯和 404 动画。
- [x] 检查 `PageTransition` 的入场动画，减少动态效果模式下禁用位移和错落延迟。
- [x] 检查 `motion-footer`，移动端或减少动态效果模式下禁用持续滚动。
- [x] 检查 `page-not-found`，减少动态效果模式下禁用 canvas、漂浮、角色远程动画或循环运动。
- [x] 优化 `DisclaimerPage` 的阅读宽度、标题层级、段落节奏和导航状态。
- [x] 为免责声明和 404 页补充必要页面测试。
- [x] 完成全站截图验收和最终验证报告。

#### 6.14 验收条件

- [x] 系统开启减少动态效果后，页面无持续漂浮、滚动跑马灯、背景粒子和卡片错落动画。
- [x] 必要加载状态仍可理解，不因禁用动画变成空白或无反馈。
- [x] 免责声明页面阅读宽度合理，主导航不误高亮首页。
- [x] 404 页提供返回首页和搜索入口，减少动态效果模式下静态可用。
- [x] 所有阶段测试命令通过，未验证项必须记录原因和补偿计划。

#### 6.15 测试建议

```bash
cd frontend && pnpm test -- --run src/pages/__tests__/DisclaimerPage.test.tsx src/routes/__tests__/routeTransition.test.ts src/routes/__tests__/AppRoutes.test.tsx
cd frontend && pnpm e2e:mock
cd frontend && pnpm check
cd frontend && pnpm lint
```

## 7. 截图验收矩阵

后续实现完成后，建议使用 Playwright 或本地浏览器截图对以下组合进行验收。

| 页面 | 桌面端 1440px | 平板端 768px | 移动端 390px | 深色模式 | 减少动态效果 |
| --- | --- | --- | --- | --- | --- |
| 首页 `/` | 必测 | 建议 | 必测 | 必测 | 必测 |
| 搜索页 `/search` 空状态 | 必测 | 建议 | 必测 | 必测 | 必测 |
| 搜索页 `/search?keyword=...` 结果态 | 必测 | 建议 | 必测 | 必测 | 建议 |
| 热门榜单 `/trending` | 必测 | 建议 | 必测 | 必测 | 必测 |
| 资源详情 `/resource/:resourceId` | 必测 | 建议 | 必测 | 必测 | 建议 |
| 登录 `/login` | 必测 | 建议 | 必测 | 必测 | 必测 |
| 注册 `/register` | 建议 | 建议 | 必测 | 必测 | 必测 |
| 个人中心 `/account` | 必测 | 建议 | 必测 | 必测 | 建议 |
| 管理后台 `/admin` | 必测 | 建议 | 必测 | 必测 | 建议 |
| 免责声明 `/disclaimer` | 建议 | 建议 | 必测 | 必测 | 建议 |
| 404 未知路径 | 建议 | 建议 | 必测 | 必测 | 必测 |

## 8. 推荐执行顺序

1. 先执行阶段一，解决导航定位和后台分流问题。该阶段影响信息架构，必须先稳定。
2. 再执行阶段二，建立全局表面和按钮层级。后续页面改造都依赖这套视觉基础。
3. 执行阶段三，集中处理用户最高频的首页、搜索页和热榜页移动端效率。
4. 执行阶段四，处理认证、账号、详情这些次高频页面，让体验和全局体系一致。
5. 最后执行阶段五，完成动效降级、文本页、404 和全站截图验收。

## 9. 风险与回滚

### 9.1 主要风险

- 调整 `Card` 默认样式可能影响大量页面，需要先通过截图确认全站视觉变化。
- 后台隐藏公共导航可能影响移动端菜单入口，需要单独验证后台侧栏开关。
- 首页移动端压缩可能影响现有文案展示和 SEO 语义，需要保留清晰 `h1` 和价值主张。
- 热榜页工具栏折叠可能降低筛选可发现性，需要保留首屏关键筛选。
- 动效降级覆盖过宽可能误伤必要 loading 状态，需要保留静态反馈文案或 spinner。

### 9.2 回滚策略

- 导航改造失败时，优先回滚 `Navbar` 与 `AppRoutes` 的页面类型判断，不影响单页样式改造。
- 表面层级改造失败时，保留新增令牌，临时将 `Card` 默认样式恢复为旧类，再逐页迁移。
- 页面压缩改造失败时，按首页、搜索页、热榜页分文件回滚，避免全站一起回退。
- 动效降级改造失败时，优先回滚具体动画组件，不回滚全局减少动态效果基础规则。
- 每个阶段合并前必须保证 `pnpm check` 通过，若连续三次验证失败，停止实现并重新审查阶段范围。

## 10. 完成定义

- [x] 阶段一到阶段五的开发任务和验收条件均已完成或记录合理未完成原因。
- [x] 前端类型检查通过。
- [x] 相关 Vitest 单测通过。
- [x] 关键 Playwright E2E 或截图验收通过。
- [x] 深色模式、移动端、减少动态效果模式完成抽样验收。
- [x] `.Codex/operations-log.md` 已记录实现决策与验证命令。
- [x] `.Codex/verification-report.md` 已输出最终评分和通过/退回建议。
- [x] 未验证项均有明确补偿计划。
