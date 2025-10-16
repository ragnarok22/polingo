import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';

const isCI = Boolean(process.env.CI && process.env.CI !== '0');
const junitOutputFile = isCI
  ? resolve(process.cwd(), 'test-report.junit.xml')
  : undefined;

if (junitOutputFile) {
  mkdirSync(dirname(junitOutputFile), { recursive: true });
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    reporters: isCI ? ['default', 'junit'] : ['default'],
    outputFile: junitOutputFile ? { junit: junitOutputFile } : undefined,
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
      '@polingo/vue': resolve(__dirname, './packages/vue/src'),
    },
  },
});
