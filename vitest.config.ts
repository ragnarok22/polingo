import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/test/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@polingo/core': resolve(__dirname, './packages/core/src'),
      '@polingo/web': resolve(__dirname, './packages/web/src'),
      '@polingo/react': resolve(__dirname, './packages/react/src'),
    },
  },
});
