import { defineConfig } from 'vitest/config';

// Unit tests live next to the code in src/. The e2e/ folder is for Playwright.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
