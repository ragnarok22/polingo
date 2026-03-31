import { defineConfig } from 'tsup';
import { withBaseConfig } from '../../tsup.config.shared';

export default defineConfig(
  withBaseConfig([
    {
      entry: {
        index: 'src/index.ts',
      },
      sourcemap: false,
      target: 'node22',
      shims: false,
      outDir: 'dist',
    },
    {
      entry: {
        cli: 'src/cli.ts',
      },
      platform: 'node',
      format: ['esm'],
      dts: false,
      sourcemap: false,
      clean: false,
      target: 'node22',
      shims: false,
      outDir: 'dist',
      banner: {
        js: '#!/usr/bin/env node',
      },
    },
    {
      entry: {
        cli: 'src/index.ts',
      },
      platform: 'node',
      noExternal: ['gettext-parser', 'fastest-levenshtein'],
      format: ['cjs'],
      dts: false,
      sourcemap: false,
      clean: false,
      target: 'node22',
      shims: true,
      outDir: 'dist',
    },
  ])
);
