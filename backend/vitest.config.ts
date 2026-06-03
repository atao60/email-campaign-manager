import { defineConfig, mergeConfig } from 'vitest/config';

import sharedConfig from '../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    resolve: {
      // Native path alias resolution! No plugin needed.
      tsconfigPaths: true
    },
    test: {
      name: 'backend',
      environment: 'node',
      exclude: [
        'src/domain/ports/**',
        'src/domain/models/BrandedTypes.ts',
        'src/domain/models/QueueMetrics.ts',

        '**/generated/**'
      ]
    }
  })
);
