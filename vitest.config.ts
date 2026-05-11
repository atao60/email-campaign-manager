import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Native path alias resolution! No plugin needed.
    tsconfigPaths: true
  },
  test: {
    name: 'bothside',
    globals: true, // Allows using describe, it, expect without importing them (optional, but convenient)
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{ts,js,mjs,cjs,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,js,mjs,cjs,mts,cts,jsx,tsx}'],
      exclude: [
        'src/domain/ports/**',
        'src/domain/models/BrandedTypes.ts',
        'src/domain/models/QueueMetrics.ts',

        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/generated/**',

        '**/*.scss',
        '**/*.css',
        '**/*.scss?*', // Catches Vite's query params
        '**/*.css?*',

        '**/*.spec.*',
        '**/*.test.*'
      ]
    }
  }
});
