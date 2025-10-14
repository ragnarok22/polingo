export function createTranslator(config: PolingoConfig): Translator;

// Clase principal (por si quieren usarla directamente)
export { Translator } from './translator';

// Tipos
export type {
  Translation,
  TranslationCatalog,
  TranslationLoader,
  TranslationCache,
  PolingoConfig,
  TranslateOptions,
} from './types';

// Cachés incluidos
export { MemoryCache, TtlCache, NoCache } from './cache';

// Utilidades (opcional, exponer si son útiles)
export { interpolate } from './interpolator';
export { getPluralIndex } from './plurals';
