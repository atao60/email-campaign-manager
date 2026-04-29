import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Native path alias resolution! No plugin needed.
    tsconfigPaths: true
  },
  test: {
    globals: true, // Allows using describe, it, expect without importing them (optional, but convenient)
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/infrastructure/antlr/generated/**', 'node_modules/**', 'dist/**', '**/*.d.ts', '**/index.ts']
    }
  }
});
