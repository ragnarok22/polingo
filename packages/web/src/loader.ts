import type { TranslationCatalog, TranslationLoader } from '@polingo/core';

/**
 * Options to configure {@link WebLoader}
 */
export interface WebLoaderOptions {
  /**
   * Base URL where locale folders live. Defaults to `/locales`.
   * The loader will request `${baseUrl}/${locale}/${domain}.json`.
   */
  baseUrl?: string;
  /**
   * Custom URL builder. If provided it takes precedence over `baseUrl`.
   */
  buildUrl?: (locale: string, domain: string) => string;
  /**
   * Fetch implementation. Defaults to the global `fetch` if available.
   */
  fetch?: typeof fetch;
  /**
   * Extra options passed to `fetch`.
   */
  requestInit?: RequestInit;
  /**
   * Optional transformer to adapt custom payloads to a TranslationCatalog.
   */
  transformResponse?: (payload: unknown) => TranslationCatalog;
}

/**
 * Loader that retrieves translation catalogs over HTTP using Fetch API.
 *
 * It expects the server to return JSON compatible with {@link TranslationCatalog}.
 */
export class WebLoader implements TranslationLoader {
  private readonly buildUrlFn: (locale: string, domain: string) => string;
  private readonly fetchImpl: typeof fetch;
  private readonly requestInit?: RequestInit;
  private readonly transformResponse?: (payload: unknown) => TranslationCatalog;

  constructor(options: WebLoaderOptions = {}) {
    const {
      baseUrl = '/locales',
      buildUrl,
      fetch: fetchImpl,
      requestInit,
      transformResponse,
    } = options;

    this.buildUrlFn =
      buildUrl ??
      ((locale: string, domain: string) =>
        `${trimTrailingSlash(baseUrl)}/${locale}/${domain}.json`);

    const resolvedFetch = fetchImpl ?? getGlobalFetch();
    if (!resolvedFetch) {
      throw new Error(
        '[Polingo] Fetch API is not available. Provide a custom `fetch` implementation in WebLoader options.'
      );
    }

    this.fetchImpl = resolvedFetch;
    this.requestInit = requestInit;
    this.transformResponse = transformResponse;
  }

  /**
   * Load a translation catalog via HTTP.
   */
  async load(locale: string, domain: string): Promise<TranslationCatalog> {
    const url = this.buildUrlFn(locale, domain);
    const response = await this.fetchImpl(url, this.requestInit);

    if (!response.ok) {
      throw new Error(
        `[Polingo] Failed to load catalog "${domain}" for locale "${locale}" (${response.status} ${response.statusText})`
      );
    }

    const payload = (await response.json()) as unknown;
    const transformed = this.transformResponse?.(payload) ?? payload;

    return assertCatalog(transformed);
  }
}

/**
 * Ensure the provided value matches TranslationCatalog shape.
 */
function assertCatalog(value: unknown): TranslationCatalog {
  if (!value || typeof value !== 'object') {
    throw new Error('[Polingo] Invalid translation catalog payload (expected object)');
  }

  const candidate = value as Partial<TranslationCatalog>;

  if (!candidate.translations || typeof candidate.translations !== 'object') {
    throw new Error('[Polingo] Invalid translation catalog payload (missing translations map)');
  }

  const headers =
    typeof candidate.headers === 'object' && candidate.headers !== null
      ? normalizeHeaders(candidate.headers)
      : {};

  return {
    charset: typeof candidate.charset === 'string' ? candidate.charset : 'utf-8',
    headers,
    translations: candidate.translations,
  };
}

function trimTrailingSlash(input: string): string {
  return input.endsWith('/') ? input.slice(0, -1) : input;
}

function getGlobalFetch(): typeof fetch | undefined {
  return typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined;
}

function normalizeHeaders(headers: object): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key] = value;
    }
  }
  return normalized;
}
