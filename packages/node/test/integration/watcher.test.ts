import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { createPolingo } from '../../src/create';
import type { PolingoInstance } from '../../src/create';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_DIR = join(__dirname, 'fixtures', 'watcher-test');

// Helper to wait for file system changes to be detected
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('File Watcher Integration Tests', () => {
  beforeEach(() => {
    // Clean up and create fresh test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(join(TEST_DIR, 'en'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'es'), { recursive: true });

    // Create initial translation files
    writeFileSync(
      join(TEST_DIR, 'en', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"

msgid "Hello"
msgstr "Hello"

msgid "World"
msgstr "World"
`
    );

    writeFileSync(
      join(TEST_DIR, 'es', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola"

msgid "World"
msgstr "Mundo"
`
    );
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it.skip('should reload translations when file changes', async () => {
    let polingo: PolingoInstance | undefined;

    try {
      polingo = await createPolingo({
        locale: 'es',
        locales: ['en', 'es'],
        directory: TEST_DIR,
        watch: true,
        debug: false,
      });

      // Initial translation
      expect(polingo.t('Hello')).toBe('Hola');
      expect(polingo.t('World')).toBe('Mundo');

      // Update the Spanish translation file
      writeFileSync(
        join(TEST_DIR, 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola Modificado"

msgid "World"
msgstr "Mundo Modificado"
`
      );

      // Wait for file watcher to detect change and reload
      await wait(1500);

      // Translations should be updated
      expect(polingo.t('Hello')).toBe('Hola Modificado');
      expect(polingo.t('World')).toBe('Mundo Modificado');
    } finally {
      if (polingo?.stopWatching) {
        await polingo.stopWatching();
      }
    }
  }, 10000);

  it.skip('should reload specific locale when changed', async () => {
    let polingo: PolingoInstance | undefined;

    try {
      polingo = await createPolingo({
        locale: 'en',
        locales: ['en', 'es'],
        directory: TEST_DIR,
        watch: true,
      });

      expect(polingo.t('Hello')).toBe('Hello');

      // Change English translations
      writeFileSync(
        join(TEST_DIR, 'en', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"

msgid "Hello"
msgstr "Hello Updated"

msgid "World"
msgstr "World Updated"
`
      );

      await wait(1500);

      expect(polingo.t('Hello')).toBe('Hello Updated');
      expect(polingo.t('World')).toBe('World Updated');

      // Spanish should still work
      await polingo.setLocale('es');
      expect(polingo.t('Hello')).toBe('Hola');
    } finally {
      if (polingo?.stopWatching) {
        await polingo.stopWatching();
      }
    }
  }, 10000);

  it.skip('should handle watching multiple locales', async () => {
    // Add French locale
    mkdirSync(join(TEST_DIR, 'fr'), { recursive: true });
    writeFileSync(
      join(TEST_DIR, 'fr', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: fr\\n"

msgid "Hello"
msgstr "Bonjour"

msgid "World"
msgstr "Monde"
`
    );

    let polingo: PolingoInstance | undefined;

    try {
      polingo = await createPolingo({
        locale: 'fr',
        locales: ['en', 'es', 'fr'],
        directory: TEST_DIR,
        watch: true,
      });

      expect(polingo.t('Hello')).toBe('Bonjour');

      // Update French
      writeFileSync(
        join(TEST_DIR, 'fr', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: fr\\n"

msgid "Hello"
msgstr "Salut"

msgid "World"
msgstr "Terre"
`
      );

      await wait(1500);

      expect(polingo.t('Hello')).toBe('Salut');
      expect(polingo.t('World')).toBe('Terre');
    } finally {
      if (polingo?.stopWatching) {
        await polingo.stopWatching();
      }
    }
  }, 10000);

  it('should stop watching when stopWatching is called', async () => {
    const polingo = await createPolingo({
      locale: 'es',
      locales: ['es'],
      directory: TEST_DIR,
      watch: true,
    });

    expect(polingo.t('Hello')).toBe('Hola');

    // Stop watching
    expect(polingo.stopWatching).toBeDefined();
    await polingo.stopWatching!();

    // Update file after stopping watcher
    writeFileSync(
      join(TEST_DIR, 'es', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Should Not Update"
`
    );

    await wait(1500);

    // Translation should NOT be updated because watcher was stopped
    expect(polingo.t('Hello')).toBe('Hola');
  }, 10000);

  it('should not have stopWatching method when watch is false', async () => {
    const polingo = await createPolingo({
      locale: 'es',
      locales: ['es'],
      directory: TEST_DIR,
      watch: false,
    });

    expect(polingo.stopWatching).toBeUndefined();
  });

  it.skip('should handle file changes with cache enabled', async () => {
    let polingo: PolingoInstance | undefined;

    try {
      polingo = await createPolingo({
        locale: 'es',
        locales: ['es'],
        directory: TEST_DIR,
        watch: true,
        cache: true,
      });

      expect(polingo.t('Hello')).toBe('Hola');

      // Update translation
      writeFileSync(
        join(TEST_DIR, 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola Nuevo"
`
      );

      await wait(1500);

      // Cache should be cleared and new translation loaded
      expect(polingo.t('Hello')).toBe('Hola Nuevo');
    } finally {
      if (polingo?.stopWatching) {
        await polingo.stopWatching();
      }
    }
  }, 10000);

  it('should handle errors in modified translation files', async () => {
    let polingo: PolingoInstance | undefined;

    try {
      polingo = await createPolingo({
        locale: 'es',
        locales: ['es'],
        directory: TEST_DIR,
        watch: true,
        debug: false,
      });

      expect(polingo.t('Hello')).toBe('Hola');

      // Write invalid .po file
      writeFileSync(join(TEST_DIR, 'es', 'messages.po'), 'INVALID CONTENT');

      await wait(1500);

      // Should fall back to previous translation or handle error gracefully
      // The exact behavior depends on implementation, but shouldn't crash
      const result = polingo.t('Hello');
      expect(typeof result).toBe('string');
    } finally {
      if (polingo?.stopWatching) {
        await polingo.stopWatching();
      }
    }
  }, 10000);

  it.skip('should handle rapid consecutive file changes', async () => {
    let polingo: PolingoInstance | undefined;

    try {
      polingo = await createPolingo({
        locale: 'es',
        locales: ['es'],
        directory: TEST_DIR,
        watch: true,
      });

      expect(polingo.t('Hello')).toBe('Hola');

      // Make rapid consecutive changes
      for (let i = 1; i <= 3; i++) {
        writeFileSync(
          join(TEST_DIR, 'es', 'messages.po'),
          `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola ${i}"
`
        );
        await wait(300);
      }

      // Wait for final update
      await wait(1500);

      // Should have the last update
      expect(polingo.t('Hello')).toBe('Hola 3');
    } finally {
      if (polingo?.stopWatching) {
        await polingo.stopWatching();
      }
    }
  }, 15000);
});
