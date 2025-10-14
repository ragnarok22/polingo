import { Translator } from '@polingo/core';
import type { CreatePolingoOptions, PolingoInstance } from './create';
import { createPolingo } from './create';

/**
 * Middleware configuration options
 */
export interface MiddlewareOptions extends Omit<CreatePolingoOptions, 'locale'> {
  /** Function to extract locale from request (default: reads Accept-Language header) */
  localeExtractor?: (req: any) => string;
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
    req: any,
    res: any,
    next: () => void
  ): Promise<void> {
    // Wait for initialization
    await initPromise;

    // Extract locale from request
    const locale = localeExtractor(req);

    // Validate locale
    if (!locales.includes(locale)) {
      if (debug) {
        console.warn(`[Polingo] Invalid locale "${locale}", using fallback "${fallback}"`);
      }
    }

    if (perLocale) {
      // Get or create translator for this locale
      let translator = translators.get(locale);
      if (!translator) {
        translator = await createPolingo({
          locale,
          locales,
          directory,
          fallback,
          domain,
          cache,
          watch,
          debug,
        });
        translators.set(locale, translator);
      }
      req.polingo = translator;
    } else {
      // Use shared translator and change locale
      if (sharedTranslator) {
        await sharedTranslator.setLocale(locale);
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
function defaultLocaleExtractor(req: any): string {
  // Try query parameter first
  if (req.query?.locale) {
    return req.query.locale;
  }

  // Try Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "es-ES,es;q=0.9,en;q=0.8")
    const parts = acceptLanguage.split(',');
    if (parts.length > 0) {
      const firstLang = parts[0].split(';')[0].split('-')[0].trim();
      return firstLang;
    }
  }

  return 'en';
}
