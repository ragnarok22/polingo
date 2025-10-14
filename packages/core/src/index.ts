import { Translator } from './translator';
import type { PolingoConfig, TranslationLoader, TranslationCache } from './types';

/**
 * Helper function to create a configured Translator instance
 *
 * @param loader - Translation loader implementation
 * @param cache - Cache implementation
 * @param config - Configuration options
 * @returns Configured Translator instance
 *
 * @example
 * ```typescript
 * import { createTranslator, MemoryCache } from '@polingo/core';
 *
 * const loader = {
 *   async load(locale, domain) {
 *     // Load translation catalog
 *     return catalog;
 *   }
 * };
 *
 * const translator = createTranslator(loader, new MemoryCache(), {
 *   locale: 'es',
 *   fallback: 'en',
 * });
 *
 * await translator.load(['es', 'en']);
 * console.log(translator.t('Hello')); // "Hola"
 * ```
 */
export function createTranslator(
  loader: TranslationLoader,
  cache: TranslationCache,
  config: PolingoConfig
): Translator {
  return new Translator(loader, cache, config);
}

// Main Translator class (for direct instantiation)
export { Translator } from './translator';

// TypeScript interfaces and types
export type {
  Translation,
  TranslationCatalog,
  TranslationLoader,
  TranslationCache,
  PolingoConfig,
  TranslateOptions,
} from './types';

// Built-in cache implementations
export { MemoryCache, TtlCache, NoCache } from './cache';

// Utility functions (can be used standalone)
export { interpolate } from './interpolator';
export { getPluralIndex } from './plurals';
