import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createPolingo } from '../../src/create';
import type { PolingoInstance } from '../../src/create';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, 'fixtures', 'locales');

describe('End-to-End Integration Tests', () => {
  describe('Basic Translation Flow', () => {
    let polingo: PolingoInstance;

    beforeAll(async () => {
      polingo = await createPolingo({
        locale: 'es',
        locales: ['en', 'es', 'fr'],
        directory: FIXTURES_DIR,
        fallback: 'en',
        cache: true,
      });
    });

    it('should translate simple strings', () => {
      expect(polingo.t('Hello')).toBe('Hola');
      expect(polingo.t('Goodbye')).toBe('Adiós');
    });

    it('should handle variable interpolation', () => {
      expect(polingo.t('Welcome, {name}!', { name: 'Juan' })).toBe('¡Bienvenido, Juan!');
    });

    it('should handle pluralization with count', () => {
      expect(polingo.tn('{count} message', '{count} messages', 1, { count: 1 })).toBe('1 mensaje');
      expect(polingo.tn('{count} message', '{count} messages', 5, { count: 5 })).toBe('5 mensajes');
    });

    it('should handle translations with context', () => {
      expect(polingo.tp('menu', 'File')).toBe('Archivo');
      expect(polingo.tp('verb', 'File')).toBe('Archivar');
    });

    it('should switch locales dynamically', async () => {
      expect(polingo.t('Hello')).toBe('Hola');

      await polingo.setLocale('fr');
      expect(polingo.t('Hello')).toBe('Bonjour');
      expect(polingo.t('Goodbye')).toBe('Au revoir');

      await polingo.setLocale('en');
      expect(polingo.t('Hello')).toBe('Hello');
      expect(polingo.t('Goodbye')).toBe('Goodbye');
    });

    it('should fallback to English when translation is missing', async () => {
      await polingo.setLocale('es');
      // A string that doesn't exist in any catalog
      expect(polingo.t('NonExistentString')).toBe('NonExistentString');
    });
  });

  describe('Cache Behavior', () => {
    it('should work with cache enabled', async () => {
      const polingoWithCache = await createPolingo({
        locale: 'es',
        locales: ['es', 'en'],
        directory: FIXTURES_DIR,
        cache: true,
      });

      expect(polingoWithCache.t('Hello')).toBe('Hola');

      // Second call should use cache
      expect(polingoWithCache.t('Hello')).toBe('Hola');
    });

    it('should work with cache disabled', async () => {
      const polingoWithoutCache = await createPolingo({
        locale: 'fr',
        locales: ['fr', 'en'],
        directory: FIXTURES_DIR,
        cache: false,
      });

      expect(polingoWithoutCache.t('Hello')).toBe('Bonjour');
      expect(polingoWithoutCache.t('Welcome, {name}!', { name: 'Marie' })).toBe(
        'Bienvenue, Marie!'
      );
    });

    it('should clear cache properly', async () => {
      const polingo = await createPolingo({
        locale: 'es',
        locales: ['es'],
        directory: FIXTURES_DIR,
        cache: true,
      });

      expect(polingo.t('Hello')).toBe('Hola');
      polingo.clearCache();
      // After cache clear, translations should still work
      expect(polingo.t('Hello')).toBe('Hola');
    });
  });

  describe('Multiple Locale Support', () => {
    it('should load and switch between all locales', async () => {
      const polingo = await createPolingo({
        locale: 'en',
        locales: ['en', 'es', 'fr'],
        directory: FIXTURES_DIR,
        fallback: 'en',
      });

      // English
      expect(polingo.t('Hello')).toBe('Hello');
      expect(polingo.tp('menu', 'File')).toBe('File');

      // Spanish
      await polingo.setLocale('es');
      expect(polingo.t('Hello')).toBe('Hola');
      expect(polingo.tp('menu', 'File')).toBe('Archivo');

      // French
      await polingo.setLocale('fr');
      expect(polingo.t('Hello')).toBe('Bonjour');
      expect(polingo.tp('menu', 'File')).toBe('Fichier');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid locale gracefully', async () => {
      const polingo = await createPolingo({
        locale: 'en',
        locales: ['en'],
        directory: FIXTURES_DIR,
        fallback: 'en',
      });

      // Try to set an unsupported locale
      await expect(polingo.setLocale('invalid')).rejects.toThrow();

      // Should still work with fallback
      expect(polingo.t('Hello')).toBe('Hello');
    });

    it('should handle missing translation directory', async () => {
      await expect(
        createPolingo({
          locale: 'en',
          locales: ['en'],
          directory: '/nonexistent/path',
        })
      ).rejects.toThrow();
    });
  });
});
