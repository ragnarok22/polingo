/**
 * Estructura de una traducci�n individual
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
 * Cat�logo completo de traducciones para un idioma
 */
export interface TranslationCatalog {
  /** Codificaci�n del cat�logo */
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
 * Configuraci�n del traductor
 */
export interface PolingoConfig {
  /** Idioma actual (ej: 'es', 'en', 'fr') */
  locale: string;
  /** Idioma de respaldo cuando no existe traducci�n */
  fallback?: string;
  /** Dominio de traducci�n (ej: 'messages', 'errors') */
  domain?: string;
  /** Activar logs de debug en consola */
  debug?: boolean;
}

/**
 * Opciones para funciones de traducci�n
 */
export interface TranslateOptions {
  /** Contexto del mensaje (para diferenciar hom�nimos) */
  context?: string;
  /** Variables a interpolar en el texto */
  vars?: Record<string, string | number>;
}

/**
 * Interfaz que deben implementar los loaders (Node, Web, etc.)
 */
export interface TranslationLoader {
  /**
   * Carga un cat�logo de traducciones desde el sistema de archivos o red
   * @param locale - C�digo de idioma (ej: 'es', 'en')
   * @param domain - Dominio del cat�logo (ej: 'messages')
   * @returns Promesa con el cat�logo de traducciones
   */
  load(locale: string, domain: string): Promise<TranslationCatalog>;
}

/**
 * Interfaz para sistemas de cach� de cat�logos
 */
export interface TranslationCache {
  /**
   * Obtiene un cat�logo del cach�
   * @param key - Clave del cat�logo (ej: 'es:messages')
   * @returns Cat�logo si existe, undefined si no
   */
  get(key: string): TranslationCatalog | undefined;

  /**
   * Guarda un cat�logo en el cach�
   * @param key - Clave del cat�logo
   * @param catalog - Cat�logo a guardar
   */
  set(key: string, catalog: TranslationCatalog): void;

  /**
   * Verifica si existe un cat�logo en el cach�
   * @param key - Clave del cat�logo
   * @returns true si existe, false si no
   */
  has(key: string): boolean;

  /**
   * Limpia todo el cach�
   */
  clear(): void;
}
