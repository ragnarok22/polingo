/**
 * Structure of a single translation
 */
export interface Translation {
  /** Message ID (original text) */
  msgid: string;
  /** Translated text: string for singular, array for plurals */
  msgstr: string | string[];
  /** Optional message context */
  msgctxt?: string;
  /** Plural form of the original msgid */
  msgid_plural?: string;
}

/**
 * Result of a translation lookup, including the source locale.
 */
export interface TranslationLookupResult {
  /** Found translation */
  translation: Translation;
  /** Locale the translation came from */
  locale: string;
}

/**
 * Complete translation catalog for a locale
 */
export interface TranslationCatalog {
  /** Catalog encoding */
  charset: string;
  /** .po file headers */
  headers: Record<string, string>;
  /** Translations organized by context and msgid */
  translations: {
    [context: string]: {
      [msgid: string]: Translation;
    };
  };
}

/**
 * Translator configuration
 */
export interface PolingoConfig {
  /** Current locale (e.g., 'es', 'en', 'fr') */
  locale: string;
  /** Fallback locale when a translation is missing */
  fallback?: string;
  /** Translation domain (e.g., 'messages', 'errors') */
  domain?: string;
  /** Enable debug logs in the console */
  debug?: boolean;
}

/**
 * Options for translation functions
 */
export interface TranslateOptions {
  /** Message context (to distinguish homonyms) */
  context?: string;
  /** Variables to interpolate in the text */
  vars?: Record<string, string | number>;
}

/**
 * Interface loaders (Node, Web, etc.) must implement
 */
export interface TranslationLoader {
  /**
   * Loads a translation catalog from the filesystem or network
   * @param locale - Locale code (e.g., 'es', 'en')
   * @param domain - Catalog domain (e.g., 'messages')
   * @returns Promise with the translation catalog
   */
  load(locale: string, domain: string): Promise<TranslationCatalog>;
}

/**
 * Interface for catalog cache systems
 */
export interface TranslationCache {
  /**
   * Retrieves a catalog from the cache
   * @param key - Catalog key (e.g., 'es:messages')
   * @returns Catalog if found, undefined otherwise
   */
  get(key: string): TranslationCatalog | undefined;

  /**
   * Stores a catalog in the cache
   * @param key - Catalog key
   * @param catalog - Catalog to store
   */
  set(key: string, catalog: TranslationCatalog): void;

  /**
   * Checks if a catalog exists in the cache
   * @param key - Catalog key
   * @returns true if it exists, false otherwise
   */
  has(key: string): boolean;

  /**
   * Clears the entire cache
   */
  clear(): void;
}
