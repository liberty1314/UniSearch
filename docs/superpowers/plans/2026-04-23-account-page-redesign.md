# Account Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不新增后端接口的前提下，把个人中心改造成“上横幅、下双栏”的个人工作台，保留账号概览与修改密码两个现有能力，并新增仅基于现有字段的展示型模块。

**Architecture:** 页面状态和接口请求继续留在 `frontend/src/pages/AccountPage.tsx`，账户页局部组件继续收敛在 `frontend/src/components/account/`。实现上拆成“欢迎横幅组件、概览主信息组件、概览展示组件、安全区重排”四个责任单元，避免把所有新布局重新塞回单个文件。用户已明确要求开发过程中不提前提交，因此 git 提交统一放在全部实现和验证完成之后执行。

**Tech Stack:** React 18、TypeScript、Tailwind CSS、Framer Motion、Vitest、Testing Library、Sonner、Lucide React

---

## 计划前提

- 设计依据：`docs/superpowers/specs/2026-04-23-account-page-redesign-design.md`
- 只改前端，不改接口协议
- 保留现有行为：
  - 加载个人资料失败时提示 `加载个人中心失败`
  - 两次密码不一致时阻止提交
  - 密码更新成功后清空表单并提示 `密码修改成功`
- Git 策略遵循用户偏好：
  - 开发阶段不做中间提交
  - 全部实现完成且本地验证通过后，再做一次最终提交

## 文件结构与职责

### 修改文件

- `frontend/src/pages/AccountPage.tsx`
  - 继续持有页面级状态
  - 把概览态的“快捷动作”回调传给概览组件
  - 负责装配新欢迎横幅与新工作台骨架

- `frontend/src/components/account/AccountWorkspaceShell.tsx`
  - 从“单纯左侧导航壳”升级为“上横幅、下双栏”的工作台骨架
  - 负责桌面端双栏与移动端顶部切换按钮的统一布局

- `frontend/src/components/account/AccountOverviewPanel.tsx`
  - 从“大杂烩概览卡片”收敛成概览组合入口
  - 只负责编排核心信息卡区和展示型模块区

- `frontend/src/components/account/AccountSecurityPanel.tsx`
  - 保留表单逻辑
  - 调整为更贴近新骨架的标题区 + 表单区 + 轻量提示区

- `frontend/src/components/account/accountDesign.ts`
  - 如有重复类名或新的表面语义，集中补充常量
  - 避免欢迎横幅和概览模块把样式字符串分散回组件内部

- `frontend/src/pages/__tests__/AccountPage.test.tsx`
  - 锁定新欢迎横幅、新展示模块、快捷动作切换和原有密码流程

### 新建文件

- `frontend/src/components/account/AccountHeroBanner.tsx`
  - 顶部欢迎横幅
  - 接收用户名、角色、最近登录等已有数据
  - 只承载欢迎语、身份标签、状态摘要，不承载复杂操作

- `frontend/src/components/account/AccountOverviewHighlights.tsx`
  - 4 张核心信息卡
  - 只负责“用户名 / 角色 / 最近登录 / 创建时间”

- `frontend/src/components/account/AccountOverviewShowcase.tsx`
  - 展示型模块区
  - 承载“身份说明 / 活跃状态 / 快捷动作 / 安全提示”

## Chunk 1: 锁定新骨架与欢迎横幅

### Task 1: 先把欢迎横幅和工作台骨架的页面预期写成失败测试

**Files:**
- Modify: `frontend/src/pages/__tests__/AccountPage.test.tsx`
- Reference: `docs/superpowers/specs/2026-04-23-account-page-redesign-design.md`

- [ ] **Step 1: 在页面测试里新增欢迎横幅与新骨架断言**

  把现有“渲染概览页”的测试扩展到以下断言：

  ```tsx
  expect(await screen.findByText('欢迎回来，alice')).toBeInTheDocument();
  expect(screen.getByText('账号工作台')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /账号概览/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /修改密码/ })).toBeInTheDocument();
  ```

  说明：
  - 欢迎语用静态文本 `欢迎回来，{username}`，不要把时间段问候做成实现依赖，避免测试脆弱
  - `账号工作台` 继续保留，避免测试与导航语义漂移

- [ ] **Step 2: 运行单测，确认这些新断言先失败**

  Run:

  ```bash
  pnpm --dir frontend test --run src/pages/__tests__/AccountPage.test.tsx
  ```

  Expected:
  - FAIL
  - 至少出现“Unable to find text `欢迎回来，alice`”或新骨架相关断言缺失

- [ ] **Step 3: 新建欢迎横幅组件**

  Create: `frontend/src/components/account/AccountHeroBanner.tsx`

  组件接口先固定为：

  ```tsx
  interface AccountHeroBannerProps {
    profile: AccountProfile | null;
    cachedUsername?: string;
    isLoadingProfile: boolean;
  }
  ```

  实现要求：
  - 标题使用 `欢迎回来，{username}`
  - 副信息展示角色和状态摘要
  - 小状态卡只使用已有字段派生，不引入新数据模型

- [ ] **Step 4: 把 `AccountWorkspaceShell` 改造成“上横幅、下双栏”骨架**

  Modify: `frontend/src/components/account/AccountWorkspaceShell.tsx`

  具体调整：
  - 在导航区上方新增横幅插槽，或直接在壳组件内部渲染 `AccountHeroBanner`
  - 桌面端结构改为：
    - 顶部完整欢迎横幅
    - 下方 `左导航 + 右内容`
  - 移动端结构改为：
    - 顶部欢迎横幅
    - 导航变为顶部双按钮切换条
    - 内容区在下方单列展开

- [ ] **Step 5: 在页面层接入新横幅与新壳组件**

  Modify: `frontend/src/pages/AccountPage.tsx`

  要点：
  - 保持 `profile`、`activeSection`、密码状态仍在页面层
  - 只调整装配方式，不改数据请求逻辑
  - 暂时不要改密码提交流程

- [ ] **Step 6: 重新运行页面测试，确认欢迎横幅和骨架断言通过**

  Run:

  ```bash
  pnpm --dir frontend test --run src/pages/__tests__/AccountPage.test.tsx
  ```

  Expected:
  - PASS 当前新增的欢迎横幅与骨架断言
  - 若还因概览展示模块缺失而失败，记录为下一任务的预期失败点

## Chunk 2: 完成概览态的核心信息卡与展示型模块

### Task 2: 先用测试锁定概览态新增模块和快捷动作切换

**Files:**
- Modify: `frontend/src/pages/__tests__/AccountPage.test.tsx`
- Reference: `frontend/src/components/account/AccountOverviewPanel.tsx`

- [ ] **Step 1: 在现有概览测试中新增展示型模块与快捷动作断言**

  追加以下断言与交互：

  ```tsx
  expect(screen.getByText('身份说明')).toBeInTheDocument();
  expect(screen.getByText('活跃状态')).toBeInTheDocument();
  expect(screen.getByText('快捷动作')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '立即修改密码' }));
  expect(screen.getByText('安全设置')).toBeInTheDocument();
  ```

  说明：
  - “立即修改密码”来自概览态快捷动作卡
  - 点击后本质上仍然是切到现有 `security` 分区

- [ ] **Step 2: 运行页面测试，确认它因为展示型模块和快捷动作尚未实现而失败**

  Run:

  ```bash
  pnpm --dir frontend test --run src/pages/__tests__/AccountPage.test.tsx
  ```

  Expected:
  - FAIL
  - 错误集中在缺少 `身份说明`、`活跃状态`、`快捷动作` 或按钮文本

- [ ] **Step 3: 新建 4 张核心信息卡组件**

  Create: `frontend/src/components/account/AccountOverviewHighlights.tsx`

  责任边界：
  - 只接收格式化后的 4 张核心数据
  - 不处理展示型模块
  - 不持有点击回调

  组件接口建议：

  ```tsx
  interface AccountOverviewHighlightsProps {
    profile: AccountProfile | null;
    cachedUsername?: string;
    isLoadingProfile: boolean;
  }
  ```

- [ ] **Step 4: 新建展示型模块组件**

  Create: `frontend/src/components/account/AccountOverviewShowcase.tsx`

  组件必须包含 4 个区块：
  - `身份说明`
  - `活跃状态`
  - `快捷动作`
  - `安全提示`

  组件接口建议：

  ```tsx
  interface AccountOverviewShowcaseProps {
    profile: AccountProfile | null;
    onOpenSecurity: () => void;
    isLoadingProfile: boolean;
  }
  ```

  其中 `快捷动作` 至少包含一个按钮：

  ```tsx
  <button type="button" onClick={onOpenSecurity}>
    立即修改密码
  </button>
  ```

- [ ] **Step 5: 把 `AccountOverviewPanel` 改造成纯编排组件**

  Modify: `frontend/src/components/account/AccountOverviewPanel.tsx`

  调整方式：
  - 保留顶部概览标题区
  - 删除内联的 4 卡片数组渲染
  - 组合：
    - `AccountOverviewHighlights`
    - `AccountOverviewShowcase`

  新 props：

  ```tsx
  interface AccountOverviewPanelProps {
    profile: AccountProfile | null;
    cachedUsername?: string;
    isLoadingProfile: boolean;
    onOpenSecurity: () => void;
  }
  ```

- [ ] **Step 6: 页面层把快捷动作回调接到分区切换**

  Modify: `frontend/src/pages/AccountPage.tsx`

  接法固定为：

  ```tsx
  <AccountOverviewPanel
    ...
    onOpenSecurity={() => setActiveSection('security')}
  />
  ```

- [ ] **Step 7: 运行页面测试，确认概览态新增模块与快捷动作切换通过**

  Run:

  ```bash
  pnpm --dir frontend test --run src/pages/__tests__/AccountPage.test.tsx
  ```

  Expected:
  - PASS
  - 测试覆盖欢迎横幅、新展示模块、导航切换、快捷动作跳转和旧密码流程

## Chunk 3: 收敛密码态布局并完成整体验证

### Task 3: 用最小测试约束密码态的新层次，但不改变业务行为

**Files:**
- Modify: `frontend/src/pages/__tests__/AccountPage.test.tsx`
- Modify: `frontend/src/components/account/AccountSecurityPanel.tsx`
- Optional Modify: `frontend/src/components/account/accountDesign.ts`

- [ ] **Step 1: 为密码态补一个结构断言**

  在“切到修改密码分区”的测试中补一个轻量断言，锁定新的提示模块标题，例如：

  ```tsx
  expect(screen.getByText('密码更新建议')).toBeInTheDocument();
  ```

  注意：
  - 不要删除现有 `安全设置`、`ACCOUNT SECURITY`、表单 label 等断言
  - 这一步只新增，不替换旧验证

- [ ] **Step 2: 运行页面测试，确认新断言先失败**

  Run:

  ```bash
  pnpm --dir frontend test --run src/pages/__tests__/AccountPage.test.tsx
  ```

  Expected:
  - FAIL
  - 错误集中在缺少 `密码更新建议`

- [ ] **Step 3: 重排 `AccountSecurityPanel` 布局**

  Modify: `frontend/src/components/account/AccountSecurityPanel.tsx`

  实现约束：
  - 保留现有 3 个 `AppleInput`
  - 保留原提交按钮与 loading 行为
  - 版式升级为：
    - 顶部标题区
    - 主表单区
    - 轻量提示区（标题使用 `密码更新建议`）

  提示区内容只写静态说明，不新增交互：
  - 密码长度规则
  - 修改后建议重新登录

- [ ] **Step 4: 如样式字符串重复，抽到 `accountDesign.ts`**

  Modify: `frontend/src/components/account/accountDesign.ts`

  只有在以下情况才抽常量：
  - 欢迎横幅和概览/安全面板出现重复的长串玻璃表面类
  - 移动端和桌面端布局类需要共享

  如果没有明显重复，保持 YAGNI，不要为了“看起来整洁”提前抽象。

- [ ] **Step 5: 跑定向回归测试**

  Run:

  ```bash
  pnpm --dir frontend test --run src/pages/__tests__/AccountPage.test.tsx src/components/account/__tests__/passwordValidation.test.ts
  ```

  Expected:
  - PASS
  - 页面行为和密码校验全部通过

- [ ] **Step 6: 跑类型检查**

  Run:

  ```bash
  pnpm --dir frontend check
  ```

  Expected:
  - PASS
  - 无 TypeScript 错误

- [ ] **Step 7: 做最终本地验收并准备一次性提交**

  按 `@superpowers:verification-before-completion` 的要求再次核对：
  - 欢迎横幅存在
  - 工作台骨架为“上横幅、下双栏”
  - 概览态包含 4 张核心信息卡和展示型模块
  - 快捷动作可切到密码态
  - 密码表单仍保持原有成功/失败行为

  然后执行：

  ```bash
  git status --short
  ```

  Expected:
  - 只看到本次个人中心改版相关文件
  - 仍然不提交；等用户确认“开发完成”后再统一提交

## 本地自检清单

按 `writing-plans` 审核清单，本计划需满足：
- 没有 TODO、占位或“类似于某处”的模糊描述
- 每个任务都给出明确文件路径
- 每个测试步骤都有明确命令与预期结果
- 新文件职责单一，没有把欢迎横幅、概览卡和展示模块重新揉回一个组件
- 计划可在当前代码库中独立执行，不依赖额外背景知识

## 计划完成后的执行方式

- 当前会话已具备设计文档，但用户尚未要求立刻编码
- 若开始实现，应按本计划顺序执行，优先从测试入手
- 由于用户要求“开发完成后一起提交”，实施阶段不做中间提交
