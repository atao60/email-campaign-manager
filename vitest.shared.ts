import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared',
    globals: true, // Allows using describe, it, expect without importing them (optional, but convenient)
    isolate: true,
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{ts,js,mjs,cjs,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,js,mjs,cjs,mts,cts,jsx,tsx}'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',

        '**/*.spec.*',
        '**/*.test.*',
        '**/*.scss',
        '**/*.css',
        '**/*.scss?*',
        '**/*.css?*'
      ]
    }
  }
});
