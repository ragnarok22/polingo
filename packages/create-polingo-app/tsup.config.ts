import { defineConfig } from 'tsup';
import { withBaseConfig } from '../../tsup.config.shared';

export default defineConfig(
  withBaseConfig({
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: false,
    target: 'node18',
    shims: false,
    splitting: false,
    clean: true,
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  })
);
