import { Translator } from '@polingo/core';
import type { CreatePolingoOptions, PolingoInstance } from './create';
import { createPolingo } from './create';

/**
 * Middleware configuration options
 */
export interface MiddlewareOptions extends Omit<CreatePolingoOptions, 'locale'> {
  /** Function to extract locale from request (default: reads Accept-Language header) */
  localeExtractor?: (req: RequestLike) => string;
  /** Store translator instances per locale (default: false, uses single instance) */
  perLocale?: boolean;
}

/**
 * Request with polingo instance attached
 */
export interface PolingoRequest {
  polingo: Translator;
}

/**
 * Request-like object with common properties
 */
interface RequestLike {
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

/**
 * Response-like object
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ResponseLike {}

/**
 * Express/Fastify middleware for Polingo
 *
 * Attaches a translator instance to each request based on the locale.
 *
 * @param options - Middleware configuration
 * @returns Express/Fastify middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { polingoMiddleware } from '@polingo/node';
 *
 * const app = express();
 *
 * app.use(polingoMiddleware({
 *   directory: './locales',
 *   locales: ['es', 'en', 'fr'],
 *   fallback: 'en',
 * }));
 *
 * app.get('/', (req, res) => {
 *   res.send(req.polingo.t('Welcome'));
 * });
 * ```
 */
export function polingoMiddleware(options: MiddlewareOptions) {
  const {
    locales,
    directory,
    fallback = 'en',
    domain = 'messages',
    cache = true,
    watch = false,
    debug = false,
    localeExtractor = defaultLocaleExtractor,
    perLocale = false,
  } = options;

  // Store translator instances
  const translators = new Map<string, PolingoInstance>();
  let sharedTranslator: PolingoInstance | null = null;

  // Initialize shared translator if not per-locale
  const initPromise = perLocale
    ? Promise.resolve()
    : createPolingo({
        locale: fallback,
        locales,
        directory,
        fallback,
        domain,
        cache,
        watch,
        debug,
      }).then((t) => {
        sharedTranslator = t;
      });

  return async function polingoMiddlewareHandler(
    req: RequestLike & Partial<PolingoRequest>,
    res: ResponseLike,
    next: () => void
  ): Promise<void> {
    // Wait for initialization
    await initPromise;

    // Extract locale from request
    const requestedLocale = localeExtractor(req);
    const isSupportedLocale =
      typeof requestedLocale === 'string' && locales.includes(requestedLocale);
    const effectiveLocale = isSupportedLocale ? requestedLocale : fallback;

    if (!isSupportedLocale && debug && requestedLocale) {
      console.warn(`[Polingo] Invalid locale "${requestedLocale}", using fallback "${fallback}"`);
    }

    if (perLocale) {
      // Get or create translator for this locale
      let translator = translators.get(effectiveLocale);
      if (!translator) {
        translator = await createPolingo({
          locale: effectiveLocale,
          locales,
          directory,
          fallback,
          domain,
          cache,
          watch,
          debug,
        });
        translators.set(effectiveLocale, translator);
      }
      req.polingo = translator;
    } else {
      // Use shared translator and change locale
      if (sharedTranslator) {
        await sharedTranslator.setLocale(effectiveLocale);
        req.polingo = sharedTranslator;
      }
    }

    next();
  };
}

/**
 * Default locale extractor that reads the Accept-Language header
 *
 * @param req - Request object
 * @returns Detected locale or 'en'
 */
function defaultLocaleExtractor(req: RequestLike): string {
  // Try query parameter first
  const queryLocale = req.query?.locale;
  if (typeof queryLocale === 'string') {
    return queryLocale;
  }

  // Try Accept-Language header
  const acceptLanguage = req.headers?.['accept-language'];
  if (typeof acceptLanguage === 'string') {
    // Parse Accept-Language header (e.g., "es-ES,es;q=0.9,en;q=0.8")
    const parts = acceptLanguage.split(',');
    if (parts.length > 0) {
      const firstPart = parts[0];
      if (firstPart) {
        const splitByQuality = firstPart.split(';')[0];
        if (splitByQuality) {
          const splitByRegion = splitByQuality.split('-')[0];
          if (splitByRegion) {
            return splitByRegion.trim();
          }
        }
      }
    }
  }

  return 'en';
}
