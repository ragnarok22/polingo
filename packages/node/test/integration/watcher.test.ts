import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { createPolingo } from '../../src/create';
import type { PolingoInstance } from '../../src/create';

type FakeWatcherInstance = {
  close: vi.Mock<Promise<void>, []>;
  paths: string[];
  on: (event: string, listener: (...args: unknown[]) => void) => FakeWatcherInstance;
  emit: (event: string, ...args: unknown[]) => void;
};

const chokidarMock = vi.hoisted(() => {
  const watchers: FakeWatcherInstance[] = [];

  class FakeWatcher {
    paths: string[];
    close: vi.Mock<Promise<void>, []>;
    private listeners: Map<string, Array<(...args: unknown[]) => void>>;

    constructor(patterns: string[] | string) {
      this.paths = Array.isArray(patterns) ? patterns : [patterns];
      this.listeners = new Map();
      this.close = vi.fn(() => Promise.resolve());
    }

    on(event: string, listener: (...args: unknown[]) => void): FakeWatcherInstance {
      const handlers = this.listeners.get(event) ?? [];
      handlers.push(listener);
      this.listeners.set(event, handlers);
      return this;
    }

    emit(event: string, ...args: unknown[]): void {
      const handlers = this.listeners.get(event);
      if (!handlers) return;
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  const watch = vi.fn((patterns: string[] | string) => {
    const watcher = new FakeWatcher(patterns);
    watchers.push(watcher);
    queueMicrotask(() => watcher.emit('ready'));
    return watcher;
  });

  const getLastWatcher = (): FakeWatcherInstance | undefined =>
    watchers.length > 0 ? watchers[watchers.length - 1] : undefined;

  return {
    watch,
    getLastWatcher,
    clear: () => {
      watchers.length = 0;
      watch.mockClear();
    },
  };
}) as {
  watch: vi.Mock<FakeWatcherInstance, [string[] | string]>;
  getLastWatcher: () => FakeWatcherInstance | undefined;
  clear: () => void;
};

vi.mock('chokidar', () => chokidarMock);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_DIR = join(__dirname, 'fixtures', 'watcher-test');

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 10));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureWatcher = (): FakeWatcherInstance => {
  const instance = chokidarMock.getLastWatcher();
  if (!instance) {
    throw new Error('No watcher instance registered');
  }
  return instance;
};

/**
 * Windows-compatible directory removal with retry logic
 * Windows may hold file locks briefly after operations, causing ENOTEMPTY errors
 */
const removeDirRetry = async (
  dir: string,
  maxRetries: number = 5,
  delayMs: number = 100
): Promise<void> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      }
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      // Wait before retry
      await wait(delayMs * (i + 1));
    }
  }
};

describe('File Watcher Integration Tests', () => {
  beforeEach(async () => {
    // Clean up and create fresh test directory
    await removeDirRetry(TEST_DIR);
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

  afterEach(async () => {
    // Clean up test directory
    await removeDirRetry(TEST_DIR);
    chokidarMock.clear();
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
    const fakeWatcher = ensureWatcher();

    // Simulate change detection while watcher is active
    writeFileSync(
      join(TEST_DIR, 'es', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola Actualizado"
`
    );
    fakeWatcher.emit('change', join(TEST_DIR, 'es', 'messages.po'));
    await flushAsync();
    expect(polingo.t('Hello')).toBe('Hola Actualizado');

    // Stop watching
    expect(polingo.stopWatching).toBeDefined();
    await polingo.stopWatching!();
    expect(fakeWatcher.close).toHaveBeenCalled();

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

    // Translation should NOT be updated because watcher was stopped
    expect(polingo.t('Hello')).toBe('Hola Actualizado');
  }, 10000);

  it('should not have stopWatching method when watch is false', async () => {
    const polingo = await createPolingo({
      locale: 'es',
      locales: ['es'],
      directory: TEST_DIR,
      watch: false,
    });

    expect(polingo.stopWatching).toBeUndefined();
    expect(chokidarMock.watch).not.toHaveBeenCalled();
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

      const fakeWatcher = ensureWatcher();
      // Set up spy BEFORE emitting the change event
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fakeWatcher.emit('change', join(TEST_DIR, 'es', 'messages.po'));
      await flushAsync();

      // Should fall back to previous translation or handle error gracefully
      // The exact behavior depends on implementation, but shouldn't crash
      const result = polingo.t('Hello');
      expect(typeof result).toBe('string');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Polingo] Failed to reload translations for locale "es":'),
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
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
