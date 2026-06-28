# UniSearch 发布门禁与依赖治理

生成时间：2026-06-27  
适用范围：正式发布、预发布环境更新、公开演示环境更新。

## 阻断规则

- 后端测试失败，阻断发布。
- `govulncheck ./...` 发现可达漏洞，阻断发布。
- 前端 lint、类型检查或单元测试失败，阻断发布。
- `pnpm audit --audit-level high` 失败，阻断发布。
- pnpm 供应链策略拒绝锁文件，例如依赖发布时间未满足 minimum release age，阻断发布。
- Docker 或 Nginx 本地工具缺失时，不视为通过；必须记录缺失原因和静态补偿验证，待具备工具后补跑。
- moderate/low 漏洞不直接阻断，但必须记录风险接受、影响面和后续处理时间。

## 标准命令

```bash
cd backend && go test ./...
cd backend && /Users/abner/go/bin/govulncheck ./...
cd frontend && pnpm lint
cd frontend && pnpm check
cd frontend && pnpm test -- --run
cd frontend && pnpm audit --audit-level high
docker compose config
docker compose -f docker-compose.prod.example.yml config
nginx -t -c "$(pwd)/nginx.conf"
```

## 工具准备

- Go 最低版本：1.25。
- Docker 后端构建镜像：`golang:1.25-alpine`。
- `govulncheck` 安装命令：

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
```

本轮验证安装结果：

```text
Go: go1.26.4
Scanner: govulncheck@v1.5.0
DB: https://vuln.go.dev
```

## 依赖治理策略

- Go 依赖漏洞以 `govulncheck` 的可达路径为准；扫描报告中的 fixed version 应作为最小升级目标。
- 前端 high/critical 漏洞必须清零；moderate/low 只允许在有明确风险接受说明时保留。
- 前端锁文件必须通过 pnpm 供应链策略校验。
- 若 npm 传递依赖刚发布且被 minimum release age 拒绝，应优先固定到已通过策略的稳定版本，不直接放宽策略。
- 当前前端通过 `.pnpmfile.cjs` 固定 `browserslist` 相关传递依赖，避免拉取发布时间过近的 `electron-to-chromium`。

## 发布记录模板

```markdown
## 发布门禁记录

- 时间：
- 版本或提交：
- 执行人：

### 命令结果
- `cd backend && go test ./...`：
- `cd backend && /Users/abner/go/bin/govulncheck ./...`：
- `cd frontend && pnpm lint`：
- `cd frontend && pnpm check`：
- `cd frontend && pnpm test -- --run`：
- `cd frontend && pnpm audit --audit-level high`：
- `docker compose config`：
- `docker compose -f docker-compose.prod.example.yml config`：
- `nginx -t -c "$(pwd)/nginx.conf"`：

### 漏洞与风险接受
- high/critical：
- moderate：
- low：
- 接受理由：
- 后续处理计划：

### 工具缺失与补偿验证
- 缺失工具：
- 补偿验证：
- 补跑计划：

### 结论
- 通过/阻断：
- 阻断原因：
```

## 本轮验证结果

时间：2026-06-27 23:40  
结论：应用代码、依赖漏洞和前端供应链门禁通过；Docker 与 Nginx 因本机工具缺失未执行原生命令，已完成静态补偿检查。

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `cd backend && go test ./...` | 通过 | 后端全包测试通过。 |
| `cd backend && /Users/abner/go/bin/govulncheck ./...` | 通过 | 可达漏洞 0；扫描另发现不可达依赖漏洞，未阻断。 |
| `cd frontend && pnpm lint` | 通过 | ESLint 无错误。 |
| `cd frontend && pnpm check` | 通过 | TypeScript 检查通过。 |
| `cd frontend && pnpm test -- --run` | 通过 | 98 个测试文件、502 个测试通过。 |
| `cd frontend && pnpm audit --audit-level high` | 通过 | 输出 `No known vulnerabilities found`。 |
| `docker compose config` | 未执行 | 本机缺少 `docker` 命令；已用 Ruby 解析 compose YAML 并静态检查生产模板未暴露 MySQL/Redis、未包含 root/root。 |
| `docker compose -f docker-compose.prod.example.yml config` | 未执行 | 本机缺少 `docker` 命令；同上使用静态补偿验证。 |
| `nginx -t -c /Users/abner/Desktop/MyProject/UniSearch-dev/nginx.conf` | 未执行 | 本机缺少 `nginx` 命令；已静态检查关键安全响应头存在。 |

本轮依赖治理处理：

- 后端将 `golang.org/x/net` 升级到 `v0.55.0`，消除 HTML 解析相关可达漏洞。
- 后端将 `github.com/golang-jwt/jwt/v5` 升级到 `v5.2.2`，消除 JWT 解析相关可达漏洞。
- 后端将 `github.com/redis/go-redis/v9` 升级到 `v9.7.3`，消除 Redis 连接建立相关可达漏洞。
- 后端 Go 最低版本提升到 1.25，并同步 Docker 后端构建镜像。
- 前端将 `eslint` 固定到 `10.0.1`，并通过 `.pnpmfile.cjs` 固定 browserslist 链路传递依赖，避免 minimum release age 策略拒绝刚发布版本。
