import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      sequential: true,
    },
  },
  resolve: {
    alias: {
      '@tbai/core': '/home/user/Testapp003/packages/tbai-core/src',
    },
  },
});
