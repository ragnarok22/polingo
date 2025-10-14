import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryCache, TtlCache, NoCache } from '../src/cache';
import type { TranslationCatalog } from '../src/types';

const mockCatalog: TranslationCatalog = {
  charset: 'utf-8',
  headers: {},
  translations: {
    '': {
      Hello: { msgid: 'Hello', msgstr: 'Hola' },
    },
  },
};

const mockCatalog2: TranslationCatalog = {
  charset: 'utf-8',
  headers: {},
  translations: {
    '': {
      Goodbye: { msgid: 'Goodbye', msgstr: 'Adiós' },
    },
  },
};

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  it('should store and retrieve catalogs', () => {
    cache.set('es:messages', mockCatalog);
    expect(cache.get('es:messages')).toEqual(mockCatalog);
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should check if key exists', () => {
    cache.set('es:messages', mockCatalog);
    expect(cache.has('es:messages')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('es:messages', mockCatalog);
    cache.set('en:messages', mockCatalog2);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has('es:messages')).toBe(false);
  });

  it('should update existing entries', () => {
    cache.set('es:messages', mockCatalog);
    cache.set('es:messages', mockCatalog2);
    expect(cache.get('es:messages')).toEqual(mockCatalog2);
    expect(cache.size).toBe(1);
  });

  describe('LRU behavior with maxSize', () => {
    beforeEach(() => {
      cache = new MemoryCache(2);
    });

    it('should respect maxSize limit', () => {
      cache.set('key1', mockCatalog);
      cache.set('key2', mockCatalog2);
      expect(cache.size).toBe(2);

      // Adding third item should evict oldest (key1)
      cache.set('key3', mockCatalog);
      expect(cache.size).toBe(2);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
    });

    it('should update access order on get', () => {
      cache.set('key1', mockCatalog);
      cache.set('key2', mockCatalog2);

      // Access key1 to make it most recent
      cache.get('key1');

      // Adding third item should evict key2 (now oldest)
      cache.set('key3', mockCatalog);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });

    it('should handle maxSize of 1', () => {
      cache = new MemoryCache(1);
      cache.set('key1', mockCatalog);
      expect(cache.size).toBe(1);

      cache.set('key2', mockCatalog2);
      expect(cache.size).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });
  });
});

describe('TtlCache', () => {
  let cache: TtlCache;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve catalogs', () => {
    cache = new TtlCache(1000);
    cache.set('es:messages', mockCatalog);
    expect(cache.get('es:messages')).toEqual(mockCatalog);
  });

  it('should expire entries after TTL', () => {
    cache = new TtlCache(1000); // 1 second TTL
    cache.set('es:messages', mockCatalog);

    expect(cache.get('es:messages')).toEqual(mockCatalog);

    // Advance time by 1001ms
    vi.advanceTimersByTime(1001);

    expect(cache.get('es:messages')).toBeUndefined();
    expect(cache.has('es:messages')).toBe(false);
  });

  it('should not expire entries before TTL', () => {
    cache = new TtlCache(1000);
    cache.set('es:messages', mockCatalog);

    vi.advanceTimersByTime(999);

    expect(cache.get('es:messages')).toEqual(mockCatalog);
    expect(cache.has('es:messages')).toBe(true);
  });

  it('should use default TTL of 1 hour', () => {
    cache = new TtlCache();
    cache.set('es:messages', mockCatalog);

    // Just before 1 hour
    vi.advanceTimersByTime(3600000 - 1);
    expect(cache.get('es:messages')).toEqual(mockCatalog);

    // After 1 hour
    vi.advanceTimersByTime(2);
    expect(cache.get('es:messages')).toBeUndefined();
  });

  it('should clear all entries', () => {
    cache = new TtlCache(1000);
    cache.set('es:messages', mockCatalog);
    cache.set('en:messages', mockCatalog2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has('es:messages')).toBe(false);
  });

  it('should prune expired entries', () => {
    cache = new TtlCache(1000);
    cache.set('key1', mockCatalog);
    cache.set('key2', mockCatalog2);

    expect(cache.size).toBe(2);

    // Advance past TTL
    vi.advanceTimersByTime(1001);

    const pruned = cache.prune();
    expect(pruned).toBe(2);
    expect(cache.size).toBe(0);
  });

  it('should prune only expired entries', () => {
    cache = new TtlCache(1000);
    cache.set('key1', mockCatalog);

    vi.advanceTimersByTime(500);
    cache.set('key2', mockCatalog2);

    vi.advanceTimersByTime(600); // key1 expired (1100ms), key2 still valid (600ms)

    const pruned = cache.prune();
    expect(pruned).toBe(1);
    expect(cache.size).toBe(1);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
  });

  it('should return 0 when pruning with no expired entries', () => {
    cache = new TtlCache(1000);
    cache.set('key1', mockCatalog);

    const pruned = cache.prune();
    expect(pruned).toBe(0);
    expect(cache.size).toBe(1);
  });
});

describe('NoCache', () => {
  let cache: NoCache;

  beforeEach(() => {
    cache = new NoCache();
  });

  it('should never store catalogs', () => {
    cache.set('es:messages', mockCatalog);
    expect(cache.get('es:messages')).toBeUndefined();
  });

  it('should always return false for has', () => {
    cache.set('es:messages', mockCatalog);
    expect(cache.has('es:messages')).toBe(false);
  });

  it('should handle clear without errors', () => {
    cache.set('es:messages', mockCatalog);
    expect(() => cache.clear()).not.toThrow();
  });

  it('should handle multiple sets without storing', () => {
    cache.set('key1', mockCatalog);
    cache.set('key2', mockCatalog2);
    cache.set('key3', mockCatalog);

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBeUndefined();
  });
});
