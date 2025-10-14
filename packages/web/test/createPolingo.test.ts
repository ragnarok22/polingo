import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TranslationCatalog } from '@polingo/core';
import { WebLoader } from '../src/loader';
import { LocalStorageCache } from '../src/cache';
import { createPolingo } from '../src/create';

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
      '{n} item': {
        msgid: '{n} item',
        msgid_plural: '{n} items',
        msgstr: ['{n} artículo', '{n} artículos'],
      },
    },
  },
};

afterEach(() => {
  vi.useRealTimers();
});

describe('WebLoader', () => {
  it('fetches catalogs using the provided baseUrl', async () => {
    const fetchMock = vi.fn((url: RequestInfo) => {
      expect(url).toBe('https://cdn.example.com/es/messages.json');
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(sampleCatalog),
      } as Response);
    });

    const loader = new WebLoader({
      baseUrl: 'https://cdn.example.com',
      fetch: fetchMock,
    });

    const catalog = await loader.load('es', 'messages');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(catalog).toEqual(sampleCatalog);
  });

  it('uses custom URL builder when provided', async () => {
    const fetchMock = vi.fn((url: RequestInfo) => {
      expect(url).toBe('https://cdn.example.com/i18n/messages_es.json');
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(sampleCatalog),
      } as Response);
    });

    const loader = new WebLoader({
      buildUrl: (locale, domain) => `https://cdn.example.com/i18n/${domain}_${locale}.json`,
      fetch: fetchMock,
    });

    await loader.load('es', 'messages');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
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
});

describe('createPolingo', () => {
  it('creates a translator and caches catalogs in localStorage', async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(sampleCatalog),
      } as Response);
    });

    const translator = await createPolingo({
      locale: 'es',
      locales: ['es'],
      loader: { baseUrl: 'https://cdn.example.com', fetch: fetchMock },
      cacheOptions: { storage, prefix: 'spec' },
    });

    expect(translator.t('Hello')).toBe('Hola');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(storage.length).toBe(1);
  });
});

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
