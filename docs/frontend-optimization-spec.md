# Frontend Optimization Spec — UniSearch

**文档版本**: v1.0  
**状态**: 草稿 Draft  
**作者**: Engineering  
**最后更新**: 2025-07

---

## 📋 目录

- [背景与目标](#背景与目标)
- [优化范围概览](#优化范围概览)
- [Phase 1 — 快速收益（Quick Wins）](#phase-1--快速收益quick-wins)
- [Phase 2 — 渲染与 Bundle 性能](#phase-2--渲染与-bundle-性能)
- [Phase 3 — 代码架构重构](#phase-3--代码架构重构)
- [Phase 4 — UX 体验与可访问性](#phase-4--ux-体验与可访问性)
- [Phase 5 — 鲁棒性与 SEO](#phase-5--鲁棒性与-seo)
- [里程碑计划](#里程碑计划)
- [不在本次 Scope 内](#不在本次-scope-内)

---

## 背景与目标

UniSearch 前端目前已完成核心功能闭环（搜索、认证、公告、后台管理），整体 UI 风格统一、交互流畅。随着功能迭代积累，代码库中出现了若干**性能瓶颈**、**重复数据维护**、**不必要的 Bundle 开销**以及**可访问性缺口**，需要系统性整理。

### 目标

| 维度 | 目标 |
|---|---|
| 渲染性能 | 消除搜索结果列表全量重渲染；修复 loadMore 重复动画 |
| Bundle 大小 | 移除冗余动画/图标依赖，预计减少 ~30% 动画相关 chunk |
| 可维护性 | 消除 cloudTypeMap 双源维护；拆分 634 行单文件 |
| UX 体验 | 修复 LoginPage 白屏、PasswordModal 数据残留等感知问题 |
| 可访问性 | 搜索结果卡片键盘可达；补全缺失 ARIA 属性 |
| 鲁棒性 | 全局 ErrorBoundary；修复脆弱的 HTML 剥离逻辑 |

### 非目标

- 不修改后端 API 设计
- 不替换核心框架（React / Zustand / Tailwind）
- 不重写整体视觉风格

---

## 优化范围概览

```
总计 24 个优化项，按 5 个 Phase 交付：

Phase 1  Quick Wins          6 项   ~1-2 天   高 ROI，低风险
Phase 2  渲染/Bundle 性能    6 项   ~3-4 天   核心性能改善
Phase 3  代码架构重构         5 项   ~3-4 天   可维护性提升
Phase 4  UX & 可访问性        5 项   ~2-3 天   体验与合规
Phase 5  鲁棒性 & SEO         2 项   ~1 天     防御性改进
```

---

## Phase 1 — 快速收益（Quick Wins）

> 改动局部、风险低、收益高，优先执行。

---

### P1-1  删除 `Home.tsx` 中的无效 `isPageLoading` 状态

**文件**: `frontend/src/pages/Home.tsx`

**问题**:  
`isPageLoading` 初始为 `true`，在 `useEffect(() => { setIsPageLoading(false); }, [])` 中立即被设为 `false`。由于 `useEffect` 在浏览器绘制后异步执行，`FeatureCardsSkeleton` 理论上会闪现一帧，但实际用户不可感知。这是一次无意义的额外渲染和多余的状态定义。

**当前代码**:
```tsx
const [isPageLoading, setIsPageLoading] = useState(true);

useEffect(() => {
  setIsPageLoading(false);
}, []);

// 消费处
{isPageLoading ? <FeatureCardsSkeleton /> : <实际内容 />}
```

**改动方案**:
1. 删除 `isPageLoading` state 及其 `useEffect`
2. 直接渲染实际内容（`featureCards` 渲染不依赖任何异步数据）
3. `FeatureCardsSkeleton` 可在真正需要时（例如未来接入动态特性配置接口）重新引入

**验收标准**:
- [ ] 删除后首页 feature cards 正常渲染
- [ ] 无 TypeScript 错误
- [ ] 现有 Home 快照测试通过（需更新快照）

---

### P1-2  修复 `PasswordModal` 关闭后数据残留

**文件**: `frontend/src/components/SearchResults.tsx`

**问题**:  
密码弹窗关闭时仅将 `isOpen` 置为 `false`，`password / url / cloudType` 字段会保留上一条记录的值，直到下次打开时才被覆盖。虽然视觉上不可见，但若将来组件做了懒挂载优化，可能导致旧数据短暂显现。

**当前代码**:
```tsx
onClose={() => setPasswordModal(prev => ({ ...prev, isOpen: false }))}
```

**改动方案**:
```tsx
onClose={() => setPasswordModal({ isOpen: false, password: '', url: '', cloudType: '' })}
```

**验收标准**:
- [ ] 关闭弹窗后 `passwordModal` state 完全重置
- [ ] 单元测试：连续打开两个不同条目的密码弹窗，第二次显示正确数据

---

### P1-3  修复 `AnnouncementPanel` 脆弱的 HTML 标签剥离

**文件**: `frontend/src/components/AnnouncementPanel.tsx`

**问题**:  
面板卡片截取预览文字时使用正则 `replace(/<[^>]*>/g, '')` 剥离 HTML 标签。这个正则在处理畸形 HTML（如未闭合标签、属性中含有 `>`）时会产生错误的结果，同时也不能处理 HTML 实体（`&amp;` 等）。

**改动方案**:  
使用 `DOMParser` 替代正则，既准确又安全：

```tsx
// 替换前
const plainText = htmlContent.replace(/<[^>]*>/g, '');

// 替换后
const getPlainText = (html: string): string => {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent ?? '';
  } catch {
    return html.replace(/<[^>]*>/g, ''); // 降级 fallback
  }
};
```

**验收标准**:
- [ ] 对含嵌套标签、`<img>`、HTML 实体的公告内容，预览文字提取正确
- [ ] 对空字符串、null 输入不抛出异常

---

### P1-4  修复 `LoginPage` 加载系统设置时的白屏问题

**文件**: `frontend/src/pages/LoginPage.tsx`

**问题**:  
`isLoadingSettings` 为 `true` 时执行 `return null`，导致整个登录页在约 100-300ms 内变为空白，用户在页面切换时会看到白屏闪烁。

**当前代码**:
```tsx
if (isLoadingSettings) return null;
```

**改动方案**:  
保持页面渲染，仅对「注册账号」入口链接做条件控制：

1. 删除 `if (isLoadingSettings) return null;`
2. 注册链接改为：在 `isLoadingSettings` 时隐藏（`hidden`）或显示骨架占位
3. 登录按钮在 `isLoadingSettings` 期间不受影响，保持可交互

```tsx
// 注册入口改为
{!isLoadingSettings && enableUserSignup && (
  <AuthEntryLink to="/register" ... />
)}
```

**验收标准**:
- [ ] 登录页在任何网络条件下不出现空白帧
- [ ] `enableUserSignup = false` 时注册入口不显示
- [ ] `isLoadingSettings` 期间注册入口隐藏，加载完成后按配置显示

---

### P1-5  统一 `SearchBox` 与 `searchStore` 的历史记录显示上限

**文件**: `frontend/src/components/SearchBox.tsx`

**问题**:  
`searchStore` 最多存储 10 条历史记录，但 `SearchBox` 中 `historyToShow` 硬编码截取 6 条展示。用户最多可能有 4 条不可见的历史记录，造成功能信息丢失。

**改动方案**:  
提取常量并保持两处一致，统一为 8 条（平衡可见性与界面高度）：

```tsx
// searchStore.ts — 已有常量提取即可
const MAX_SEARCH_HISTORY = 8;

// SearchBox.tsx
const historyToShow = searchHistory.slice(0, MAX_SEARCH_HISTORY);
```

或者将显示上限与存储上限分离，通过 prop 控制展示数量。

**验收标准**:
- [ ] Store 存储上限与 UI 展示上限一致或有明确文档说明差异
- [ ] 超出上限的历史条目在 UI 中对用户有所提示（如显示条数）

---

### P1-6  修复搜索结果卡片顶部装饰色的字符串 includes 判断

**文件**: `frontend/src/components/SearchResults.tsx`

**问题**:  
通过 `cloudInfo.text.includes("blue")` 等字符串匹配来决定顶部装饰渐变色，这是脆弱的间接逻辑。当 `getCloudTypeInfo` 中某个类型的 `text` 样式改变时，顶部颜色会静默失效。

**当前代码**:
```tsx
cloudInfo.text.includes("blue") ? "from-blue-400 to-cyan-300" :
  cloudInfo.text.includes("orange") ? "from-orange-400 to-yellow-300" :
    cloudInfo.text.includes("purple") ? "from-purple-400 to-pink-300" :
      "from-gray-400 to-gray-300"
```

**改动方案**:  
在 `getCloudTypeInfo` 的返回结构中直接增加 `gradient` 字段：

```tsx
[CloudType.BAIDU]: {
  name: '百度网盘',
  bg: 'bg-blue-500/10 dark:bg-blue-500/20',
  text: 'text-blue-600 dark:text-blue-400',
  border: 'border-blue-200/50 dark:border-blue-700/50',
  icon: 'text-blue-500',
  gradient: 'from-blue-400 to-cyan-300',   // ← 新增
},
```

**验收标准**:
- [ ] 所有 11 种网盘类型的顶部装饰色均有对应 `gradient` 定义
- [ ] 删除原有字符串 includes 逻辑
- [ ] TypeScript 接口更新，`gradient` 字段为必填

---

## Phase 2 — 渲染与 Bundle 性能

---

### P2-1  提取 `cloudTypeMap` 为模块级常量

**文件**: `frontend/src/components/SearchResults.tsx`

**问题**:  
`getCloudTypeInfo` 是定义在组件内部的函数，每次调用都会实例化包含 11 个类型、每类 5 个字段的 `cloudTypeMap` 对象。在搜索结果列表渲染时，每个结果卡片都会调用一次此函数。

**影响范围**:  
- 假设 48 条结果（初始 displayedCount）：每次渲染调用 48 次，每次构建一个 ~55 字段的对象

**改动方案**:

```tsx
// 提升到文件顶层模块级别
const CLOUD_TYPE_MAP: Record<CloudTypeValue, CloudTypeStyle> = {
  [CloudType.BAIDU]: {
    name: '百度网盘',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/50 dark:border-blue-700/50',
    icon: 'text-blue-500',
    gradient: 'from-blue-400 to-cyan-300',
  },
  // ... 其余 10 种
};

const FALLBACK_CLOUD_TYPE_STYLE: CloudTypeStyle = {
  name: '未知类型',
  bg: 'bg-gray-500/10',
  text: 'text-gray-600',
  border: 'border-gray-200',
  icon: 'text-gray-500',
  gradient: 'from-gray-400 to-gray-300',
};

// 函数变为简单查找
const getCloudTypeInfo = (cloudType: CloudTypeValue): CloudTypeStyle =>
  CLOUD_TYPE_MAP[cloudType] ?? FALLBACK_CLOUD_TYPE_STYLE;
```

**验收标准**:
- [ ] `getCloudTypeInfo` 不再在函数体内构建对象字面量
- [ ] TypeScript 类型 `CloudTypeStyle` 定义正确（含 P1-6 新增的 `gradient` 字段）
- [ ] 渲染行为与重构前完全一致

---

### P2-2  将搜索结果卡片提取为 `React.memo` 组件

**文件**: `frontend/src/components/SearchResults.tsx`  
**新文件**: 
- `frontend/src/components/home/SearchResultGridCard.tsx`
- `frontend/src/components/home/SearchResultListItem.tsx`

**问题**:  
`renderResultItem` 是 `SearchResults` 组件内的普通函数，当以下任一 state 变化时，**所有**已渲染的卡片都会重渲染：
- `passwordModal` 打开/关闭（isOpen 变化）
- `viewMode` 切换
- `loadMore` 触发后 `displayedCount` 增加

在 48 条初始结果下，每次 `passwordModal` 的开关都触发 48 次不必要的重渲染。

**改动方案**:

```tsx
// SearchResultGridCard.tsx
interface SearchResultGridCardProps {
  item: { link: SearchResultLink; cloudType: string; datetime: number };
  cloudInfo: CloudTypeStyle;
  onLinkClick: (hasPassword: boolean, link: SearchResultLink, cloudInfo: CloudTypeStyle) => void;
}

const SearchResultGridCard = React.memo<SearchResultGridCardProps>(
  ({ item, cloudInfo, onLinkClick }) => {
    // ... 仅渲染 grid 卡片 UI
  }
);

// SearchResultListItem.tsx — 同理
```

同时将 `handleLinkClick` 用 `useCallback` 包裹，保证引用稳定：

```tsx
const handleLinkClick = useCallback((
  hasPassword: boolean,
  link: SearchResultLink,
  cloudInfo: CloudTypeStyle
) => {
  if (hasPassword) {
    setPasswordModal({ isOpen: true, password: link.password, url: link.url, cloudType: cloudInfo.name });
  } else {
    window.open(link.url, '_blank');
  }
}, []); // setPasswordModal 是稳定的 setter，无需列为依赖
```

**验收标准**:
- [ ] 打开/关闭密码弹窗时，React DevTools Profiler 显示仅弹窗组件重渲染，卡片列表不重渲染
- [ ] `viewMode` 切换时，仅布局容器重渲染
- [ ] 新增 `loadMore` 的条目有入场动画；已渲染条目不重放动画

---

### P2-3  修复 `loadMore` 后已展示条目重复播放入场动画

**文件**: `frontend/src/components/SearchResults.tsx`

**问题**:  
每个结果项的 `motion.div` 使用 `initial="hidden" animate="visible"`，结合父容器 `containerVariants` 的 `staggerChildren`。当 `displayedCount` 增加后，父容器重新渲染，导致**所有子项**重新触发 `hidden → visible` 动画，包括已经显示的条目。

**改动方案**:  
将动画改为基于首次挂载而非父容器驱动。移除父容器的 `containerVariants`，改用每个卡片自身的首次挂载动画：

```tsx
// 卡片组件内部
const SearchResultGridCard = React.memo(({ item, index, isNew }) => (
  <motion.div
    // 使用 animate prop 而非 variants，只在 isNew 时才做入场
    initial={isNew ? { opacity: 0, y: 20, scale: 0.96 } : false}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{
      type: 'spring',
      stiffness: 300,
      damping: 25,
      delay: isNew ? (index % 48) * 0.03 : 0, // 每批新增有交错延迟
    }}
  >
    ...
  </motion.div>
));
```

`isNew` 由父组件根据条目是否在本次 `loadMore` 新增来判断。

**验收标准**:
- [ ] 首次搜索结果有入场动画（stagger 效果）
- [ ] `loadMore` 追加的新条目有入场动画
- [ ] `loadMore` 触发后，已显示的旧条目不重放动画
- [ ] `viewMode` 切换时所有条目用更短的淡入动画重排（可接受）

---

### P2-4  审计并移除冗余动画库依赖

**文件**: `frontend/package.json`, `frontend/vite.config.ts`

**问题**:  
项目同时安装了三个动画相关库：

| 包 | 用途 | 大小（gzip 估算） | 状态 |
|---|---|---|---|
| `framer-motion` | 主要动画库 | ~40KB | 保留 |
| `motion` | framer-motion 的重构版（同一团队） | ~35KB | 审计 |
| `gsap` | GreenSock 动画平台 | ~50KB | 审计 |

`motion` 与 `framer-motion` 在 v12 版本后功能高度重叠，同时使用意味着 bundle 中存在大量重复代码。

**改动方案**:

**Step 1** — 搜索实际使用情况：
```bash
grep -r "from 'motion'" frontend/src --include="*.tsx" --include="*.ts"
grep -r "from 'gsap'" frontend/src --include="*.tsx" --include="*.ts"
```

**Step 2** — 根据搜索结果：
- 若 `motion` 包的导入可用 `framer-motion` 等价替换，则移除 `motion` 包
- 若 `gsap` 仅用于个别特效动画，评估是否可用 `framer-motion` 等价实现后移除
- 若 `gsap` 用于 `gsap.timeline()` 等无法简单替换的场景，保留并做 `dynamic import` 懒加载

**Step 3** — 更新 `vite.config.ts` 的 `manualChunks`:
```ts
'motion-vendor': ['framer-motion'], // 移除已删除的包
```

**验收标准**:
- [ ] 完成依赖审计报告（哪些文件用了哪个库的哪些 API）
- [ ] `pnpm build` 后 `motion-vendor` chunk 体积减小
- [ ] 所有动画效果视觉上与重构前一致
- [ ] 无运行时报错

---

### P2-5  审计并移除 `date-fns` 依赖

**文件**: `frontend/package.json`

**问题**:  
`date-fns` 是一个功能完备的日期工具库（gzip ~13KB for tree-shaken imports），但项目中几乎所有日期处理都使用原生 `Date` API（如 `formatResultTime` 函数）。

**改动方案**:

**Step 1** — 统计实际使用：
```bash
grep -r "from 'date-fns'" frontend/src --include="*.tsx" --include="*.ts"
```

**Step 2** — 若使用量极少（如 1-2 处），用原生 `Intl.DateTimeFormat` 或 `Date.toLocaleDateString()` 替换后移除。

**验收标准**:
- [ ] 完成使用审计
- [ ] 若可移除，`pnpm build` 后产物中不含 `date-fns` 相关代码
- [ ] 日期展示功能正常

---

### P2-6  统一图标库，逐步迁移 `react-icons` 到 `lucide-react`

**文件**: 全局，涉及所有使用 `IoXxx` 图标的组件

**问题**:  
项目同时使用 `react-icons`（`react-icons/io5`，Ionicons 5 风格）和 `lucide-react`。两个库图标风格相近但不完全一致，且增加了约 1 个额外 npm 包的维护成本。

> 注意：`设计规范.md` 中指定"统一使用 `react-icons/io5`（Ionicons 5）"，若规范优先则方向相反——迁移 `lucide-react` 到 `react-icons/io5`。  
> **本 Spec 以实际代码现状（两者混用）为基础，提出整理方向，最终选型需与设计决策对齐后确认。**

**本 Spec 建议**:  
保留 `lucide-react`（更活跃维护、更好的 tree-shaking、无需按 icon set 分包），迁移 `react-icons` 中的 IoXxx 图标，最终移除 `react-icons` 依赖。迁移可分批进行，不阻塞其他 Phase。

**分批计划**:
1. `SearchResults.tsx` — `IoTimeOutline`, `IoKeyOutline`, `IoAlertCircleOutline`, `IoSearchOutline`...
2. `SearchBox.tsx` — `IoCloseOutline`, `IoSearchOutline`...
3. `Navbar.tsx` / `MobileMenu.tsx` — 导航相关图标
4. 其余组件

**验收标准**:
- [ ] 设计选型决策确认（`lucide-react` or `react-icons/io5`）
- [ ] 至少完成 `SearchResults.tsx` 和 `SearchBox.tsx` 的图标迁移
- [ ] 图标视觉风格保持一致（大小、描边粗细）
- [ ] 长期目标：移除其中一个图标库依赖

---

## Phase 3 — 代码架构重构

---

### P3-1  提取共享 `cloudTypeConfig.ts`，消除数据双源维护

**当前状态**:  
网盘类型的名称/样式信息在两处各自维护，内容相似但字段不同：

| 文件 | 数据结构 | 字段 |
|---|---|---|
| `SearchResults.tsx` (内部) | `cloudTypeMap: Record<CloudTypeValue, ...>` | name, bg, text, border, icon, gradient |
| `components/home/platformThemes.ts` | `platformThemes: PlatformTheme[]` | type, name, color, shadow |

**目标文件**: `frontend/src/config/cloudTypeConfig.ts`

**新数据结构**:

```ts
// frontend/src/config/cloudTypeConfig.ts

export interface CloudTypeConfig {
  type: CloudTypeValue;
  name: string;
  // 用于搜索结果卡片样式
  badge: {
    bg: string;
    text: string;
    border: string;
    gradient: string;
  };
  // 用于图标/标签背景（复用自 platformThemes）
  tagColor: string;      // e.g. 'bg-blue-500'
  tagShadow: string;     // e.g. 'shadow-blue-500/30'
}

export const CLOUD_TYPE_CONFIGS: Record<CloudTypeValue, CloudTypeConfig> = {
  [CloudType.BAIDU]: {
    type: CloudType.BAIDU,
    name: '百度网盘',
    badge: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/50 dark:border-blue-700/50',
      gradient: 'from-blue-400 to-cyan-300',
    },
    tagColor: 'bg-blue-500',
    tagShadow: 'shadow-blue-500/30',
  },
  // ... 其余 10 种
};

// 向后兼容的派生数据，供 platformThemes.ts 复用
export const platformThemes: PlatformTheme[] = Object.values(CLOUD_TYPE_CONFIGS).map(cfg => ({
  type: cfg.type,
  name: cfg.name,
  color: cfg.tagColor,
  shadow: cfg.tagShadow,
}));
```

**迁移步骤**:
1. 创建 `cloudTypeConfig.ts`，定义合并后的配置
2. 更新 `platformThemes.ts`：从 `cloudTypeConfig.ts` 派生数据，保持对外接口不变
3. 更新 `SearchResults.tsx` / 新提取的卡片组件：使用 `CLOUD_TYPE_CONFIGS`
4. 更新 `CloudTypeFilter.tsx`：使用 `platformThemes`（接口不变，无感迁移）

**验收标准**:
- [ ] 两处数据来源合并为单一 `cloudTypeConfig.ts`
- [ ] 新增网盘类型只需在一处修改
- [ ] `platformThemes.ts` 向后兼容，`CloudTypeFilter.tsx` 无需改动
- [ ] TypeScript 类型覆盖完整

---

### P3-2  拆分 `SearchResults.tsx`（634 行）为多个子组件

**当前状态**:  
单文件承担：结果排序逻辑、两种视图渲染、工具栏、错误状态、空状态、无限滚动、密码弹窗状态管理。

**拆分目标结构**:

```
frontend/src/components/
├── SearchResults.tsx               (主协调层，~120 行)
├── home/
│   ├── SearchResultsToolbar.tsx    (计数显示 + 视图切换按钮，~60 行)
│   ├── SearchResultGridCard.tsx    (Grid 卡片，React.memo，~100 行)
│   ├── SearchResultListItem.tsx    (List 行，React.memo，~80 行)
│   └── SearchResultsEmptyState.tsx (无结果 / 未搜索 / 错误 三种状态，~120 行)
```

**主文件 `SearchResults.tsx` 职责**（重构后）:
- 从 store 取数据
- 执行 `allSortedResults` 排序（useMemo）
- 维护 `viewMode` 和 `passwordModal` state
- 管理 IntersectionObserver（无限滚动）
- 根据状态选择渲染哪个子组件

**验收标准**:
- [ ] 主文件 < 150 行
- [ ] 每个子组件有对应的 `__tests__` 测试文件
- [ ] 功能行为与拆分前完全一致
- [ ] P2-2（React.memo）在拆分时一并实现

---

### P3-3  提取 `getCloudTypePriority` 和排序逻辑到独立工具函数

**文件**: `frontend/src/components/SearchResults.tsx`  
**目标文件**: `frontend/src/utils/searchResultSorter.ts`

**问题**:  
`getCloudTypePriority` 和 `allSortedResults` 的 `useMemo` 内联了排序逻辑，不易单独测试。

**改动方案**:

```ts
// utils/searchResultSorter.ts
export interface SortableResult {
  cloudType: string;
  priority: number;
  datetime: number;
}

export const getCloudTypePriority = (cloudType: CloudTypeValue): number => {
  if ([CloudType.QUARK, CloudType.BAIDU, CloudType.ALIYUN, CloudType.TIANYI].includes(cloudType as CloudType)) return 1;
  if ([CloudType.MAGNET].includes(cloudType as CloudType)) return 3;
  return 2;
};

export const sortSearchResults = <T extends SortableResult>(results: T[]): T[] =>
  [...results].sort((a, b) => {
    const timeDiff = b.datetime - a.datetime;
    if (Math.abs(timeDiff) > 1000) return timeDiff;
    return a.priority - b.priority;
  });

export const flattenSearchResults = (mergedByType: SearchResponse['merged_by_type']): SortableResult[] => {
  ...
};
```

**验收标准**:
- [ ] `searchResultSorter.ts` 有完整的单元测试（排序优先级、时间排序、扁平化）
- [ ] `SearchResults.tsx` 中的 `useMemo` 调用提取后的纯函数
- [ ] 排序行为与重构前一致

---

### P3-4  将 `Admin.tsx` 的多 Dialog boolean flag 整合为单一状态

**文件**: `frontend/src/pages/Admin.tsx`

**问题**:  
后台管理页面通过多个独立的 boolean flag 控制 6 个 Dialog 的开关（`showCreateUser`, `showEditUser`, `showResetPassword`, `showDeleteConfirm`, `showBatchDelete`, `showBatchUpdateRole`）。这种模式不易扩展，每新增一个 Dialog 就需要增加一组 state。

> 注意：此状态目前封装在 `useAdminPageController` hook 中，改动需同步更新 hook 和 view。

**改动方案**:

```ts
// hooks/useAdminPageController.ts
type AdminDialogType =
  | 'create-user'
  | 'edit-user'
  | 'reset-password'
  | 'delete-confirm'
  | 'batch-delete'
  | 'batch-update-role'
  | null;

const [activeDialog, setActiveDialog] = useState<AdminDialogType>(null);

// 替换现有的多个 boolean
const openDialog = (type: AdminDialogType) => setActiveDialog(type);
const closeDialog = () => setActiveDialog(null);
const isDialogOpen = (type: AdminDialogType) => activeDialog === type;
```

**验收标准**:
- [ ] 所有 6 个 Dialog 通过统一的 `activeDialog` 状态控制
- [ ] 同一时刻只有一个 Dialog 可以打开（现有行为本就如此，但现在由类型系统保证）
- [ ] `Admin.tsx` 的已有测试全部通过

---

### P3-5  为 `formatResultTime` 增加更健壮的日期验证

**文件**: `frontend/src/components/SearchResults.tsx`  
**目标文件**: `frontend/src/utils/searchResultSorter.ts`（随 P3-3 一并迁移）

**问题**:  
```ts
if (date.getFullYear() < 2000) return '未知时间';
```
以 2000 年为硬编码阈值过于武断，无法处理 `NaN`、`Invalid Date`、时间戳为 `0` 等边缘情况。

**改动方案**:

```ts
export const formatResultTime = (timestamp: number | undefined | null): string => {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) return '未知时间';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '未知时间';
  // 合理性检查：1970-01-01 之后，且不超过当前时间 10 年
  const MIN_TIMESTAMP = new Date('2000-01-01').getTime();
  const MAX_TIMESTAMP = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
  if (timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) return '未知时间';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};
```

**验收标准**:
- [ ] 单元测试覆盖：`null`, `undefined`, `0`, `NaN`, `Infinity`, `1970-01-01 timestamp`, 正常时间戳
- [ ] 格式化后日期格式统一（`zh-CN` locale）

---

## Phase 4 — UX 体验与可访问性

---

### P4-1  搜索结果卡片补全键盘可访问性

**文件**: `frontend/src/components/home/SearchResultGridCard.tsx`, `SearchResultListItem.tsx`（P3-2 拆分后的文件）

**问题**:  
搜索结果卡片使用 `<div onClick={...}>` 实现点击交互，但没有：
- `role="button"` 或 `role="link"`（根据语义）
- `tabIndex={0}` 允许键盘聚焦
- `onKeyDown` 处理 `Enter`/`Space` 键触发
- `aria-label` 提供屏幕阅读器可读的描述

**改动方案**:

```tsx
<motion.div
  role="button"
  tabIndex={0}
  aria-label={`${cloudInfo.name}资源：${link.note || '未命名资源'}${hasPassword ? '（需要访问码）' : ''}`}
  onClick={handleLinkClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLinkClick(e as unknown as React.MouseEvent);
    }
  }}
  className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
  ...
>
```

**验收标准**:
- [ ] 可通过 Tab 键聚焦到每个结果卡片
- [ ] 按 Enter 或 Space 触发与点击相同的行为（打开链接或密码弹窗）
- [ ] 聚焦时有可见的 focus ring（`focus-visible`）
- [ ] 屏幕阅读器可读取卡片描述（包含资源名称、平台类型、是否有访问码）

---

### P4-2  `CloudTypeFilter` 标签补全 `aria-pressed` 属性

**文件**: `frontend/src/components/CloudTypeFilter.tsx`

**问题**:  
筛选标签在选中/未选中时有视觉区分，但没有 `aria-pressed` 属性向屏幕阅读器传达当前状态。

**改动方案**:

```tsx
// CloudTypeTag 组件
<motion.button
  role="button"
  aria-pressed={isSelected}
  aria-label={`${theme.name}${isSelected ? '（已选中）' : '（未选中）'}`}
  ...
>
```

全选按钮：
```tsx
<button
  aria-pressed={isAllSelected}
  aria-label={isAllSelected ? '取消全选所有网盘类型' : '全选所有网盘类型'}
  ...
>
```

**验收标准**:
- [ ] 所有筛选标签有正确的 `aria-pressed` 值
- [ ] 全选按钮有对应的 `aria-pressed` 和 `aria-label`
- [ ] 键盘可聚焦并通过 Enter/Space 切换选中状态

---

### P4-3  搜索加载时使用 `SearchResultsSkeleton` 替代 `BubbleLoader`

**文件**: `frontend/src/components/SearchResults.tsx`

**问题**:  
搜索加载时使用动感较强的 `BubbleLoader`（`LoadingState type="search"`），而 `SearchResultsSkeleton` 组件已存在并与最终内容结构匹配，能提供更好的感知连续性。

**当前代码**:
```tsx
{debouncedIsLoading && displayedResults.length === 0 && (
  <LoadingState type="search" size="lg" />
)}
```

**改动方案**:
```tsx
import { SearchResultsSkeleton } from '@/components/SkeletonLoader';

{debouncedIsLoading && displayedResults.length === 0 && (
  <SearchResultsSkeleton viewMode={viewMode} />
)}
```

**注意**:  
`SearchResultsSkeleton` 已支持 `viewMode: 'grid' | 'list'`，可直接传入当前视图模式，实现骨架屏与实际内容布局的匹配。

**验收标准**:
- [ ] 搜索发起后显示与当前 `viewMode` 一致的骨架屏
- [ ] 骨架屏在结果返回后平滑切换为实际内容（避免跳变）
- [ ] `BubbleLoader` 在此路径中不再被触发（但组件本身保留，可在其他场景使用）

---

### P4-4  `RegisterPage` 增加密码强度视觉反馈

**文件**: `frontend/src/pages/RegisterPage.tsx`

**问题**:  
注册页仅对密码长度做最低 6 字符校验，没有任何引导用户设置强密码的视觉反馈。

**改动方案**:  
在密码输入框下方添加强度指示条：

```tsx
// 密码强度评分函数（纯函数，无依赖）
const calcPasswordStrength = (password: string): 0 | 1 | 2 | 3 => {
  if (password.length < 6) return 0;
  let score = 0;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score + 1, 3) as 1 | 2 | 3;
};

const STRENGTH_LABELS = ['', '弱', '中', '强'] as const;
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-yellow-400', 'bg-green-400'] as const;
```

UI 结构（密码输入框下方）：

```tsx
{password && (
  <div className="flex items-center gap-2 mt-1.5">
    <div className="flex gap-1 flex-1">
      {[1, 2, 3].map(level => (
        <div
          key={level}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors duration-300',
            strength >= level ? STRENGTH_COLORS[strength] : 'bg-gray-200 dark:bg-gray-700'
          )}
        />
      ))}
    </div>
    <span className={cn('text-xs font-medium', ...)}>{STRENGTH_LABELS[strength]}</span>
  </div>
)}
```

**验收标准**:
- [ ] 密码输入时动态显示强度条（三段式：弱/中/强）
- [ ] 空密码时不显示强度条
- [ ] 弱/中/强分别对应红/黄/绿色
- [ ] 强度判断逻辑有单元测试

---

### P4-5  移动端搜索结果默认使用列表视图

**文件**: `frontend/src/components/SearchResults.tsx`

**问题**:  
移动端（`< 640px`）网格视图退化为单列，与列表视图视觉相似，但 padding、圆角配置不同，反而显得"扁"。列表视图在小屏下更紧凑、信息更完整。

**改动方案**:

```tsx
// 根据初始屏幕宽度设置默认视图模式
const [viewMode, setViewMode] = useState<ViewMode>(() => {
  return window.innerWidth < 640 ? 'list' : 'grid';
});
```

或通过 CSS 媒体查询隐藏视图切换按钮的同时，在移动端固定为列表布局（对 `viewMode` 无感知）。

**验收标准**:
- [ ] 在 `< 640px` 视口下，默认渲染列表视图
- [ ] 用户切换视图模式后偏好保持（当前会话内）
- [ ] 视图切换按钮在移动端可见（用户仍可手动切换为网格）

---

## Phase 5 — 鲁棒性与 SEO

---

### P5-1  添加全局 `ErrorBoundary`

**文件**: `frontend/src/App.tsx`  
**新文件**: `frontend/src/components/GlobalErrorBoundary.tsx`

**问题**:  
任何组件的未捕获渲染错误都会导致整个 React 应用崩溃并显示空白页，用户无法获得任何有效提示，也无法恢复操作。

**改动方案**:

```tsx
// GlobalErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 可接入 Sentry 等错误监控
    console.error('[GlobalErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          {/* 错误提示 UI，提供刷新/返回首页按钮 */}
        </div>
      );
    }
    return this.props.children;
  }
}
```

在 `App.tsx` 中包裹：
```tsx
<GlobalErrorBoundary>
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
</GlobalErrorBoundary>
```

**验收标准**:
- [ ] 人工触发渲染错误（如临时在某组件 throw）时显示错误 UI 而非白屏
- [ ] 错误 UI 提供"刷新页面"和"返回首页"两个恢复选项
- [ ] 错误信息在开发环境下展示 stack trace
- [ ] 生产环境只展示友好提示，不暴露内部错误详情

---

### P5-2  完善 `index.html` 的 SEO meta 标签

**文件**: `frontend/index.html`

**问题**:  
`index.html` 缺少基础的 SEO 和社交分享 meta 标签，导致搜索引擎索引信息缺失，社交平台分享时无预览卡片。

**改动方案**:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/png" href="/Uni.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO 基础 -->
  <title>UniSearch — 智能网盘资源搜索引擎</title>
  <meta name="description" content="UniSearch 聚合多种主流网盘链接，一站式搜索百度网盘、阿里云盘、夸克网盘等平台资源。" />
  <meta name="keywords" content="网盘搜索,资源搜索,百度网盘,阿里云盘,夸克网盘,UniSearch" />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph (社交分享) -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="UniSearch — 智能网盘资源搜索引擎" />
  <meta property="og:description" content="聚合多种主流网盘，快速找到您需要的资源。" />
  <meta property="og:image" content="/Uni.png" />
  <meta property="og:locale" content="zh_CN" />

  <!-- iOS Safari -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="UniSearch" />
  <link rel="apple-touch-icon" href="/Uni.png" />
</head>
```

**验收标准**:
- [ ] `<title>` 标签存在且描述准确
- [ ] `og:title`, `og:description`, `og:image` 完整
- [ ] 微信/微博等社交平台分享时能展示预览卡片

---

## 里程碑计划

| Phase | 内容 | 预估工时 | 优先级 | 风险 |
|---|---|---|---|---|
| **Phase 1** | Quick Wins（6 项） | 1-2 天 | P0 | 极低 |
| **Phase 2** | 渲染/Bundle 性能（6 项） | 3-4 天 | P1 | 中（需测试验证动画效果）|
| **Phase 3** | 代码架构重构（5 项） | 3-4 天 | P1 | 中（涉及文件拆分，需同步更新测试）|
| **Phase 4** | UX & 可访问性（5 项） | 2-3 天 | P2 | 低 |
| **Phase 5** | 鲁棒性 & SEO（2 项） | 0.5-1 天 | P2 | 极低 |

**建议执行顺序**:

```
Week 1:  Phase 1 (全部)  →  Phase 2 (P2-1, P2-2, P2-3)
Week 2:  Phase 3 (P3-1, P3-2, P3-3)  →  Phase 2 (P2-4, P2-5, P2-6 审计)
Week 3:  Phase 4 (全部)  →  Phase 3 (P3-4, P3-5)  →  Phase 5 (全部)
```

> **注意**：Phase 2 的 P2-2（React.memo）依赖 Phase 3 的 P3-2（组件拆分），建议在同一批次处理，避免重复改动同一文件。

---

## 不在本次 Scope 内

以下优化项经评估后不纳入本次计划，原因如下：

| 项目 | 排除原因 |
|---|---|
| 虚拟滚动（Virtual List） | 当前最大结果集 ~500 条，实测无明显性能问题；引入虚拟滚动会增大复杂度 |
| SSR / SSG | 需要后端配合，且应用需登录才能使用核心功能，SEO 收益有限 |
| PWA / Service Worker | 与搜索引擎资源的实时性需求冲突，离线缓存价值低 |
| 主题系统重构 | 当前 dark/light 实现已满足需求，引入 CSS-in-JS 主题系统成本过高 |
| 首页统计数字接入真实数据 | 需要后端提供统计 API，属于功能需求，不在优化范畴内 |
| 国际化（i18n） | 当前产品定位为中文用户，无此需求 |

---

*本文档为工程规范（Spec），各 Phase 内的子项在实施前应由开发者确认细节并可按需调整。*