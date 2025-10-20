import { MemoryCache } from '@polingo/core';
import type { TranslationCache, TranslationCatalog } from '@polingo/core';

/**
 * Options for {@link LocalStorageCache}
 */
export interface LocalStorageCacheOptions {
  /**
   * Custom storage instance. Defaults to `window.localStorage` when available.
   */
  storage?: Storage | null;
  /**
   * Prefix used for stored keys. Defaults to `polingo`.
   */
  prefix?: string;
  /**
   * Time-to-live in milliseconds. Expired entries are ignored and removed.
   * Disabled by default (entries persist until explicitly cleared).
   */
  ttlMs?: number;
  /**
   * Cache key/version string. When changed, all previous cache entries are invalidated.
   * Useful for cache busting during development or after translation updates.
   *
   * @example
   * // During development, use a timestamp or version number:
   * cacheKey: '2024-10-20' // or process.env.TRANSLATIONS_VERSION
   */
  cacheKey?: string;
}

interface LocalStorageEntry {
  version: number;
  timestamp: number;
  expiresAt?: number;
  cacheKey?: string;
  catalog: TranslationCatalog;
}

const CACHE_VERSION = 1;

/**
 * Browser cache backed by localStorage with graceful fallback to in-memory storage.
 */
export class LocalStorageCache implements TranslationCache {
  private readonly storage: Storage | null;
  private readonly prefix: string;
  private readonly ttlMs?: number;
  private readonly cacheKey?: string;
  private readonly fallback = new MemoryCache();

  constructor(options: LocalStorageCacheOptions = {}) {
    this.storage = options.storage ?? detectLocalStorage();
    this.prefix = options.prefix ?? 'polingo';
    this.ttlMs = options.ttlMs;
    this.cacheKey = options.cacheKey;
  }

  get(key: string): TranslationCatalog | undefined {
    const entry = this.readEntry(key);
    return entry?.catalog;
  }

  set(key: string, catalog: TranslationCatalog): void {
    if (!this.storage) {
      this.fallback.set(key, catalog);
      return;
    }

    const entry: LocalStorageEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      expiresAt: this.ttlMs ? Date.now() + this.ttlMs : undefined,
      cacheKey: this.cacheKey,
      catalog,
    };

    try {
      this.storage.setItem(this.namespacedKey(key), JSON.stringify(entry));
    } catch (error) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[Polingo] Failed to persist catalog in localStorage, falling back to memory cache.',
          error
        );
      }
      this.fallback.set(key, catalog);
    }
  }

  has(key: string): boolean {
    if (this.storage) {
      const entry = this.readEntry(key);
      return Boolean(entry);
    }

    return this.fallback.has(key);
  }

  clear(): void {
    if (this.storage) {
      const prefix = `${this.prefix}:`;
      for (let i = this.storage.length - 1; i >= 0; i--) {
        const storageKey = this.storage.key(i);
        if (storageKey && storageKey.startsWith(prefix)) {
          this.storage.removeItem(storageKey);
        }
      }
    }

    this.fallback.clear();
  }

  private readEntry(key: string): LocalStorageEntry | undefined {
    if (!this.storage) {
      const fallbackCatalog = this.fallback.get(key);
      if (!fallbackCatalog) {
        return undefined;
      }
      return {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        catalog: fallbackCatalog,
      };
    }

    const raw = this.storage.getItem(this.namespacedKey(key));
    if (!raw) {
      return undefined;
    }

    try {
      const entry = JSON.parse(raw) as LocalStorageEntry;
      if (entry.version !== CACHE_VERSION) {
        this.storage.removeItem(this.namespacedKey(key));
        return undefined;
      }

      // Invalidate cache if cacheKey doesn't match
      if (this.cacheKey !== undefined && entry.cacheKey !== this.cacheKey) {
        this.storage.removeItem(this.namespacedKey(key));
        return undefined;
      }

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.storage.removeItem(this.namespacedKey(key));
        return undefined;
      }

      return entry;
    } catch {
      this.storage.removeItem(this.namespacedKey(key));
      return undefined;
    }
  }

  private namespacedKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}

type LocalStorageGlobal = typeof globalThis & { localStorage?: Storage | null };

function detectLocalStorage(): Storage | null {
  try {
    const globalScope = globalThis as LocalStorageGlobal;
    const storage = globalScope.localStorage;
    if (!storage) {
      return null;
    }

    const testKey = '__polingo_ls_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}
