import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: process.env.PORTFOLIO_API_PROXY_TARGET ?? 'http://127.0.0.1:8788', changeOrigin: true },
    },
    fs: {
      deny: ['**/reference/**', '**/.reference-inspection/**', '**/.env*', '**/.dev.vars*', '**/.tools/**', '**/.wrangler/**', '**/server/**', '**/functions/**', '**/migrations/**', '**/wrangler*.jsonc'],
    },
    watch: {
      ignored: ['**/test-results*/**', '**/playwright-report*/**', '**/docs/screenshots/**'],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
});
