import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Translator } from '../src/translator';
import { NoCache, MemoryCache } from '../src/cache';
import type { TranslationLoader, TranslationCatalog } from '../src/types';
import esFixture from './fixtures/es.json';
import enFixture from './fixtures/en.json';

// Mock loader that uses our fixtures
class MockLoader implements TranslationLoader {
  private catalogs: Map<string, TranslationCatalog>;

  constructor() {
    this.catalogs = new Map([
      ['es:messages', esFixture as TranslationCatalog],
      ['en:messages', enFixture as TranslationCatalog],
    ]);
  }

  load(locale: string, domain: string): Promise<TranslationCatalog> {
    const key = `${locale}:${domain}`;
    const catalog = this.catalogs.get(key);

    if (!catalog) {
      throw new Error(`Catalog not found: ${key}`);
    }

    return Promise.resolve(catalog);
  }
}

describe('Translator', () => {
  let translator: Translator;
  let loader: MockLoader;

  beforeEach(() => {
    loader = new MockLoader();
    translator = new Translator(loader, new NoCache(), {
      locale: 'es',
      fallback: 'en',
      domain: 'messages',
      debug: false,
    });
  });

  describe('initialization and loading', () => {
    it('should create translator with config', () => {
      expect(translator.getLocale()).toBe('es');
    });

    it('should load single locale', async () => {
      await translator.load('es');
      expect(translator.hasLocale('es')).toBe(true);
    });

    it('should load multiple locales', async () => {
      await translator.load(['es', 'en']);
      expect(translator.hasLocale('es')).toBe(true);
      expect(translator.hasLocale('en')).toBe(true);
    });

    it('should throw error for non-existent locale', async () => {
      await expect(translator.load('fr')).rejects.toThrow('Failed to load catalog');
    });

    it('should check if locale is loaded', async () => {
      expect(translator.hasLocale('es')).toBe(false);
      await translator.load('es');
      expect(translator.hasLocale('es')).toBe(true);
    });
  });

  describe('setLocale', () => {
    it('should change current locale', async () => {
      await translator.load(['es', 'en']);
      expect(translator.getLocale()).toBe('es');

      await translator.setLocale('en');
      expect(translator.getLocale()).toBe('en');
    });

    it('should load locale if not already loaded', async () => {
      expect(translator.hasLocale('en')).toBe(false);
      await translator.setLocale('en');
      expect(translator.hasLocale('en')).toBe(true);
      expect(translator.getLocale()).toBe('en');
    });
  });

  describe('t() - basic translation', () => {
    beforeEach(async () => {
      await translator.load(['es', 'en']);
    });

    it('should translate simple message', () => {
      expect(translator.t('Hello')).toBe('Hola');
    });

    it('should interpolate variables', () => {
      expect(translator.t('Welcome, {name}!', { name: 'Juan' })).toBe('¡Bienvenido, Juan!');
    });

    it('should interpolate numeric variables', () => {
      expect(translator.t('You have {count} messages', { count: 5 })).toBe('Tienes 5 mensajes');
    });

    it('should return msgid when translation not found', () => {
      expect(translator.t('Non-existent message')).toBe('Non-existent message');
    });

    it('should return msgid when translation is empty string', () => {
      expect(translator.t('Missing translation')).toBe('Missing translation');
    });

    it('should use fallback locale when translation missing', async () => {
      await translator.setLocale('es');
      // "Fallback only" exists in English but not Spanish
      expect(translator.t('Fallback only')).toBe('This only exists in English');
    });
  });

  describe('tp() - translation with context', () => {
    beforeEach(async () => {
      await translator.load(['es', 'en']);
    });

    it('should translate with context', () => {
      expect(translator.tp('menu', 'File')).toBe('Archivo');
      expect(translator.tp('verb', 'File')).toBe('Archivar');
    });

    it('should handle same msgid with different contexts', () => {
      const menuFile = translator.tp('menu', 'File');
      const verbFile = translator.tp('verb', 'File');

      expect(menuFile).toBe('Archivo');
      expect(verbFile).toBe('Archivar');
      expect(menuFile).not.toBe(verbFile);
    });

    it('should interpolate variables with context', () => {
      // Not in fixtures, but should work with context
      expect(translator.tp('menu', 'Edit')).toBe('Editar');
    });

    it('should return msgid when context not found', () => {
      expect(translator.tp('nonexistent', 'File')).toBe('File');
    });
  });

  describe('tn() - plural translation', () => {
    beforeEach(async () => {
      await translator.load(['es', 'en']);
    });

    it('should use singular form for count=1', () => {
      expect(translator.tn('{n} item', '{n} items', 1)).toBe('1 artículo');
    });

    it('should use plural form for count=0', () => {
      expect(translator.tn('{n} item', '{n} items', 0)).toBe('0 artículos');
    });

    it('should use plural form for count>1', () => {
      expect(translator.tn('{n} item', '{n} items', 5)).toBe('5 artículos');
    });

    it('should auto-add count as "n" variable', () => {
      const result = translator.tn('{n} file', '{n} files', 3);
      expect(result).toBe('3 archivos');
    });

    it('should allow additional variables', () => {
      const result = translator.tn('{n} file', '{n} files', 2, { n: 2 });
      expect(result).toBe('2 archivos');
    });

    it('should handle English pluralization', async () => {
      await translator.setLocale('en');
      expect(translator.tn('{n} item', '{n} items', 1)).toBe('1 item');
      expect(translator.tn('{n} item', '{n} items', 2)).toBe('2 items');
    });

    it('should fallback when plural not found', () => {
      const result = translator.tn('{n} unknown', '{n} unknowns', 5);
      expect(result).toBe('5 unknowns');
    });
  });

  describe('tnp() - plural translation with context', () => {
    beforeEach(async () => {
      await translator.load(['es', 'en']);
    });

    it('should translate plural with context', () => {
      // Using default context for simplicity
      expect(translator.tnp('', '{n} file', '{n} files', 1)).toBe('1 archivo');
      expect(translator.tnp('', '{n} file', '{n} files', 5)).toBe('5 archivos');
    });

    it('should auto-add count as "n" variable', () => {
      const result = translator.tnp('', '{n} item', '{n} items', 3);
      expect(result).toBe('3 artículos');
    });

    it('should handle additional variables', () => {
      const result = translator.tnp('', '{n} file', '{n} files', 7, { n: 7 });
      expect(result).toBe('7 archivos');
    });
  });

  describe('fallback behavior', () => {
    beforeEach(async () => {
      await translator.load(['es', 'en']);
    });

    it('should use fallback locale when translation missing', () => {
      // "Fallback only" exists only in English
      expect(translator.t('Fallback only')).toBe('This only exists in English');
    });

    it('should not use fallback when translation exists', () => {
      expect(translator.t('Hello')).toBe('Hola');
      expect(translator.t('Hello')).not.toBe('Hello');
    });

    it('should return msgid when neither locale has translation', () => {
      expect(translator.t('Does not exist anywhere')).toBe('Does not exist anywhere');
    });
  });

  describe('cache integration', () => {
    it('should use cache when available', async () => {
      const cache = new MemoryCache();
      const cachedTranslator = new Translator(loader, cache, {
        locale: 'es',
        fallback: 'en',
      });

      await cachedTranslator.load('es');
      expect(cache.has('es:messages')).toBe(true);

      // Load again - should come from cache
      await cachedTranslator.load('es');
    });

    it('should clear cache', async () => {
      const cache = new MemoryCache();
      const cachedTranslator = new Translator(loader, cache, {
        locale: 'es',
        fallback: 'en',
      });

      await cachedTranslator.load('es');
      expect(cache.has('es:messages')).toBe(true);

      cachedTranslator.clearCache();
      expect(cache.has('es:messages')).toBe(false);
    });
  });

  describe('debug mode', () => {
    it('should log warnings when translation not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const debugTranslator = new Translator(loader, new NoCache(), {
        locale: 'es',
        fallback: 'en',
        debug: true,
      });

      await debugTranslator.load('es');
      debugTranslator.t('Non-existent message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Translation not found'));

      consoleSpy.mockRestore();
    });

    it('should log when loading catalogs', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const debugTranslator = new Translator(loader, new NoCache(), {
        locale: 'es',
        fallback: 'en',
        debug: true,
      });

      await debugTranslator.load('es');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded catalog'));

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      await translator.load(['es', 'en']);
    });

    it('should handle empty msgid', () => {
      expect(translator.t('')).toBe('');
    });

    it('should handle undefined variables gracefully', () => {
      const result = translator.t('Welcome, {name}!', {});
      expect(result).toBe('¡Bienvenido, {name}!');
    });

    it('should handle plural with count=0', () => {
      const result = translator.tn('{n} item', '{n} items', 0);
      expect(result).toBe('0 artículos');
    });

    it('should handle very large plural counts', () => {
      const result = translator.tn('{n} item', '{n} items', 1000000);
      expect(result).toBe('1000000 artículos');
    });
  });
});
