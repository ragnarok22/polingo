import type {
  PolingoConfig,
  TranslationCache,
  TranslationCatalog,
  TranslationLoader,
} from './types';
import { interpolate } from './interpolator';
import { getPluralIndex } from './plurals';

/**
 * Main translation class
 *
 * Provides synchronous translation methods after async catalog loading
 */
export class Translator {
  private locale: string;
  private fallback: string;
  private domain: string;
  private debug: boolean;
  private loader: TranslationLoader;
  private cache: TranslationCache;
  private catalogs: Map<string, TranslationCatalog>;

  /**
   * Creates a new Translator instance
   *
   * @param loader - Translation loader implementation
   * @param cache - Cache implementation
   * @param config - Configuration options
   */
  constructor(loader: TranslationLoader, cache: TranslationCache, config: PolingoConfig) {
    this.loader = loader;
    this.cache = cache;
    this.locale = config.locale;
    this.fallback = config.fallback ?? 'en';
    this.domain = config.domain ?? 'messages';
    this.debug = config.debug ?? false;
    this.catalogs = new Map();
  }

  /**
   * Load translation catalogs for one or more locales
   *
   * This is an async operation that should be called once at startup
   *
   * @param locales - Locale code(s) to load
   * @throws Error if loading fails
   */
  async load(locales: string | string[]): Promise<void> {
    const localeArray = Array.isArray(locales) ? locales : [locales];

    for (const locale of localeArray) {
      const key = `${locale}:${this.domain}`;

      // Check cache first
      const cached = this.cache.get(key);
      if (cached) {
        this.catalogs.set(key, cached);
        if (this.debug) {
          console.log(`[Polingo] Loaded catalog from cache: ${key}`);
        }
        continue;
      }

      // Load from loader
      try {
        const catalog = await this.loader.load(locale, this.domain);
        this.catalogs.set(key, catalog);
        this.cache.set(key, catalog);

        if (this.debug) {
          console.log(`[Polingo] Loaded catalog: ${key}`);
        }
      } catch (error) {
        if (this.debug) {
          console.warn(`[Polingo] Failed to load catalog: ${key}`, error);
        }
        throw new Error(
          `Failed to load catalog for locale "${locale}" and domain "${this.domain}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Change the current locale
   *
   * If the locale is not loaded, it will be loaded automatically
   *
   * @param locale - New locale code
   */
  async setLocale(locale: string): Promise<void> {
    if (!this.hasLocale(locale)) {
      await this.load(locale);
    }
    this.locale = locale;

    if (this.debug) {
      console.log(`[Polingo] Locale changed to: ${locale}`);
    }
  }

  /**
   * Get the current locale
   *
   * @returns Current locale code
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Check if a locale is loaded
   *
   * @param locale - Locale code to check
   * @returns true if loaded, false otherwise
   */
  hasLocale(locale: string): boolean {
    const key = `${locale}:${this.domain}`;
    return this.catalogs.has(key);
  }

  /**
   * Translate a message
   *
   * @param msgid - Message ID (original text)
   * @param vars - Variables to interpolate
   * @returns Translated text
   *
   * @example
   * t('Hello') // "Hola"
   * t('Hello, {name}!', { name: 'Juan' }) // "�Hola, Juan!"
   */
  t(msgid: string, vars?: Record<string, string | number>): string {
    return this.translate(msgid, '', vars);
  }

  /**
   * Translate a message with context
   *
   * Context helps differentiate between identical strings with different meanings
   *
   * @param context - Message context
   * @param msgid - Message ID (original text)
   * @param vars - Variables to interpolate
   * @returns Translated text
   *
   * @example
   * tp('menu', 'File') // "Archivo"
   * tp('verb', 'File') // "Archivar"
   */
  tp(context: string, msgid: string, vars?: Record<string, string | number>): string {
    return this.translate(msgid, context, vars);
  }

  /**
   * Translate a message with pluralization
   *
   * @param msgid - Singular form
   * @param msgidPlural - Plural form
   * @param count - Number to determine plural form
   * @param vars - Variables to interpolate (count is auto-added as 'n')
   * @returns Translated text
   *
   * @example
   * tn('{n} item', '{n} items', 1, { n: 1 }) // "1 art�culo"
   * tn('{n} item', '{n} items', 5, { n: 5 }) // "5 art�culos"
   */
  tn(
    msgid: string,
    msgidPlural: string,
    count: number,
    vars?: Record<string, string | number>
  ): string {
    // Add count as 'n' variable
    const fullVars = { ...vars, n: count };
    return this.translatePlural(msgid, msgidPlural, count, '', fullVars);
  }

  /**
   * Translate a message with context and pluralization
   *
   * @param context - Message context
   * @param msgid - Singular form
   * @param msgidPlural - Plural form
   * @param count - Number to determine plural form
   * @param vars - Variables to interpolate (count is auto-added as 'n')
   * @returns Translated text
   *
   * @example
   * tnp('items', '{n} file', '{n} files', 1, { n: 1 }) // "1 archivo"
   * tnp('items', '{n} file', '{n} files', 5, { n: 5 }) // "5 archivos"
   */
  tnp(
    context: string,
    msgid: string,
    msgidPlural: string,
    count: number,
    vars?: Record<string, string | number>
  ): string {
    // Add count as 'n' variable
    const fullVars = { ...vars, n: count };
    return this.translatePlural(msgid, msgidPlural, count, context, fullVars);
  }

  /**
   * Clear the translation cache
   */
  clearCache(): void {
    this.cache.clear();
    if (this.debug) {
      console.log('[Polingo] Cache cleared');
    }
  }

  /**
   * Internal method to translate a message
   */
  private translate(
    msgid: string,
    context: string,
    vars?: Record<string, string | number>
  ): string {
    const translation = this.findTranslation(msgid, context);

    if (!translation) {
      if (this.debug) {
        console.warn(
          `[Polingo] Translation not found: "${msgid}" (context: "${context}", locale: "${this.locale}")`
        );
      }
      return interpolate(msgid, vars);
    }

    // Get translated string
    const msgstr = Array.isArray(translation.msgstr) ? translation.msgstr[0] : translation.msgstr;

    // If empty translation, return original
    if (!msgstr) {
      return interpolate(msgid, vars);
    }

    return interpolate(msgstr, vars);
  }

  /**
   * Internal method to translate a plural message
   */
  private translatePlural(
    msgid: string,
    msgidPlural: string,
    count: number,
    context: string,
    vars?: Record<string, string | number>
  ): string {
    const translation = this.findTranslation(msgid, context);

    if (!translation || !Array.isArray(translation.msgstr)) {
      if (this.debug) {
        console.warn(
          `[Polingo] Plural translation not found: "${msgid}" (context: "${context}", locale: "${this.locale}")`
        );
      }
      // Fallback to original pluralization
      const index = getPluralIndex(count, 'en');
      const original = index === 0 ? msgid : msgidPlural;
      return interpolate(original, vars);
    }

    // Get plural index based on locale
    const pluralIndex = getPluralIndex(count, this.locale);
    const msgstr = translation.msgstr[pluralIndex] ?? translation.msgstr[0];

    // If empty translation, return original
    if (!msgstr) {
      const index = getPluralIndex(count, 'en');
      const original = index === 0 ? msgid : msgidPlural;
      return interpolate(original, vars);
    }

    return interpolate(msgstr, vars);
  }

  /**
   * Find a translation in loaded catalogs
   *
   * Searches in current locale first, then falls back to fallback locale
   */
  private findTranslation(msgid: string, context: string): { msgstr: string | string[] } | null {
    // Try current locale
    const currentKey = `${this.locale}:${this.domain}`;
    const currentCatalog = this.catalogs.get(currentKey);

    if (currentCatalog) {
      const contextTranslations = currentCatalog.translations[context] ?? {};
      const translation = contextTranslations[msgid];
      if (translation) {
        return translation;
      }
    }

    // Try fallback locale
    if (this.locale !== this.fallback) {
      const fallbackKey = `${this.fallback}:${this.domain}`;
      const fallbackCatalog = this.catalogs.get(fallbackKey);

      if (fallbackCatalog) {
        const contextTranslations = fallbackCatalog.translations[context] ?? {};
        const translation = contextTranslations[msgid];
        if (translation) {
          return translation;
        }
      }
    }

    return null;
  }
}
