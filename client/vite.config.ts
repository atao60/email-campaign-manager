/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import litCss from 'vite-plugin-lit-css';

export default defineConfig({
  plugins: [litCss({ include: '**/*.scss' })],
  resolve: {
    tsconfigPaths: true
  },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    target: 'esnext'
  },
  test: {
    name: 'frontend',
    globals: true,
    environment: 'jsdom',
    coverage: {
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/index.ts']
    }
  }
});
