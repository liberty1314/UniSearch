# UniSearch 分支与提交规范

**版本**：v2.0
**日期**：2026-09-30
**适用范围**：架构重构 M0–M4 全阶段（单人开发）
**现状分支**：`main` / `dev` / `pre`（以 `main` 为发布基准）

---

## 1. 分支模型

```
main  ── 发布基准，受保护，只接受 PR 合并
 │
 └─ feature/M0-baseline ── M0 任务分支
 └─ feature/M1-B-01-error-model
 └─ feature/M2-B-01-config-injection
 ...
```

- **一个开发计划任务 = 一个 feature 分支**（如 `feature/M3-B-05-plugin-registry`），满足 M3"每子项独立可回滚"。
- 任务完成后向 `main` 提 PR，自审通过后合并（§4）。
- `dev` / `pre` 分支保留用于联调与预发布验证，重构期间 feature 分支可先合入 `dev` 做集成验证，再进 `main`。
- **禁止**直接向 `main` push。

## 2. 分支命名

`feature/<任务编号>-<简短英文>`，例如：

- `feature/M0-B-02-migration-baseline`
- `feature/M1-F-01-api-client`
- `feature/M2-U-02-search-results-ui`

热修：`hotfix/<issue>-<简述>`。

## 3. 提交信息规范（中文）

格式：`<类型>(<任务编号>)：<主题>`，正文说明变更点与验证结果。

类型：`feat`（新功能/重构）/ `fix`（修复）/ `docs`（文档）/ `test`（测试）/ `chore`（杂项）/ `refactor`（纯重构无行为变化）。

示例：

```
refactor(M2-B-01)：search_service 改为构造注入，移除 config.AppConfig 引用

- NewSearchService 接收 SearchConfig 接口
- 调用方 6 处更新
- 验证：go test ./service/... 全绿，real-search-smoke 通过
```

要求：
- 一个提交只做一件事；重构提交与行为变更提交分离。
- 破坏性改动在正文注明迁移/回滚步骤。

## 4. PR 自审清单（合并前必查）

- [ ] 任务验收标准（开发计划对应条目）已达成
- [ ] 新增/修改代码差异行覆盖率 ≥80%（D-4）
- [ ] `scripts/security-gate.sh` 全绿
- [ ] 破坏性改动附迁移/回滚说明
- [ ] OpenAPI 有变更时 `api/openapi/openapi.yaml` 已同步（M0-B-03 起）

## 5. 回滚

- 优先 `git revert`（保留历史），禁止 `git push --force` 到 `main`。
- 回滚后在操作日志记录原因，并按《数据备份与恢复方案》§6 检查是否需要恢复数据。

## 6. Tag 规范

- `release-candidate-M{n}`：各里程碑验证门禁通过后打 tag（如 `release-candidate-M2`）。
- `v2.0-M{n}`：里程碑正式交付。

---

## 修订记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v2.0 | 2026-09-30 | 初版：单人简化模型，一任务一分支，PR 自审清单 |
