import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PolingoInstance } from '../src/create';
import type { PolingoRequest, MiddlewareOptions } from '../src/middleware';

vi.mock('../src/create', () => ({
  createPolingo: vi.fn(),
}));

const { polingoMiddleware } = await import('../src/middleware');
const { createPolingo } = await import('../src/create');

const createPolingoMock = vi.mocked(createPolingo);

type TestRequest = Partial<PolingoRequest> & {
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
};

type TestResponse = Record<string, never>;

describe('polingoMiddleware', () => {
  const baseOptions: MiddlewareOptions = {
    locales: ['en', 'es'],
    directory: './locales',
    fallback: 'en',
    cache: true,
    watch: false,
    debug: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches shared translator and derives locale from Accept-Language header', async () => {
    const setLocaleMock = vi.fn().mockResolvedValue(undefined);
    const translatorStub = {
      setLocale: setLocaleMock,
    } as unknown as PolingoInstance;

    createPolingoMock.mockResolvedValue(translatorStub);

    const middleware = polingoMiddleware(baseOptions);

    const req: TestRequest = {
      headers: { 'accept-language': 'es-ES,es;q=0.9' },
    };
    const next = vi.fn();

    await middleware(req, {} as TestResponse, next);

    expect(createPolingoMock).toHaveBeenCalledTimes(1);
    expect(createPolingoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: baseOptions.fallback,
        locales: baseOptions.locales,
      })
    );
    expect(setLocaleMock).toHaveBeenCalledWith('es');
    expect(req.polingo).toBe(translatorStub);
    expect(next).toHaveBeenCalledOnce();
  });

  it('reuses a shared translator across multiple requests', async () => {
    const setLocaleMock = vi.fn().mockResolvedValue(undefined);
    const translatorStub = {
      setLocale: setLocaleMock,
    } as unknown as PolingoInstance;

    createPolingoMock.mockResolvedValue(translatorStub);

    const middleware = polingoMiddleware(baseOptions);
    const next = vi.fn();

    await middleware({ headers: { 'accept-language': 'es' } }, {} as TestResponse, next);
    await middleware({ headers: { 'accept-language': 'en-US' } }, {} as TestResponse, next);

    expect(createPolingoMock).toHaveBeenCalledTimes(1);
    expect(setLocaleMock).toHaveBeenNthCalledWith(1, 'es');
    expect(setLocaleMock).toHaveBeenNthCalledWith(2, 'en');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('creates and caches per-locale translators when enabled', async () => {
    const translatorEs = {} as unknown as PolingoInstance;
    const translatorEn = {} as unknown as PolingoInstance;

    createPolingoMock.mockImplementation((options) => {
      if (options.locale === 'es') {
        return Promise.resolve(translatorEs);
      }
      if (options.locale === 'en') {
        return Promise.resolve(translatorEn);
      }
      throw new Error(`Unexpected locale ${options.locale}`);
    });

    const middleware = polingoMiddleware({
      ...baseOptions,
      perLocale: true,
      localeExtractor: (req) => {
        const locale = req.query?.locale;
        return typeof locale === 'string' ? locale : 'en';
      },
    });

    const next = vi.fn();

    const reqEs: TestRequest = { query: { locale: 'es' } };
    await middleware(reqEs, {} as TestResponse, next);
    expect(reqEs.polingo).toBe(translatorEs);

    const reqEn: TestRequest = { query: { locale: 'en' } };
    await middleware(reqEn, {} as TestResponse, next);
    expect(reqEn.polingo).toBe(translatorEn);

    const reqEsAgain: TestRequest = { query: { locale: 'es' } };
    await middleware(reqEsAgain, {} as TestResponse, next);
    expect(reqEsAgain.polingo).toBe(translatorEs);

    expect(createPolingoMock).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('falls back to the default locale for unsupported locales with shared translator', async () => {
    const setLocaleMock = vi.fn().mockImplementation((locale: string) => {
      if (locale === 'fr') {
        return Promise.reject(new Error('Unsupported locale'));
      }
      return Promise.resolve();
    });
    const translatorStub = {
      setLocale: setLocaleMock,
    } as unknown as PolingoInstance;

    createPolingoMock.mockResolvedValue(translatorStub);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const middleware = polingoMiddleware({
        ...baseOptions,
        debug: true,
        localeExtractor: () => 'fr',
      });

      const req: TestRequest = {};
      const next = vi.fn();

      await middleware(req, {} as TestResponse, next);

      expect(createPolingoMock).toHaveBeenCalledTimes(1);
      expect(setLocaleMock).toHaveBeenCalledTimes(1);
      expect(setLocaleMock).toHaveBeenCalledWith(baseOptions.fallback);
      expect(req.polingo).toBe(translatorStub);
      expect(next).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith(
        `[Polingo] Invalid locale "fr", using fallback "${baseOptions.fallback}"`
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('reuses the fallback translator for unsupported locales when per-locale caching is enabled', async () => {
    const translatorEn = {} as unknown as PolingoInstance;
    const translatorEs = {} as unknown as PolingoInstance;

    createPolingoMock.mockImplementation((options) => {
      if (options.locale === 'en') {
        return Promise.resolve(translatorEn);
      }
      if (options.locale === 'es') {
        return Promise.resolve(translatorEs);
      }
      return Promise.reject(new Error(`Unexpected locale ${options.locale}`));
    });

    const middleware = polingoMiddleware({
      ...baseOptions,
      perLocale: true,
      localeExtractor: (req) => {
        const locale = req.query?.locale;
        return typeof locale === 'string' ? locale : 'fr';
      },
    });

    const next = vi.fn();

    const unsupportedReq: TestRequest = {};
    await middleware(unsupportedReq, {} as TestResponse, next);
    expect(unsupportedReq.polingo).toBe(translatorEn);

    const unsupportedReqAgain: TestRequest = {};
    await middleware(unsupportedReqAgain, {} as TestResponse, next);
    expect(unsupportedReqAgain.polingo).toBe(translatorEn);

    const supportedReq: TestRequest = { query: { locale: 'es' } };
    await middleware(supportedReq, {} as TestResponse, next);
    expect(supportedReq.polingo).toBe(translatorEs);

    expect(createPolingoMock).toHaveBeenCalledTimes(2);
    expect(createPolingoMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: baseOptions.fallback })
    );
    expect(createPolingoMock).toHaveBeenCalledWith(expect.objectContaining({ locale: 'es' }));
    expect(next).toHaveBeenCalledTimes(3);
  });
});
