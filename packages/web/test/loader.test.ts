import { describe, expect, it, vi } from 'vitest';
import type { TranslationCatalog } from '@polingo/core';
import { WebLoader } from '../src/loader';

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

describe('WebLoader', () => {
  it('fetches catalogs using the default baseUrl', async () => {
    const fetchMock = vi.fn((url: RequestInfo) => {
      expect(url).toBe('/i18n/es/messages.json');
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(sampleCatalog),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });
    const catalog = await loader.load('es', 'messages');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(catalog).toEqual(sampleCatalog);
  });

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

  it('trims trailing slash from baseUrl', async () => {
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
      baseUrl: 'https://cdn.example.com/',
      fetch: fetchMock,
    });

    await loader.load('es', 'messages');
    expect(fetchMock).toHaveBeenCalledOnce();
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

  it('passes requestInit options to fetch', async () => {
    const requestInit = {
      headers: { Authorization: 'Bearer token123' },
      mode: 'cors' as RequestMode,
    };

    const fetchMock = vi.fn((_url: RequestInfo, init?: RequestInit) => {
      expect(init).toEqual(requestInit);
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(sampleCatalog),
      } as Response);
    });

    const loader = new WebLoader({
      fetch: fetchMock,
      requestInit,
    });

    await loader.load('es', 'messages');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('throws error when fetch fails with non-ok response', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Failed to load catalog "messages" for locale "es" (404 Not Found)'
    );
  });

  // Note: Cannot test "fetch not available" scenario reliably in modern test environments
  // as globalThis.fetch is typically available

  it('uses transformResponse when provided', async () => {
    const customPayload = {
      locale: 'es',
      data: sampleCatalog,
    };

    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(customPayload),
      } as Response);
    });

    const transformResponse = vi.fn((payload: unknown) => {
      const custom = payload as typeof customPayload;
      return custom.data;
    });

    const loader = new WebLoader({
      fetch: fetchMock,
      transformResponse,
    });

    const catalog = await loader.load('es', 'messages');

    expect(transformResponse).toHaveBeenCalledWith(customPayload);
    expect(catalog).toEqual(sampleCatalog);
  });

  it('throws error when response is not an object', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve('not an object'),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid translation catalog payload (expected object)'
    );
  });

  it('throws error when response is null', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(null),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid translation catalog payload (expected object)'
    );
  });

  it('throws error when translations field is missing', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ charset: 'utf-8', headers: {} }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid translation catalog payload (missing translations map)'
    );
  });

  it('throws error when context value is not an object', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': 'not an object',
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid translation context payload for "" (expected object)'
    );
  });

  it('throws error when translation entry is not an object', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                Hello: 'not an object',
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid translation entry for "Hello" in context ""'
    );
  });

  it('throws error when msgstr is invalid', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                Hello: {
                  msgid: 'Hello',
                  msgstr: 123,
                },
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid msgstr for "Hello"'
    );
  });

  it('throws error when msgstr array contains non-strings', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                item: {
                  msgid: 'item',
                  msgid_plural: 'items',
                  msgstr: ['one', 2, 'three'],
                },
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid msgstr array for "item"'
    );
  });

  it('throws error when msgctxt is not a string', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                Hello: {
                  msgid: 'Hello',
                  msgstr: 'Hola',
                  msgctxt: 123,
                },
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid msgctxt for "Hello"'
    );
  });

  it('throws error when msgid_plural is not a string', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                item: {
                  msgid: 'item',
                  msgid_plural: 123,
                  msgstr: ['one', 'many'],
                },
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Invalid msgid_plural for "item"'
    );
  });

  it('throws error when plural entry has string msgstr instead of array', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                item: {
                  msgid: 'item',
                  msgid_plural: 'items',
                  msgstr: 'not an array',
                },
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });

    await expect(loader.load('es', 'messages')).rejects.toThrow(
      '[Polingo] Plural entry requires msgstr array for "item"'
    );
  });

  it('normalizes headers to record of strings', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            charset: 'utf-8',
            headers: {
              'Plural-Forms': 'nplurals=2',
              'Non-String': 123,
              Valid: 'value',
            },
            translations: {
              '': {},
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });
    const catalog = await loader.load('es', 'messages');

    expect(catalog.headers).toEqual({
      'Plural-Forms': 'nplurals=2',
      Valid: 'value',
    });
  });

  it('defaults charset to utf-8 when not provided', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {},
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });
    const catalog = await loader.load('es', 'messages');

    expect(catalog.charset).toBe('utf-8');
  });

  it('uses msgid from object when provided', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                key: {
                  msgid: 'actual-msgid',
                  msgstr: 'translation',
                },
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });
    const catalog = await loader.load('es', 'messages');

    expect(catalog.translations['']['key'].msgid).toBe('actual-msgid');
  });

  it('uses key as msgid when msgid is not a string', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {
                'fallback-key': {
                  msgid: 123,
                  msgstr: 'translation',
                },
              },
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });
    const catalog = await loader.load('es', 'messages');

    expect(catalog.translations['']['fallback-key'].msgid).toBe('fallback-key');
  });

  it('handles empty translations object', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {},
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });
    const catalog = await loader.load('es', 'messages');

    expect(catalog.translations).toEqual({});
  });

  it('handles empty context object', async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            translations: {
              '': {},
              menu: {},
            },
          }),
      } as Response);
    });

    const loader = new WebLoader({ fetch: fetchMock });
    const catalog = await loader.load('es', 'messages');

    expect(catalog.translations['']).toEqual({});
    expect(catalog.translations['menu']).toEqual({});
  });
});
