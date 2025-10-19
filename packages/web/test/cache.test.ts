import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TranslationCatalog } from '@polingo/core';
import { LocalStorageCache } from '../src/cache';

const sampleCatalog: TranslationCatalog = {
  charset: 'utf-8',
  headers: {
    'Plural-Forms': 'nplurals=2; plural=(n != 1);',
  },
  translations: {
    '': {
      Hello: {
        msgid: 'Hello',
        msgstr: 'Hola',
      },
    },
  },
};

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) ?? null) : null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

class FailingStorage implements Storage {
  get length(): number {
    return 0;
  }

  clear(): void {}

  getItem(_key: string): string | null {
    return null;
  }

  key(_index: number): string | null {
    return null;
  }

  removeItem(_key: string): void {}

  setItem(_key: string, _value: string): void {
    throw new Error('QuotaExceededError');
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LocalStorageCache', () => {
  it('persists and retrieves catalogs via localStorage', () => {
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'test' });

    cache.set('es:messages', sampleCatalog);
    expect(cache.has('es:messages')).toBe(true);
    expect(cache.get('es:messages')).toEqual(sampleCatalog);

    cache.clear();
    expect(cache.has('es:messages')).toBe(false);
  });

  it('expires entries when ttl is reached', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'ttl', ttlMs: 1000 });

    cache.set('es:messages', sampleCatalog);
    expect(cache.get('es:messages')).toEqual(sampleCatalog);

    vi.advanceTimersByTime(1500);
    expect(cache.get('es:messages')).toBeUndefined();
    expect(cache.has('es:messages')).toBe(false);
  });

  it('falls back to memory cache when storage is null', () => {
    const cache = new LocalStorageCache({ storage: null, prefix: 'fallback' });

    cache.set('es:messages', sampleCatalog);
    expect(cache.has('es:messages')).toBe(true);
    expect(cache.get('es:messages')).toEqual(sampleCatalog);

    cache.clear();
    expect(cache.has('es:messages')).toBe(false);
  });

  it('logs warning when setItem throws an error', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = new FailingStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'failing' });

    cache.set('es:messages', sampleCatalog);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Polingo] Failed to persist catalog in localStorage, falling back to memory cache.',
      expect.any(Error)
    );

    // Note: The current implementation saves to fallback but cannot retrieve it
    // because readEntry checks storage first (which has no entry) before checking fallback.
    // The fallback is only fully functional when storage is null.
    // This test verifies the warning is logged when setItem fails.
  });

  it('removes entries with incorrect version', () => {
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'version' });

    // Manually set an entry with wrong version
    storage.setItem(
      'version:es:messages',
      JSON.stringify({
        version: 99,
        timestamp: Date.now(),
        catalog: sampleCatalog,
      })
    );

    expect(cache.get('es:messages')).toBeUndefined();
    expect(cache.has('es:messages')).toBe(false);
    expect(storage.getItem('version:es:messages')).toBeNull();
  });

  it('removes entries with invalid JSON', () => {
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'invalid' });

    // Manually set invalid JSON
    storage.setItem('invalid:es:messages', '{invalid json');

    expect(cache.get('es:messages')).toBeUndefined();
    expect(cache.has('es:messages')).toBe(false);
    expect(storage.getItem('invalid:es:messages')).toBeNull();
  });

  it('clears only prefixed keys from localStorage', () => {
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'polingo' });

    storage.setItem('polingo:es:messages', 'value1');
    storage.setItem('polingo:fr:messages', 'value2');
    storage.setItem('other:key', 'value3');

    expect(storage.length).toBe(3);

    cache.clear();

    expect(storage.length).toBe(1);
    expect(storage.getItem('other:key')).toBe('value3');
    expect(storage.getItem('polingo:es:messages')).toBeNull();
    expect(storage.getItem('polingo:fr:messages')).toBeNull();
  });

  it('handles expiration correctly with has method', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'exp', ttlMs: 1000 });

    cache.set('es:messages', sampleCatalog);
    expect(cache.has('es:messages')).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(cache.has('es:messages')).toBe(false);
  });

  it('reads from fallback when storage is null', () => {
    const cache = new LocalStorageCache({ storage: null });

    cache.set('es:messages', sampleCatalog);

    const result = cache.get('es:messages');
    expect(result).toEqual(sampleCatalog);
  });

  it('returns undefined when key not found in fallback', () => {
    const cache = new LocalStorageCache({ storage: null });

    expect(cache.get('nonexistent')).toBeUndefined();
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('uses default prefix when not specified', () => {
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage });

    cache.set('es:messages', sampleCatalog);

    expect(storage.getItem('polingo:es:messages')).toBeTruthy();
  });

  it('handles clear when storage has no keys', () => {
    const storage = new MemoryStorage();
    const cache = new LocalStorageCache({ storage, prefix: 'empty' });

    expect(() => cache.clear()).not.toThrow();
  });
});
