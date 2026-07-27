/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig(() => {
  const enableLocator = process.env.VITE_ENABLE_LOCATOR === "1";
  const enableSourcemap = process.env.VITE_ENABLE_SOURCEMAP === "1";
  const backendProxyTarget = process.env.VITE_BACKEND_PROXY_TARGET || "http://localhost:8888";
  return {
    test: {
      globals: true,
      environment: "jsdom",
      // 确保 vitest 解析 React 的 development 构建，否则 @testing-library/react
      // 的 act(...) 会在 production 构建下报错。
      server: {
        deps: {
          inline: [/^react/, /^react-dom/],
        },
      },
      setupFiles: "./src/test/setup.ts",
      testTimeout: 15000,
      hookTimeout: 15000,
      exclude: [
        ...configDefaults.exclude,
        "e2e/**",
        "playwright-report/**",
        "test-results/**",
      ],
    },
    build: {
      sourcemap: enableSourcemap ? "hidden" as const : false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "react-vendor",
                test: /node_modules\/(?:react|react-dom)\//,
                priority: 40,
              },
              {
                name: "router-vendor",
                test: /node_modules\/react-router\//,
                priority: 30,
              },
              {
                name: "motion-vendor",
                test: /node_modules\/(?:framer-motion|gsap)\//,
                priority: 20,
              },
              {
                name: "radix-vendor",
                test: /node_modules\/@radix-ui\/react-(?:alert-dialog|checkbox|dialog|label|scroll-area|select|slot|tabs)\//,
                priority: 20,
              },
              {
                name: "ui-vendor",
                test: /node_modules\/(?:lucide-react|sonner|zustand|axios)\//,
                priority: 10,
              },
            ],
          },
        },
      },
    },
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {
        "/api": {
          target: backendProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react({
        babel: {
          plugins: enableLocator ? ["react-dev-locator"] : [],
        },
      }),
    ],
  };
});
