import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig(() => {
  const enableLocator = process.env.VITE_ENABLE_LOCATOR === '1'
  return {
    build: {
      sourcemap: 'hidden' as const, 
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react({
        babel: {
          plugins: enableLocator ? ['react-dev-locator'] : [],
        },
      }),
      tsconfigPaths()
    ],
  }
})
