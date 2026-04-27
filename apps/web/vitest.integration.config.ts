import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      fileParallelism: false,
      include: [
        'tests/integration/**/*.test.ts',
        'tests/integration/**/*.test.tsx',
      ],
    },
  }),
);
