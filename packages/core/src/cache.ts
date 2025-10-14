import type { TranslationCache, TranslationCatalog } from './types';

/**
 * Simple in-memory cache backed by a Map.
 *
 * Optionally supports LRU-style eviction when a maximum size is provided.
 */
export class MemoryCache implements TranslationCache {
  private cache: Map<string, TranslationCatalog>;
  private maxSize: number;

  /**
   * Create a new MemoryCache instance.
   *
   * @param maxSize - Maximum number of entries to keep (0 = unlimited)
   */
  constructor(maxSize: number = 0) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Retrieve a catalog from the cache.
   */
  get(key: string): TranslationCatalog | undefined {
    const catalog = this.cache.get(key);

    // When using LRU semantics, move the entry to the end to mark it as most recent.
    if (catalog && this.maxSize > 0) {
      this.cache.delete(key);
      this.cache.set(key, catalog);
    }

    return catalog;
  }

  /**
   * Store a catalog in the cache.
   *
   * Evicts the oldest entry when the maximum size is reached.
   */
  set(key: string, catalog: TranslationCatalog): void {
    // Remove existing entry first so iteration order updates.
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at capacity, remove the oldest entry (first key in the Map).
    if (this.maxSize > 0 && this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, catalog);
  }

  /**
   * Determine whether a catalog exists in the cache.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove all cached catalogs.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Current number of cached catalogs.
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Cache entry with expiration metadata.
 */
interface CacheEntry {
  catalog: TranslationCatalog;
  expiry: number; // Expiration timestamp in milliseconds
}

/**
 * Cache implementation with time-based expiration (TTL).
 *
 * Entries are automatically removed after the configured lifetime.
 */
export class TtlCache implements TranslationCache {
  private cache: Map<string, CacheEntry>;
  private ttlMs: number;

  /**
   * Create a new TtlCache instance.
   *
   * @param ttlMs - Time to live in milliseconds (default: 1 hour)
   */
  constructor(ttlMs: number = 3600000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieve a catalog from the cache.
   *
   * Returns undefined when the entry has expired.
   */
  get(key: string): TranslationCatalog | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Remove expired entry.
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.catalog;
  }

  /**
   * Store a catalog with an expiration timestamp.
   */
  set(key: string, catalog: TranslationCatalog): void {
    const entry: CacheEntry = {
      catalog,
      expiry: Date.now() + this.ttlMs,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check whether a non-expired catalog exists in the cache.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Remove expired entry.
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove all cached catalogs.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove all expired entries from the cache.
   *
   * @returns Number of pruned entries
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
   * Current number of cached catalogs.
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Cache implementation that never stores anything.
 *
 * Useful for tests or when caching is disabled.
 */
export class NoCache implements TranslationCache {
  /**
   * Always returns undefined.
   */
  get(_key: string): TranslationCatalog | undefined {
    return undefined;
  }

  /**
   * No-op.
   */
  set(_key: string, _catalog: TranslationCatalog): void {
    // No-op
  }

  /**
   * Always returns false.
   */
  has(_key: string): boolean {
    return false;
  }

  /**
   * No-op.
   */
  clear(): void {
    // No-op
  }
}
