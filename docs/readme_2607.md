- [2026-07-04 10:59] feat(search): 实现搜索插件自适应超时调整与降级机制
  - Body: 引入自适应超时感知和降级策略，根据插件历史健康状况与平均耗时动态调整超时时间，并补充监控日志、部署指南和效果验证脚本，以优化并发搜索场景下的性能与稳定性。
  - Files:
    - IMPLEMENTATION_SUMMARY.md
    - QUICK_REFERENCE.md
    - backend/plugin/baseasyncplugin.go
    - backend/service/search_adaptive_timeout.go
    - backend/service/search_executor.go
    - backend/service/search_progressive.go
    - docs/deployment-optimization-guide.md
    - docs/plugin-timeout-solution.md
    - docs/readme_2607.md
    - scripts/verify-optimization.sh
[2026-07-04 20:59] feat(plugin-health): 完善插件健康服务的错误处理和日志记录
  Body: 更新插件健康服务，实现更稳健的错误处理并记录关键操作。
  Files:
    - backend/model/plugin_health_status.go
    - backend/service/plugin_health_service.go
    - backend/service/plugin_health_service_test.go

[2026-07-04 21:51] feat(plugin-metrics): 新增插件性能指标采集与查询接口
  Body: 新增插件性能指标采集器、持久化模型和后台查询接口，并将指标记录接入搜索执行流程。同步补充处理器与采集器测试，以及插件监控与优化方案文档。
  Files:
    - .env.example
    - backend/api/plugin_metrics_handler.go
    - backend/api/plugin_metrics_handler_test.go
    - backend/api/router_admin.go
    - backend/api/router_deps.go
    - backend/cmd/bootstrap/app.go
    - backend/cmd/bootstrap/server.go
    - backend/database/migration.go
    - backend/model/plugin_health_status.go
    - backend/model/plugin_metrics.go
    - backend/service/plugin_health_service.go
    - backend/service/plugin_metrics_collector.go
    - backend/service/plugin_metrics_collector_test.go
    - backend/service/search_executor.go
    - backend/service/search_executor_test.go
    - backend/service/search_progressive.go
    - backend/service/search_service.go
    - docs/deployment-optimization-guide.md
    - docs/plugin-development-plan.md
    - docs/plugin-timeout-solution.md
    - docs/plugin.md
    - docs/readme_2607.md
