/**
 * Estructura de una traducción individual
 */
export interface Translation {
  /** ID del mensaje (texto original) */
  msgid: string;
  /** Texto traducido: string para singular, array para plurales */
  msgstr: string | string[];
  /** Contexto opcional del mensaje */
  msgctxt?: string;
  /** Forma plural del msgid original */
  msgid_plural?: string;
}

/**
 * Resultado de una búsqueda de traducción, incluyendo el idioma de origen.
 */
export interface TranslationLookupResult {
  /** Traducción encontrada */
  translation: Translation;
  /** Locale desde el que proviene la traducción */
  locale: string;
}

/**
 * Catálogo completo de traducciones para un idioma
 */
export interface TranslationCatalog {
  /** Codificación del catálogo */
  charset: string;
  /** Cabeceras del archivo .po */
  headers: Record<string, string>;
  /** Traducciones organizadas por contexto y msgid */
  translations: {
    [context: string]: {
      [msgid: string]: Translation;
    };
  };
}

/**
 * Configuración del traductor
 */
export interface PolingoConfig {
  /** Idioma actual (ej: 'es', 'en', 'fr') */
  locale: string;
  /** Idioma de respaldo cuando no existe traducción */
  fallback?: string;
  /** Dominio de traducción (ej: 'messages', 'errors') */
  domain?: string;
  /** Activar logs de debug en consola */
  debug?: boolean;
}

/**
 * Opciones para funciones de traducción
 */
export interface TranslateOptions {
  /** Contexto del mensaje (para diferenciar homónimos) */
  context?: string;
  /** Variables a interpolar en el texto */
  vars?: Record<string, string | number>;
}

/**
 * Interfaz que deben implementar los loaders (Node, Web, etc.)
 */
export interface TranslationLoader {
  /**
   * Carga un catálogo de traducciones desde el sistema de archivos o red
   * @param locale - Código de idioma (ej: 'es', 'en')
   * @param domain - Dominio del catálogo (ej: 'messages')
   * @returns Promesa con el catálogo de traducciones
   */
  load(locale: string, domain: string): Promise<TranslationCatalog>;
}

/**
 * Interfaz para sistemas de caché de catálogos
 */
export interface TranslationCache {
  /**
   * Obtiene un catálogo del caché
   * @param key - Clave del catálogo (ej: 'es:messages')
   * @returns Catálogo si existe, undefined si no
   */
  get(key: string): TranslationCatalog | undefined;

  /**
   * Guarda un catálogo en el caché
   * @param key - Clave del catálogo
   * @param catalog - Catálogo a guardar
   */
  set(key: string, catalog: TranslationCatalog): void;

  /**
   * Verifica si existe un catálogo en el caché
   * @param key - Clave del catálogo
   * @returns true si existe, false si no
   */
  has(key: string): boolean;

  /**
   * Limpia todo el caché
   */
  clear(): void;
}
