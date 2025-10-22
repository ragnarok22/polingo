import type { TranslationLoader, TranslationCatalog } from './types';

/**
 * Re-export the translation loader types so other packages can implement
 * environment-specific loaders without depending on internal modules.
 *
 * @example
 * ```ts
 * import type { TranslationLoader } from '@polingo/core';
 *
 * export class NodeLoader implements TranslationLoader {
 *   async load(locale: string, domain: string): Promise<TranslationCatalog> {
 *     // Node.js-specific translation retrieval
 *   }
 * }
 * ```
 */
export type { TranslationLoader, TranslationCatalog };
