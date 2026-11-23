import { defineConfig } from 'vitest/config';

// Suite de interfaz (Playwright + Chromium): se corre aparte con `npm run test:ui` (DD-30).
export default defineConfig({
  test: {
    include: ['tests/ui/**/*.ui.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
