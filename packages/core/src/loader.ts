import type { TranslationLoader, TranslationCatalog } from './types';

/**
 * Re-exporta la interfaz TranslationLoader para que otros paquetes
 * puedan implementarla sin necesidad de importar desde types
 *
 * Los loaders específicos (NodeLoader, WebLoader, etc.) se implementan
 * en paquetes separados ya que tienen dependencias específicas del entorno
 *
 * @example
 * ```typescript
 * // En @polingo/node
 * import type { TranslationLoader } from '@polingo/core';
 *
 * export class NodeLoader implements TranslationLoader {
 *   async load(locale: string, domain: string): Promise<TranslationCatalog> {
 *     // Implementación específica de Node.js
 *   }
 * }
 * ```
 */
export type { TranslationLoader, TranslationCatalog };
