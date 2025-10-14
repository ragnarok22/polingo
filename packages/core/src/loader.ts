import type { TranslationLoader, TranslationCatalog } from './types';

/**
 * Re-exporta la interfaz TranslationLoader para que otros paquetes
 * puedan implementarla sin necesidad de importar desde types
 *
 * Los loaders espec�ficos (NodeLoader, WebLoader, etc.) se implementan
 * en paquetes separados ya que tienen dependencias espec�ficas del entorno
 *
 * @example
 * ```typescript
 * // En @polingo/node
 * import type { TranslationLoader } from '@polingo/core';
 *
 * export class NodeLoader implements TranslationLoader {
 *   async load(locale: string, domain: string): Promise<TranslationCatalog> {
 *     // Implementaci�n espec�fica de Node.js
 *   }
 * }
 * ```
 */
export type { TranslationLoader, TranslationCatalog };
