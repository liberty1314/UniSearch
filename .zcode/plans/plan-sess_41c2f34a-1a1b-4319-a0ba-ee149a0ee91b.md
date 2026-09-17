# 搜索页面优化实施计划

## 现状结论（探索结果摘要）

搜索页由 `frontend/src/pages/SearchPage.tsx` 组合空态画布（SearchStage）、查询条（SearchQueryDock）、统一筛选卡（SearchUnifiedFilterCard）和结果区（SearchResults），状态集中在 Zustand 的 `frontend/src/stores/searchStore.ts`，数据走 NDJSON 渐进流式搜索（`searchService.ts` 手写 fetch），结果 >60 条时启用 `@tanstack/react-virtual` 虚拟列表。测试体系完善（vitest + Playwright），验证命令：`pnpm test` / `pnpm check` / `pnpm lint`（均在 `frontend/` 下执行）。

按你的选择，本次覆盖四个方向：**体验缺陷修复、网络层统一、代码结构重构、新特性（关键词高亮 + 搜索联想输入 + 交互动画）**。

## 阶段 A：体验缺陷修复（均有 file:line 证据）

1. **渐进搜索批事件重置已展开条数**：`searchStore.ts:289` 每个 batch 事件无条件 `displayedCount: initialDisplayCount`，用户点过"加载更多"的结果在下一批到达时被收回。改为保留 `state.displayedCount`（取 `Math.max(state.displayedCount, initialDisplayCount)`），`hasMore` 相应按保留值计算。
2. **IntersectionObserver 反复重建**：`SearchResults.tsx:199-214` effect 依赖 `isLoading/hasMore`，加载期间反复 unobserve/observe。改为 effect 只挂载一次 + 回调内通过 ref 读取最新的 `isLoading/hasMore`。
3. **render 期间写 ref**：`SearchResults.tsx:151-157` 惰性初始化写在组件体，改为 `useState` 惰性初始化函数。
4. **参数比较键序误判**：`searchStore.ts:135-136` `areSearchParamsEqual` 用 `JSON.stringify`，`ext` 对象键序不稳定会导致误判"参数不同"而重搜。抽一个稳定序列化（递归按键排序）替换。
5. **死代码清理**：删除 `searchStore.ts:644-648` 无调用方且在 zustand v5 下有 re-render 隐患的 `useAvailableOptions`；`searchAccessStore.ts:43-56` 的 `void force; void silent;` 残留参数一并清理。
6. **clearResults 误伤进行中搜索**：`useSearchUrlSync.ts:98-101` 无关键词即 `clearResults()`，其中 `invalidateSearchRequests()` 会作废进行中的搜索。加条件：仅当 store 处于非 loading/running 状态时才执行 clear（先读该文件确认具体触发链后落改）。

## 阶段 B：网络层统一

`searchProgressive`（`searchService.ts:63-131`）保持 fetch（axios 不支持 NDJSON 流读取），但补齐与 apiClient 对齐的能力：
- **AbortSignal 支持**：`searchProgressive` 接受 `signal`；`searchStore.performSearch` 模块级持有 `AbortController`，新搜索发起或 `clearResults/reset` 时 abort 旧流，不再让旧流白白消耗带宽。
- **401 刷新对齐**：渐进搜索收到 401 时复用 `lib/api.ts` 的刷新重试逻辑（抽公共函数供 fetch 路径调用一次），避免双轨。
- **超时控制**：与 apiClient 的超时策略对齐。

## 阶段 C：代码结构重构

- **结果渲染路径去重**：`SearchResultsList.tsx:68-103` 与 `SearchResultsVirtualList.tsx:157-198` 两份几乎相同的卡片渲染逻辑（entranceDelay/canOpenResource/GridCard/ListItem 选择）抽为公共的 `SearchResultItemView` 渲染组件，两个列表复用。
- 模块级可变缓存（`useSearchBoxController.ts` 热词缓存、`searchService.ts` health 缓存）保留现状但补注释说明测试重置入口的约束，不在本次大改（避免扩大爆炸半径）。

## 阶段 D：新特性

1. **关键词高亮**：
   - 新建 `frontend/src/components/search-results/HighlightedText.tsx` + `frontend/src/utils/textHighlight.ts`：对关键词做正则转义、按空白分词、大小写不敏感匹配，返回安全分段（React 片段，不用 dangerouslySetInnerHTML）。
   - 应用点：`SearchResultGridCard.tsx:123` 与 `SearchResultListItem.tsx` 的标题渲染处（均走 `resolveResourceDisplayTitle`），keyword 经 props 传入（两个列表组件新增可选 `highlightKeyword` prop，来源取 `useSearchStore` 的当前关键词）。
2. **搜索联想输入**（纯前端数据源，无后端改动）：
   - 数据源：搜索历史（`searchStore.searchHistory`）+ 热词缓存（`useSearchBoxController` 已有 5 分钟 TTL 的热词缓存）。
   - 在 `useSearchBoxController.ts` 中新增联想派生逻辑：输入非空时按前缀/包含匹配生成候选（复用已有的 `useDebouncedValue` 防抖 200ms），扩展 `SearchHistoryPanel`（或新建 `SearchSuggestionPanel`）渲染候选列表，键盘上下键导航复用并扩展现有 `activeHistoryIndex` 机制，Enter 提交所选候选。
   - 修复探索发现的路径不一致：`submitActiveHistory/selectHistory`（`useSearchBoxController.ts:450-455、529-532`）绕过 `submitKeyword` 的匿名登录拦截，统一改走 `submitKeyword`。
3. **交互优化与动画**（克制、复用既有组件）：
   - 结果计数采用既有 `number-ticker` 组件做数字滚动动画；
   - "加载更多"按钮与渐进进度提示的过渡动画微调（framer-motion 已在项目中）；
   - batch 到达不再收回展开条数（阶段 A1 本身就是最大的交互改进）。

## 流程与文档（遵循 AGENTS.md）

- 实施前写入 `.Codex/context-summary-搜索页优化.md`（上下文摘要）与 `.Codex/operations-log.md`（编码前检查/编码后声明），完成后生成 `.Codex/verification-report.md`。
- 全部代码、注释、测试描述、提交信息均使用简体中文。

## 测试与验证（每阶段完成后本地执行）

- 单测补充/调整：
  - `searchStore` 测试：batch 事件保留 displayedCount、稳定参数比较、abort 行为；
  - `HighlightedText` 单测（转义、多词、大小写）；
  - 联想输入面板测试（候选过滤、键盘导航、登录拦截一致性）；
  - `SearchResultsList/VirtualList` 重构后既有测试回归。
- 命令：`cd frontend && pnpm test -- --run && pnpm check && pnpm lint`；如有 Playwright 环境，跑 `pnpm e2e:mock` 的 search-canvas 用例。

## 提交策略

按阶段分 4 次小步提交（A 修复 / B 网络层 / C 重构 / D 特性），每次提交保持可编译、测试通过。