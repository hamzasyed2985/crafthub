import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // End-to-end API tests against a running CraftHub stack (Postgres + API).
    include: ['tests/e2e/**/*.e2e.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    reporters: ['verbose'],
  },
});
