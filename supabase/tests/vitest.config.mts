import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['**/*.test.ts'],
    // Each file builds its own in-memory database; migrations take a few seconds.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
