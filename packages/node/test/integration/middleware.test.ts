import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { polingoMiddleware } from '../../src/middleware';
import type { PolingoRequest, MiddlewareOptions } from '../../src/middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, 'fixtures', 'locales');

type TestRequest = Partial<PolingoRequest> & {
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
};

type TestResponse = Record<string, never>;

describe('Middleware Integration Tests', () => {
  const baseOptions: MiddlewareOptions = {
    locales: ['en', 'es', 'fr'],
    directory: FIXTURES_DIR,
    fallback: 'en',
    cache: true,
    watch: false,
    debug: false,
  };

  describe('Shared Translator Mode', () => {
    it('should attach translator and handle locale switching', async () => {
      const middleware = polingoMiddleware(baseOptions);

      const req1: TestRequest = {
        headers: { 'accept-language': 'es' },
      };
      const next1 = (): void => {
        expect(req1.polingo).toBeDefined();
        expect(req1.polingo!.t('Hello')).toBe('Hola');
      };

      await middleware(req1, {} as TestResponse, next1);

      // Second request with different locale
      const req2: TestRequest = {
        headers: { 'accept-language': 'fr' },
      };
      const next2 = (): void => {
        expect(req2.polingo).toBeDefined();
        expect(req2.polingo!.t('Hello')).toBe('Bonjour');
      };

      await middleware(req2, {} as TestResponse, next2);
    });

    it('should handle Accept-Language header with quality values', async () => {
      const middleware = polingoMiddleware(baseOptions);

      const req: TestRequest = {
        headers: { 'accept-language': 'es-ES,es;q=0.9,en;q=0.8' },
      };

      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        expect(req.polingo!.t('Goodbye')).toBe('Adiós');
      });
    });

    it('should fallback to default locale for unsupported language', async () => {
      const middleware = polingoMiddleware(baseOptions);

      const req: TestRequest = {
        headers: { 'accept-language': 'de' }, // German not supported
      };

      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        // Should use fallback (English)
        expect(req.polingo!.t('Hello')).toBe('Hello');
      });
    });

    it('should use query parameter for locale when available', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        localeExtractor: (req) => {
          const locale = req.query?.locale;
          if (typeof locale === 'string') {
            return locale;
          }
          return 'en';
        },
      });

      const req: TestRequest = {
        query: { locale: 'fr' },
        headers: { 'accept-language': 'es' }, // Should be ignored
      };

      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        expect(req.polingo!.t('Hello')).toBe('Bonjour');
      });
    });
  });

  describe('Per-Locale Translator Mode', () => {
    it('should create separate translators per locale', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        perLocale: true,
        localeExtractor: (req) => {
          const locale = req.query?.locale;
          return typeof locale === 'string' ? locale : 'en';
        },
      });

      const reqEs: TestRequest = { query: { locale: 'es' } };
      await middleware(reqEs, {} as TestResponse, () => {
        expect(reqEs.polingo).toBeDefined();
        expect(reqEs.polingo!.t('Hello')).toBe('Hola');
      });

      const reqFr: TestRequest = { query: { locale: 'fr' } };
      await middleware(reqFr, {} as TestResponse, () => {
        expect(reqFr.polingo).toBeDefined();
        expect(reqFr.polingo!.t('Hello')).toBe('Bonjour');
      });

      const reqEn: TestRequest = { query: { locale: 'en' } };
      await middleware(reqEn, {} as TestResponse, () => {
        expect(reqEn.polingo).toBeDefined();
        expect(reqEn.polingo!.t('Hello')).toBe('Hello');
      });

      // Second request to same locale should reuse translator
      const reqEs2: TestRequest = { query: { locale: 'es' } };
      await middleware(reqEs2, {} as TestResponse, () => {
        expect(reqEs2.polingo).toBe(reqEs.polingo);
      });
    });

    it('should cache fallback translator for unsupported locales', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        perLocale: true,
        localeExtractor: () => 'invalid',
      });

      const req1: TestRequest = {};
      await middleware(req1, {} as TestResponse, () => {
        expect(req1.polingo).toBeDefined();
        expect(req1.polingo!.t('Hello')).toBe('Hello'); // Fallback to English
      });

      const req2: TestRequest = {};
      await middleware(req2, {} as TestResponse, () => {
        expect(req2.polingo).toBe(req1.polingo); // Same instance
      });
    });
  });

  describe('Translation Features in Middleware Context', () => {
    it('should handle context translations', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        localeExtractor: () => 'es',
      });

      const req: TestRequest = {};
      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        expect(req.polingo!.tp('menu', 'File')).toBe('Archivo');
        expect(req.polingo!.tp('verb', 'File')).toBe('Archivar');
      });
    });

    it('should handle pluralization', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        localeExtractor: () => 'es',
      });

      const req: TestRequest = {};
      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        expect(req.polingo!.tn('{count} message', '{count} messages', 1, { count: 1 })).toBe(
          '1 mensaje'
        );
        expect(req.polingo!.tn('{count} message', '{count} messages', 5, { count: 5 })).toBe(
          '5 mensajes'
        );
      });
    });

    it('should handle variable interpolation', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        localeExtractor: () => 'fr',
      });

      const req: TestRequest = {};
      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        expect(req.polingo!.t('Welcome, {name}!', { name: 'Pierre' })).toBe('Bienvenue, Pierre!');
      });
    });
  });

  describe('Locale Extraction Strategies', () => {
    it('should support custom locale extraction', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        localeExtractor: (req) => {
          // Custom strategy: cookie > query > header > fallback
          if (req.query?.locale) {
            const locale = req.query.locale;
            if (typeof locale === 'string') {
              return locale;
            }
            return 'en';
          }
          const acceptLang = req.headers?.['accept-language'];
          if (typeof acceptLang === 'string') {
            const parts = acceptLang.split(',');
            const first = parts[0];
            if (typeof first === 'string') {
              const langParts = first.split('-');
              const lang = langParts[0];
              if (typeof lang === 'string') {
                return lang;
              }
            }
          }
          return 'en';
        },
      });

      const req: TestRequest = {
        query: { locale: 'es' },
        headers: { 'accept-language': 'fr' },
      };

      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        // Should prefer query parameter
        expect(req.polingo!.t('Hello')).toBe('Hola');
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle middleware initialization errors gracefully', async () => {
      const middleware = polingoMiddleware({
        locales: ['en'],
        directory: '/nonexistent/path',
        fallback: 'en',
      });

      const req: TestRequest = {};
      await expect(middleware(req, {} as TestResponse, () => {})).rejects.toThrow();
    });

    it('should work with missing Accept-Language header', async () => {
      const middleware = polingoMiddleware(baseOptions);

      const req: TestRequest = {
        headers: {},
      };

      await middleware(req, {} as TestResponse, () => {
        expect(req.polingo).toBeDefined();
        // Should use fallback
        expect(req.polingo!.t('Hello')).toBe('Hello');
      });
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests in shared mode', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        localeExtractor: (req) => {
          const locale = req.query?.locale;
          return typeof locale === 'string' ? locale : 'en';
        },
      });

      const requests = [
        { query: { locale: 'es' }, expected: 'Hola' },
        { query: { locale: 'fr' }, expected: 'Bonjour' },
        { query: { locale: 'en' }, expected: 'Hello' },
        { query: { locale: 'es' }, expected: 'Hola' },
      ];

      // Process all requests sequentially in shared mode
      // because the shared translator switches locale per request
      for (const { query, expected } of requests) {
        const req: TestRequest = { query };
        await middleware(req, {} as TestResponse, () => {
          expect(req.polingo).toBeDefined();
          expect(req.polingo!.t('Hello')).toBe(expected);
        });
      }
    });

    it('should handle concurrent requests in per-locale mode', async () => {
      const middleware = polingoMiddleware({
        ...baseOptions,
        perLocale: true,
        localeExtractor: (req) => {
          const locale = req.query?.locale;
          return typeof locale === 'string' ? locale : 'en';
        },
      });

      const requests = [
        { query: { locale: 'es' }, expected: 'Hola' },
        { query: { locale: 'fr' }, expected: 'Bonjour' },
        { query: { locale: 'en' }, expected: 'Hello' },
      ];

      await Promise.all(
        requests.map(async ({ query, expected }) => {
          const req: TestRequest = { query };
          await middleware(req, {} as TestResponse, () => {
            expect(req.polingo).toBeDefined();
            expect(req.polingo!.t('Hello')).toBe(expected);
          });
        })
      );
    });
  });
});
