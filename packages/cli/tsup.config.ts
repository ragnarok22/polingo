import { defineConfig } from 'tsup';
import { withBaseConfig } from '../../tsup.config.shared';

export default defineConfig(
  withBaseConfig([
    {
      entry: {
        index: 'src/index.ts',
      },
      sourcemap: false,
      target: 'node18',
      shims: false,
      outDir: 'dist',
    },
    {
      entry: {
        cli: 'src/cli.ts',
      },
      format: ['esm'],
      dts: false,
      sourcemap: false,
      clean: false,
      target: 'node18',
      shims: false,
      outDir: 'dist',
      banner: {
        js: '#!/usr/bin/env node',
      },
    },
  ])
);
