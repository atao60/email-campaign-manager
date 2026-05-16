/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';
import { normalizePath } from 'vite';
import litCss from 'vite-plugin-lit-css';
import path from 'node:path';

// Resolve the absolute path to the locales folder
// then normalize it (required by vite-plugin-static-copy for Windows support)
const rootLocalesDir = normalizePath(path.resolve(import.meta.dirname, '..', 'locales'));

export default defineConfig({
  plugins: [
    litCss({ include: '**/*.scss' }),
    viteStaticCopy({
      targets: [
        {
          src: rootLocalesDir,
          // Place the whole 'locales' folder directly at the root of the dev server
          dest: ''
        }
      ]
    }),
    visualizer({ open: true, filename: 'bundle-stats.html' })
  ],
  resolve: {
    tsconfigPaths: true
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      // Security feature: allow Vite's dev server to read files from the parent directory
      allow: ['..']
    }
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
