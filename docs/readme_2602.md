# UniSearch 开发日志 - 2026年2月

---

## 2026-02-02 00:06:28

**Commit**: `docs(deploy): 完善部署脚本和插件开发文档`

**改动说明**:
- 将文档中的 PanSou 品牌名称统一更新为 UniSearch
- 重构 build.sh 脚本，新增交互式菜单和多架构构建支持
- 优化 deploy.sh 脚本，新增数据库密码配置和连接验证功能
- 支持 linux/amd64 和 linux/arm64 双架构镜像构建
- 新增本地测试环境自动化流程

**涉及文件**:
- Dockerfile
- README.md
- backend/Dockerfile
- docs/插件开发指南.md
- scripts/build.sh
- scripts/deploy.sh
- deploy/README.md
- deploy/docker-compose.prod.yml
- deploy/env.prod

---

## 2026-02-03 17:30:00

**Commit**: `feat(ui): 重构系统缓存并优化前端界面`

**改动说明**:
- 前端：为 AppleCard、AppleTable 等组件新增暗黑模式样式适配
- 前端：统一登录成功提示信息为"登录成功，欢迎访问 UniSearch！"
- 前端：新增 API Key 的 is_permanent 和 is_unlimited 字段类型定义
- 后端：新增高级缓存系统（自适应调优、预测模型、性能分析等模块）
- 后端：新增缓存集成服务 cache_integration.go
- 后端：新增 refresh_token 和 secret 数据模型及相关服务
- 部署：删除旧的 deploy.sh 脚本，新增部署文档和 Docker Compose 配置
- 配置：更新环境变量示例和 .gitignore 规则

**涉及文件**:
- frontend/src/components/ui/AppleCard.tsx
- frontend/src/components/AppleTable.tsx
- frontend/src/components/admin/AppleApiKeyTable.tsx
- frontend/src/pages/AdminLogin.tsx
- frontend/src/pages/UserAuth.tsx
- frontend/src/types/api.ts
- backend/util/cache/* (多个新增缓存模块)
- backend/service/cache_integration.go
- backend/model/refresh_token.go
- backend/model/secret.go
- backend/service/refresh_token_service.go
- backend/service/secret_manager*.go
- deploy/* (新增部署配置)
- scripts/deploy.sh (删除)
- .env.example, .gitignore
