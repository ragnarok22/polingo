import { describe, it, expect } from 'vitest';
import { getPluralIndex } from '../src/plurals';

describe('getPluralIndex', () => {
  describe('English (2 forms: n != 1)', () => {
    it('should return 0 for singular (1)', () => {
      expect(getPluralIndex(1, 'en')).toBe(0);
    });

    it('should return 1 for plural (0)', () => {
      expect(getPluralIndex(0, 'en')).toBe(1);
    });

    it('should return 1 for plural (2)', () => {
      expect(getPluralIndex(2, 'en')).toBe(1);
    });

    it('should return 1 for plural (5)', () => {
      expect(getPluralIndex(5, 'en')).toBe(1);
    });

    it('should return 1 for plural (100)', () => {
      expect(getPluralIndex(100, 'en')).toBe(1);
    });
  });

  describe('Spanish (2 forms: n != 1)', () => {
    it('should return 0 for singular (1)', () => {
      expect(getPluralIndex(1, 'es')).toBe(0);
    });

    it('should return 1 for plural (0)', () => {
      expect(getPluralIndex(0, 'es')).toBe(1);
    });

    it('should return 1 for plural (2)', () => {
      expect(getPluralIndex(2, 'es')).toBe(1);
    });
  });

  describe('French (2 forms: n > 1)', () => {
    it('should return 0 for 0', () => {
      expect(getPluralIndex(0, 'fr')).toBe(0);
    });

    it('should return 0 for 1', () => {
      expect(getPluralIndex(1, 'fr')).toBe(0);
    });

    it('should return 1 for 2', () => {
      expect(getPluralIndex(2, 'fr')).toBe(1);
    });

    it('should return 1 for 5', () => {
      expect(getPluralIndex(5, 'fr')).toBe(1);
    });
  });

  describe('Russian (3 forms)', () => {
    it('should return 0 for numbers ending in 1 (except 11)', () => {
      expect(getPluralIndex(1, 'ru')).toBe(0);
      expect(getPluralIndex(21, 'ru')).toBe(0);
      expect(getPluralIndex(101, 'ru')).toBe(0);
    });

    it('should return 2 for 11', () => {
      expect(getPluralIndex(11, 'ru')).toBe(2);
    });

    it('should return 1 for numbers ending in 2-4 (except 12-14)', () => {
      expect(getPluralIndex(2, 'ru')).toBe(1);
      expect(getPluralIndex(3, 'ru')).toBe(1);
      expect(getPluralIndex(4, 'ru')).toBe(1);
      expect(getPluralIndex(22, 'ru')).toBe(1);
      expect(getPluralIndex(103, 'ru')).toBe(1);
    });

    it('should return 2 for 12-14', () => {
      expect(getPluralIndex(12, 'ru')).toBe(2);
      expect(getPluralIndex(13, 'ru')).toBe(2);
      expect(getPluralIndex(14, 'ru')).toBe(2);
    });

    it('should return 2 for other numbers', () => {
      expect(getPluralIndex(0, 'ru')).toBe(2);
      expect(getPluralIndex(5, 'ru')).toBe(2);
      expect(getPluralIndex(100, 'ru')).toBe(2);
    });
  });

  describe('Polish (3 forms)', () => {
    it('should return 0 for 1', () => {
      expect(getPluralIndex(1, 'pl')).toBe(0);
    });

    it('should return 1 for 2-4', () => {
      expect(getPluralIndex(2, 'pl')).toBe(1);
      expect(getPluralIndex(3, 'pl')).toBe(1);
      expect(getPluralIndex(4, 'pl')).toBe(1);
      expect(getPluralIndex(22, 'pl')).toBe(1);
    });

    it('should return 2 for 0, 5-21, 25+', () => {
      expect(getPluralIndex(0, 'pl')).toBe(2);
      expect(getPluralIndex(5, 'pl')).toBe(2);
      expect(getPluralIndex(11, 'pl')).toBe(2);
      expect(getPluralIndex(100, 'pl')).toBe(2);
    });
  });

  describe('Czech (3 forms)', () => {
    it('should return 0 for 1', () => {
      expect(getPluralIndex(1, 'cs')).toBe(0);
    });

    it('should return 1 for 2-4', () => {
      expect(getPluralIndex(2, 'cs')).toBe(1);
      expect(getPluralIndex(3, 'cs')).toBe(1);
      expect(getPluralIndex(4, 'cs')).toBe(1);
    });

    it('should return 2 for other numbers', () => {
      expect(getPluralIndex(0, 'cs')).toBe(2);
      expect(getPluralIndex(5, 'cs')).toBe(2);
      expect(getPluralIndex(100, 'cs')).toBe(2);
    });
  });

  describe('Chinese (no pluralization)', () => {
    it('should always return 0', () => {
      expect(getPluralIndex(0, 'zh')).toBe(0);
      expect(getPluralIndex(1, 'zh')).toBe(0);
      expect(getPluralIndex(2, 'zh')).toBe(0);
      expect(getPluralIndex(5, 'zh')).toBe(0);
      expect(getPluralIndex(100, 'zh')).toBe(0);
    });
  });

  describe('Japanese (no pluralization)', () => {
    it('should always return 0', () => {
      expect(getPluralIndex(1, 'ja')).toBe(0);
      expect(getPluralIndex(5, 'ja')).toBe(0);
    });
  });

  describe('Korean (no pluralization)', () => {
    it('should always return 0', () => {
      expect(getPluralIndex(1, 'ko')).toBe(0);
      expect(getPluralIndex(5, 'ko')).toBe(0);
    });
  });

  describe('Locale variants', () => {
    it('should extract language code from locale with region', () => {
      expect(getPluralIndex(1, 'es-MX')).toBe(0);
      expect(getPluralIndex(5, 'es-MX')).toBe(1);
      expect(getPluralIndex(1, 'en-US')).toBe(0);
      expect(getPluralIndex(5, 'en-GB')).toBe(1);
    });

    it('should be case insensitive', () => {
      expect(getPluralIndex(1, 'EN')).toBe(0);
      expect(getPluralIndex(5, 'EN')).toBe(1);
      expect(getPluralIndex(1, 'Es')).toBe(0);
    });
  });

  describe('Unknown languages', () => {
    it('should default to 2-form rule (n != 1)', () => {
      expect(getPluralIndex(1, 'unknown')).toBe(0);
      expect(getPluralIndex(0, 'unknown')).toBe(1);
      expect(getPluralIndex(5, 'unknown')).toBe(1);
    });
  });
});
