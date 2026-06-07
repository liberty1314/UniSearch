/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig(() => {
  const enableLocator = process.env.VITE_ENABLE_LOCATOR === "1";
  const enableSourcemap = process.env.VITE_ENABLE_SOURCEMAP === "1";
  return {
    test: {
      globals: true,
      environment: "jsdom",
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
            "forms-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "ui-vendor": [
              "lucide-react",
              "sonner",
              "zustand",
              "axios",
              "date-fns",
            ],
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8888",
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
