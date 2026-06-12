# 认证 Token 存储迁移第一阶段说明

生成时间：2026-06-13

## 1. 背景

当前认证体系同时使用 `access token` 和 `refresh token`：

- `access token`：用于携带用户身份并访问业务接口
- `refresh token`：用于在访问令牌失效后自动刷新会话

历史实现会将两者都持久化到 `localStorage`。这会导致一旦前端运行环境受到脚本注入影响，两个令牌都会暴露，恢复成本较高。

## 2. 第一阶段目标

在不打断现有登录、刷新和登出体验的前提下，先降低 `access token` 的持久化暴露面：

1. `access token` 只保留在内存态，不再写入 `localStorage`
2. `refresh token` 继续保留为当前阶段的持久化恢复凭据
3. 页面刷新后，如果仍有 `refresh token`，前端自动恢复访问令牌
4. 未勾选“记住我”的会话在刷新页面后不再被错误地视为持久登录

## 3. 本阶段已落地实现

### 3.1 状态存储收敛

文件：`frontend/src/stores/authStore.ts`

- `persist` 持久化内容中移除了 `token`
- 仅在存在 `refreshToken` 时，才持久化：
  - `refreshToken`
  - `username`
  - `isAuthenticated`
  - `isAdmin`

效果：

- 纯 access token 会话只在当前标签页内有效
- 记住我会话仍可在页面刷新后恢复

### 3.2 刷新恢复兼容

文件：

- `frontend/src/hooks/useAutoRefreshToken.ts`
- `frontend/src/stores/searchAccessStore.ts`

行为：

- 当 `token` 为空但 `refreshToken` 存在时，应用启动后会自动尝试刷新
- 搜索权限状态判断已兼容“正在通过 refresh token 恢复 access token”的会话

## 4. 本阶段未改动内容

以下内容保留到后续阶段：

- `refresh token` 迁移到 `httpOnly Cookie`
- `/api/auth/refresh` 改为基于 Cookie 自动发送，不再由前端 JS 读取
- `CORS` 与 `SameSite` 策略同步收敛
- 服务端会话撤销与跨设备清理策略增强

## 5. 下一阶段建议

### 阶段二：Cookie 迁移预备

目标：

- 后端为 refresh token 增加 `Set-Cookie` 能力
- 前端刷新接口去掉显式 `refresh_token` 请求体依赖
- 明确跨域部署时的 `Secure`、`SameSite`、代理转发策略

### 阶段三：彻底收口

目标：

- 前端不再持久化任何敏感 token
- `access token` 仅驻留内存
- `refresh token` 仅由浏览器 Cookie 管理

## 6. 回滚方案

如果第一阶段导致异常恢复率上升，可按以下顺序回滚：

1. 恢复 `authStore` 对 `token` 的持久化
2. 保留现有 `refresh token` 自动刷新逻辑不变
3. 继续使用当前登录与登出接口，不影响后端契约

## 7. 验证结果

已覆盖的本地验证：

- `src/stores/__tests__/authStore.test.ts`
  - 验证 `access token` 不再落盘
  - 验证无 remember me 的会话不会被持久化为登录态
- `src/stores/__tests__/searchAccessStore.test.ts`
  - 验证仅凭 `refresh token` 的恢复态仍会被识别为认证会话

## 8. 结论

第一阶段已经把最容易暴露的 `access token` 从持久化存储中拿掉，同时保留了 refresh 恢复能力，属于低风险、可回滚、可继续迭代的收敛步骤。
