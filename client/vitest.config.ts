import { defineConfig, mergeConfig } from 'vitest/config';

import sharedConfig from '../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'client',
      environment: 'jsdom', // FUTURE try happy-dom
      coverage: {
        // You can also enforce exclusions here to be safe
        exclude: ['**/*.scss', '**/*.css']
      }
    }
  })
);
