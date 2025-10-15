import { defineConfig } from 'tsup';
import { withBaseConfig } from '../../tsup.config.shared';

export default defineConfig(
  withBaseConfig({
    entry: ['src/index.ts'],
    external: ['vue', '@polingo/core', '@polingo/web'],
  })
);
