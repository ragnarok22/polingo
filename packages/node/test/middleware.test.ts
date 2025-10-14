import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PolingoInstance } from '../src/create';

vi.mock('../src/create', () => ({
  createPolingo: vi.fn(),
}));

const { polingoMiddleware } = await import('../src/middleware');
const { createPolingo } = await import('../src/create');

const createPolingoMock = vi.mocked(createPolingo);

describe('polingoMiddleware', () => {
  const baseOptions = {
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
    const translatorStub: Partial<PolingoInstance> = {
      setLocale: vi.fn().mockResolvedValue(undefined),
    };

    createPolingoMock.mockResolvedValue(translatorStub as PolingoInstance);

    const middleware = polingoMiddleware(baseOptions);

    const req: any = {
      headers: { 'accept-language': 'es-ES,es;q=0.9' },
    };
    const next = vi.fn();

    await middleware(req, {}, next);

    expect(createPolingoMock).toHaveBeenCalledTimes(1);
    expect(createPolingoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: baseOptions.fallback,
        locales: baseOptions.locales,
      })
    );
    expect(translatorStub.setLocale).toHaveBeenCalledWith('es');
    expect(req.polingo).toBe(translatorStub);
    expect(next).toHaveBeenCalledOnce();
  });

  it('reuses a shared translator across multiple requests', async () => {
    const translatorStub: Partial<PolingoInstance> = {
      setLocale: vi.fn().mockResolvedValue(undefined),
    };

    createPolingoMock.mockResolvedValue(translatorStub as PolingoInstance);

    const middleware = polingoMiddleware(baseOptions);
    const next = vi.fn();

    await middleware({ headers: { 'accept-language': 'es' } } as any, {}, next);
    await middleware({ headers: { 'accept-language': 'en-US' } } as any, {}, next);

    expect(createPolingoMock).toHaveBeenCalledTimes(1);
    expect(translatorStub.setLocale).toHaveBeenNthCalledWith(1, 'es');
    expect(translatorStub.setLocale).toHaveBeenNthCalledWith(2, 'en');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('creates and caches per-locale translators when enabled', async () => {
    const translatorEs: Partial<PolingoInstance> = {};
    const translatorEn: Partial<PolingoInstance> = {};

    createPolingoMock.mockImplementation(async (options) => {
      if (options.locale === 'es') {
        return translatorEs as PolingoInstance;
      }
      if (options.locale === 'en') {
        return translatorEn as PolingoInstance;
      }
      throw new Error(`Unexpected locale ${options.locale}`);
    });

    const middleware = polingoMiddleware({
      ...baseOptions,
      perLocale: true,
      localeExtractor: (req) => (req.query?.locale as string) ?? 'en',
    });

    const next = vi.fn();

    const reqEs: any = { query: { locale: 'es' } };
    await middleware(reqEs, {}, next);
    expect(reqEs.polingo).toBe(translatorEs);

    const reqEn: any = { query: { locale: 'en' } };
    await middleware(reqEn, {}, next);
    expect(reqEn.polingo).toBe(translatorEn);

    const reqEsAgain: any = { query: { locale: 'es' } };
    await middleware(reqEsAgain, {}, next);
    expect(reqEsAgain.polingo).toBe(translatorEs);

    expect(createPolingoMock).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
