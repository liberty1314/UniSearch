# 2026年05月 开发日志

## [2026-05-01 11:36:09] refactor(deploy): 重构单容器部署并完善 Zeabur 教程
- **Body**: 将部署形态收敛为单容器 Nginx + Go API，补充 Zeabur 部署文档与环境变量示例，并清理旧的分散式部署脚本与配置。
- **Files**:
  - `.Codex/operations-log.md`
  - `Dockerfile`
  - `README.md`
  - `backend/.env.example`
  - `backend/Dockerfile`
  - `backend/database/connection.go`
  - `deploy/nginx/nginx.conf`
  - `deploy/nginx/nginx.conf.template`
  - `docker-compose.yml`
  - `docs/zeabur-deploy.md`
  - `frontend/Dockerfile`
  - `nginx.conf`
  - `scripts/sync-production-config.sh`
  - `supervisord.conf`

## [2026-05-01 12:06:39] refactor(deploy): 调整插件加载默认行为
- **Body**: 修正 `ENABLED_PLUGINS` 的默认语义，区分“未设置”与“显式为空”，避免 Zeabur 环境下因为变量缺省导致插件未加载。
- **Files**:
  - `README.md`
  - `backend/plugin/plugin.go`
  - `docs/zeabur-deploy.md`
