import type { TranslationCache, TranslationCatalog } from './types';

/**
 * Cach� simple en memoria usando Map
 *
 * Opcionalmente soporta LRU (Least Recently Used) con tama�o m�ximo
 */
export class MemoryCache implements TranslationCache {
  private cache: Map<string, TranslationCatalog>;
  private maxSize: number;

  /**
   * Crea una nueva instancia de MemoryCache
   *
   * @param maxSize - Tama�o m�ximo del cach� (0 = ilimitado)
   */
  constructor(maxSize: number = 0) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Obtiene un cat�logo del cach�
   */
  get(key: string): TranslationCatalog | undefined {
    const catalog = this.cache.get(key);

    // Si usamos LRU, mover al final (m�s reciente)
    if (catalog && this.maxSize > 0) {
      this.cache.delete(key);
      this.cache.set(key, catalog);
    }

    return catalog;
  }

  /**
   * Guarda un cat�logo en el cach�
   *
   * Si se alcanza maxSize, elimina la entrada m�s antigua
   */
  set(key: string, catalog: TranslationCatalog): void {
    // Si ya existe, eliminar primero para actualizar posici�n
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Si alcanzamos el l�mite, eliminar el m�s antiguo (primero en el Map)
    if (this.maxSize > 0 && this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, catalog);
  }

  /**
   * Verifica si existe un cat�logo en el cach�
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Limpia todo el cach�
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtiene el tama�o actual del cach�
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Entrada de cach� con tiempo de expiraci�n
 */
interface CacheEntry {
  catalog: TranslationCatalog;
  expiry: number; // Timestamp en ms
}

/**
 * Cach� con expiraci�n (TTL - Time To Live)
 *
 * Las entradas se eliminan autom�ticamente despu�s del tiempo especificado
 */
export class TtlCache implements TranslationCache {
  private cache: Map<string, CacheEntry>;
  private ttlMs: number;

  /**
   * Crea una nueva instancia de TtlCache
   *
   * @param ttlMs - Tiempo de vida en milisegundos (default: 1 hora)
   */
  constructor(ttlMs: number = 3600000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  /**
   * Obtiene un cat�logo del cach�
   *
   * Retorna undefined si la entrada ha expirado
   */
  get(key: string): TranslationCatalog | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Verificar si ha expirado
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.catalog;
  }

  /**
   * Guarda un cat�logo en el cach� con tiempo de expiraci�n
   */
  set(key: string, catalog: TranslationCatalog): void {
    const entry: CacheEntry = {
      catalog,
      expiry: Date.now() + this.ttlMs,
    };

    this.cache.set(key, entry);
  }

  /**
   * Verifica si existe un cat�logo v�lido en el cach�
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Verificar si ha expirado
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Limpia todo el cach�
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Elimina entradas expiradas del cach�
   *
   * @returns N�mero de entradas eliminadas
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Obtiene el tama�o actual del cach�
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Cach� que no almacena nada
 *
 * �til para testing o cuando no se desea usar cach�
 */
export class NoCache implements TranslationCache {
  /**
   * Siempre retorna undefined
   */
  get(_key: string): TranslationCatalog | undefined {
    return undefined;
  }

  /**
   * No hace nada
   */
  set(_key: string, _catalog: TranslationCatalog): void {
    // No-op
  }

  /**
   * Siempre retorna false
   */
  has(_key: string): boolean {
    return false;
  }

  /**
   * No hace nada
   */
  clear(): void {
    // No-op
  }
}
