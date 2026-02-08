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

## 2026-02-05 20:00:20

**Commit**: `feat(deploy): 完善生产环境部署脚本并优化系统设置服务`

**改动说明**:
- 新增 deploy.sh 生产环境部署脚本，支持完整的部署流程（环境检查、SSL 配置、Docker Compose 生成、服务编排、健康检查等）
- 优化 build.sh 构建脚本，增强错误处理和日志输出
- 修复 systemSettingsService.ts 中的类型定义和 API 调用逻辑

**涉及文件**:
- scripts/deploy.sh (新增)
- scripts/build.sh (修改)
- frontend/src/services/systemSettingsService.ts (修改)


## 2026-02-06 11:01:10

**Commit**: `refactor(scripts): 整合部署脚本并移除独立的监控和SSL管理脚本`

**改动说明**:
- 将原本分散的 monitor.sh 和 ssl.sh 功能整合到统一的 deploy.sh 部署脚本中，简化运维流程
- 更新了 Nginx 配置文件以适配新的部署架构
- 删除独立的监控服务管理脚本（monitor.sh）
- 删除独立的 SSL 证书管理脚本（ssl.sh）

**涉及文件**:
- deploy/nginx/nginx.conf (修改)
- scripts/deploy.sh (修改)
- scripts/monitor.sh (删除)
- scripts/ssl.sh (删除)

---

## 2026-02-08 16:27:45

**Commit**: `refactor(admin): 简化 API Key 创建和批量操作对话框`

**改动说明**:
简化前端 API Key 管理界面，移除单个创建对话框中的批量生成功能，优化批量删除流程，并为批量创建对话框新增自定义复制格式功能。

**主要改动**:
1. **CreateKeyDialog**: 移除批量生成 Tab，专注于单个 Key 创建
2. **BatchDeleteKeysDialog**: 简化删除流程，移除结果展示对话框，直接使用 toast 提示
3. **BatchCreateDialog**: 新增自定义复制格式功能，支持 `{key}` 占位符
4. **PageLoader**: 优化 Logo 显示，使用图片替代渐变背景
5. **API 文档**: 更新批量操作接口文档，调整返回字段说明

**涉及文件**:
- backend/api/admin_handler.go
- docs/api_reference.md
- frontend/src/components/CreateKeyDialog.tsx
- frontend/src/components/PageLoader.tsx
- frontend/src/components/admin/BatchCreateDialog.tsx
- frontend/src/components/admin/BatchDeleteKeysDialog.tsx
