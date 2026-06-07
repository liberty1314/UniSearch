#!/usr/bin/env bash

require_docker_daemon() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "缺少 docker，无法执行需要容器的验证" >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker 守护进程不可用，请先启动 Docker Desktop 或 OrbStack 后重试" >&2
    exit 1
  fi
}
