import type { Options } from 'tsup';

const baseConfig: Partial<Options> = {
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: [],
};

const mergeWithBase = (options: Options): Options => {
  const external = Array.from(
    new Set([...(baseConfig.external ?? []), ...(options.external ?? [])]),
  );

  return {
    ...baseConfig,
    ...options,
    external,
  };
};

export const withBaseConfig = (options: Options | Options[]): Options | Options[] =>
  Array.isArray(options) ? options.map(mergeWithBase) : mergeWithBase(options);
