/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
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
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            "router-vendor": ["react-router-dom"],
            "motion-vendor": ["framer-motion", "gsap"],
            "radix-vendor": [
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-dialog",
              "@radix-ui/react-label",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-select",
              "@radix-ui/react-slot",
              "@radix-ui/react-tabs",
            ],
            "ui-vendor": [
              "lucide-react",
              "sonner",
              "zustand",
              "axios",
            ],
          },
        },
      },
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
      tsconfigPaths(),
    ],
  };
});
