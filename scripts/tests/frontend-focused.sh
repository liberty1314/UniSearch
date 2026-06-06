#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "== 前端聚焦测试 =="
cd "$ROOT_DIR/frontend"
./node_modules/.bin/vitest run \
  src/pages/__tests__/HotPage.test.tsx \
  src/components/admin/__tests__/AnnouncementManagement.test.tsx \
  src/components/admin/__tests__/ChannelManagementView.test.tsx \
  src/components/admin/__tests__/PluginManagementView.test.tsx \
  src/components/admin/__tests__/PluginPreviewDialog.test.tsx \
  src/routes/__tests__/AppRoutes.test.tsx \
  src/services/__tests__/searchService.test.ts \
  src/components/__tests__/SearchResults.test.tsx

echo "== 前端聚焦测试完成 =="
