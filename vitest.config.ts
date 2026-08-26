import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
    // O caminho e2e é do Playwright: ele sobe o app inteiro, não roda em processo.
    exclude: ['tests/e2e/**', 'node_modules/**'],
    restoreMocks: true
  }
});
