import { NoCache, Translator } from '@polingo/core';
import type { PolingoConfig } from '@polingo/core';
import { LocalStorageCache, type LocalStorageCacheOptions } from './cache';
import { WebLoader, type WebLoaderOptions } from './loader';

/**
 * Options to create a browser-friendly Polingo translator.
 */
export interface CreatePolingoOptions {
  /** Initial locale (e.g., 'en') */
  locale: string;
  /** Locales to preload during initialization */
  locales: string[];
  /** Loader configuration (base URL, custom fetch, etc.) */
  loader?: WebLoaderOptions;
  /** Fallback locale when a message is missing (default: 'en') */
  fallback?: string;
  /** Translation domain (defaults to 'messages') */
  domain?: string;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Enable caching in localStorage (default: true) */
  cache?: boolean;
  /**
   * Extra cache configuration.
   * Use `cacheOptions.cacheKey` to invalidate the cache when translations change.
   *
   * @example
   * // During development, use a version string or timestamp
   * cacheOptions: { cacheKey: '2024-10-20' }
   *
   * // In production, use your app version or build number
   * cacheOptions: { cacheKey: process.env.VITE_APP_VERSION }
   */
  cacheOptions?: LocalStorageCacheOptions;
}

export type WebPolingoInstance = Translator;

/**
 * Create a Polingo translator configured for browser usage.
 *
 * ```typescript
 * const polingo = await createPolingo({
 *   locale: 'es',
 *   locales: ['es', 'en'],
 *   // loader.baseUrl defaults to '/i18n' if not specified
 * });
 *
 * polingo.t('Hello'); // => "Hola"
 * ```
 */
export async function createPolingo(options: CreatePolingoOptions): Promise<WebPolingoInstance> {
  const {
    locale,
    locales,
    loader: loaderOptions = {},
    fallback = 'en',
    domain = 'messages',
    debug = false,
    cache = true,
    cacheOptions,
  } = options;

  if (!Array.isArray(locales) || locales.length === 0) {
    throw new Error('[Polingo] createPolingo requires at least one locale to preload.');
  }

  const loader = new WebLoader({
    baseUrl: loaderOptions.baseUrl,
    buildUrl: loaderOptions.buildUrl,
    fetch: loaderOptions.fetch,
    requestInit: loaderOptions.requestInit,
    transformResponse: loaderOptions.transformResponse,
  });

  const derivedCacheKey = cacheOptions?.cacheKey ?? inferCacheKey(loaderOptions);
  const cacheInstance = cache
    ? new LocalStorageCache({
        ...cacheOptions,
        ...(derivedCacheKey !== undefined ? { cacheKey: derivedCacheKey } : {}),
      })
    : new NoCache();

  const translator = new Translator(loader, cacheInstance, {
    locale,
    fallback,
    domain,
    debug,
  } satisfies PolingoConfig);

  const uniqueLocales = Array.from(
    new Set(
      locales.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    )
  );

  await translator.load(uniqueLocales);

  return translator;
}

function inferCacheKey(options?: WebLoaderOptions): string | undefined {
  if (!options) {
    return '/i18n';
  }

  if (typeof options.buildUrl === 'function') {
    if (typeof options.baseUrl === 'string' && options.baseUrl.trim() !== '') {
      return normalizeBaseUrl(options.baseUrl);
    }
    return `build:${options.buildUrl.toString()}`;
  }

  if (typeof options.baseUrl === 'string' && options.baseUrl.trim() !== '') {
    return normalizeBaseUrl(options.baseUrl);
  }

  return '/i18n';
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return '/i18n';
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}
