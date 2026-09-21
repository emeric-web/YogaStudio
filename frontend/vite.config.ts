import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.E2E_COVERAGE === 'true' ? [istanbul({
    include: 'src/**/*',
    exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/setupTests.ts', 'src/types/**'],
    extension: ['.ts', '.tsx'],
    requireEnv: false,
  })] : [])],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
      reportsDirectory: './coverage/frontend',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/types/**',
        'src/main.tsx',
      ],
    },
  },
  server: {
    port: 3000,
    watch: { ignored: ['**/coverage/**', '**/reports/**', '**/.nyc_output/**', '**/cypress/screenshots/**'] },
    proxy: {
      '/api': {
        target: process.env.E2E_COVERAGE === 'true' ? 'http://127.0.0.1:8082' : 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
