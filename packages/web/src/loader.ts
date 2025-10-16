import type { TranslationCatalog, TranslationLoader, Translation } from '@polingo/core';

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

  if (!isPlainObject(candidate.translations)) {
    throw new Error('[Polingo] Invalid translation catalog payload (missing translations map)');
  }

  const safeTranslations: TranslationCatalog['translations'] = Object.create(
    null
  ) as TranslationCatalog['translations'];

  for (const [contextKey, contextValue] of Object.entries(candidate.translations)) {
    if (!isPlainObject(contextValue)) {
      throw new Error(
        `[Polingo] Invalid translation context payload for "${contextKey}" (expected object)`
      );
    }

    const safeContext: Record<string, Translation> = Object.create(
      null
    ) as Record<string, Translation>;

    for (const [msgidKey, rawTranslation] of Object.entries(contextValue)) {
      if (!isPlainObject(rawTranslation)) {
        throw new Error(
          `[Polingo] Invalid translation entry for "${msgidKey}" in context "${contextKey}"`
        );
      }

      safeContext[msgidKey] = normalizeTranslation(
        msgidKey,
        rawTranslation as Record<string, unknown>
      );
    }

    safeTranslations[contextKey] = safeContext;
  }

  const headers =
    typeof candidate.headers === 'object' && candidate.headers !== null
      ? normalizeHeaders(candidate.headers)
      : {};

  return {
    charset: typeof candidate.charset === 'string' ? candidate.charset : 'utf-8',
    headers,
    translations: safeTranslations,
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === null || prototype === Object.prototype;
}

function normalizeTranslation(msgidKey: string, raw: Record<string, unknown>): Translation {
  const rawMsgid = raw.msgid;
  const msgid = typeof rawMsgid === 'string' ? rawMsgid : msgidKey;
  const msgctxt = raw.msgctxt;
  const msgidPlural = raw.msgid_plural;
  const msgstrRaw = raw.msgstr;

  let msgstr: string | string[];
  if (Array.isArray(msgstrRaw)) {
    if (!msgstrRaw.every((entry): entry is string => typeof entry === 'string')) {
      throw new Error(`[Polingo] Invalid msgstr array for "${msgidKey}"`);
    }
    msgstr = msgstrRaw;
  } else if (typeof msgstrRaw === 'string') {
    msgstr = msgstrRaw;
  } else {
    throw new Error(`[Polingo] Invalid msgstr for "${msgidKey}"`);
  }

  const translation: Translation = {
    msgid,
    msgstr,
  };

  if (msgctxt !== undefined) {
    if (typeof msgctxt !== 'string') {
      throw new Error(`[Polingo] Invalid msgctxt for "${msgidKey}"`);
    }
    translation.msgctxt = msgctxt;
  }

  if (msgidPlural !== undefined) {
    if (typeof msgidPlural !== 'string') {
      throw new Error(`[Polingo] Invalid msgid_plural for "${msgidKey}"`);
    }
    translation.msgid_plural = msgidPlural;
    if (!Array.isArray(translation.msgstr)) {
      throw new Error(`[Polingo] Plural entry requires msgstr array for "${msgidKey}"`);
    }
  }

  return translation;
}
