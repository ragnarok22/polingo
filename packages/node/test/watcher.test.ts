import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { TranslationWatcher } from '../src/watcher';
import { Translator, NoCache } from '@polingo/core';
import { NodeLoader } from '../src/loader';

type FakeWatcherInstance = {
  close: vi.Mock<Promise<void>, []>;
  closed: boolean;
  paths: string[];
  options: unknown;
  on: (event: string, listener: (...args: unknown[]) => void) => FakeWatcherInstance;
  emit: (event: string, ...args: unknown[]) => void;
};

const chokidarMock = vi.hoisted(() => {
  const watchers: FakeWatcherInstance[] = [];

  class FakeWatcher {
    paths: string[];
    options: unknown;
    closed: boolean;
    close: vi.Mock<Promise<void>, []>;
    private listeners: Map<string, Array<(...args: unknown[]) => void>>;

    constructor(patterns: string[] | string, options: unknown) {
      this.paths = Array.isArray(patterns) ? patterns : [patterns];
      this.options = options;
      this.closed = false;
      this.listeners = new Map();
      this.close = vi.fn(() => {
        this.closed = true;
        return Promise.resolve();
      });
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

  const watch = vi.fn((patterns: string[] | string, options: unknown) => {
    const watcher = new FakeWatcher(patterns, options);
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
  watch: vi.Mock<FakeWatcherInstance, [string[] | string, unknown]>;
  getLastWatcher: () => FakeWatcherInstance | undefined;
  clear: () => void;
};

vi.mock('chokidar', () => chokidarMock);

describe('TranslationWatcher', () => {
  const testDir = join(tmpdir(), 'polingo-watcher-test-' + Date.now());
  const esDir = join(testDir, 'es');
  const enDir = join(testDir, 'en');
  const frDir = join(testDir, 'fr');
  const esLcDir = join(esDir, 'LC_MESSAGES');
  const enLcDir = join(enDir, 'LC_MESSAGES');
  const frLcDir = join(frDir, 'LC_MESSAGES');

  let translator: Translator;
  let watcher: TranslationWatcher | undefined;

  const esPoContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola"
`;

  const enPoContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"

msgid "Hello"
msgstr "Hello"
`;

  const frPoContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: fr\\n"

msgid "Hello"
msgstr "Bonjour"
`;

  const ensureWatcher = (): FakeWatcherInstance => {
    const instance = chokidarMock.getLastWatcher();
    if (!instance) {
      throw new Error('No watcher instance registered');
    }
    return instance;
  };

  const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 10));

  beforeAll(async () => {
    // Create test directories
    await mkdir(esDir, { recursive: true });
    await mkdir(enDir, { recursive: true });
    await mkdir(frDir, { recursive: true });
    await mkdir(esLcDir, { recursive: true });
    await mkdir(enLcDir, { recursive: true });
    await mkdir(frLcDir, { recursive: true });

    // Create initial .po files
    await writeFile(join(esDir, 'messages.po'), esPoContent);
    await writeFile(join(enDir, 'messages.po'), enPoContent);
    await writeFile(join(esLcDir, 'messages.po'), esPoContent);
    await writeFile(join(enLcDir, 'messages.po'), enPoContent);
    await writeFile(join(frLcDir, 'messages.po'), frPoContent);

    // Initialize translator
    const loader = new NodeLoader(testDir);
    translator = new Translator(loader, new NoCache(), {
      locale: 'es',
      fallback: 'en',
      domain: 'messages',
    });
    // Only load es and en initially, fr will be added later during tests
    await translator.load(['es', 'en']);
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
      watcher = undefined;
    }
    chokidarMock.clear();
  });

  it('should create a watcher instance', () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages');
    expect(watcher).toBeDefined();
  });

  it('should start watching translation files', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages');
    await watcher.start();
    // No error should be thrown
    expect(chokidarMock.watch).toHaveBeenCalledTimes(1);
    const fakeWatcher = ensureWatcher();
    expect(fakeWatcher.paths).toEqual([
      join(testDir, 'es', 'messages.{po,mo}'),
      join(testDir, 'es', 'LC_MESSAGES', 'messages.{po,mo}'),
      join(testDir, 'en', 'messages.{po,mo}'),
      join(testDir, 'en', 'LC_MESSAGES', 'messages.{po,mo}'),
    ]);
    expect(fakeWatcher.options).toMatchObject({
      persistent: true,
      ignoreInitial: true,
    });
  });

  it('should not start watcher twice', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);

    await watcher.start();
    await watcher.start(); // Should log that watcher is already started

    expect(consoleSpy).toHaveBeenCalledWith('[Polingo] Watcher already started');
    expect(chokidarMock.watch).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('should stop watching translation files', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages');
    await watcher.start();
    await watcher.stop();
    // No error should be thrown
    const fakeWatcher = ensureWatcher();
    expect(fakeWatcher.close).toHaveBeenCalledTimes(1);
    expect(fakeWatcher.closed).toBe(true);
  });

  it('should handle stopping when not started', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages');
    // Should not throw when stopping without starting
    await expect(watcher.stop()).resolves.toBeUndefined();
  });

  it('should start watching and be ready to detect changes', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);
    await watcher.start();

    const originalTranslation = translator.t('Hello');
    expect(originalTranslation).toBe('Hola');

    const clearCacheSpy = vi.spyOn(translator, 'clearCache');
    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('change', join(esDir, 'messages.po'));
    await flushAsync();

    expect(clearCacheSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalledWith('es');

    clearCacheSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('should handle .mo change events the same as .po', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);
    await watcher.start();

    const clearCacheSpy = vi.spyOn(translator, 'clearCache');
    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('change', join(esDir, 'messages.mo'));
    await flushAsync();

    expect(clearCacheSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalledWith('es');

    clearCacheSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('should handle changes inside LC_MESSAGES directories', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);
    await watcher.start();

    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('change', join(esLcDir, 'messages.po'));
    await flushAsync();

    expect(loadSpy).toHaveBeenCalledWith('es');
    loadSpy.mockRestore();
  });

  it('should watch multiple locales for file additions', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en', 'fr'], 'messages', true);
    await watcher.start();

    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('add', join(frDir, 'messages.po'));
    await flushAsync();

    fakeWatcher.emit('add', join(frLcDir, 'messages.po'));
    await flushAsync();

    expect(loadSpy).toHaveBeenCalledTimes(2);
    expect(loadSpy).toHaveBeenNthCalledWith(1, 'fr');
    expect(loadSpy).toHaveBeenNthCalledWith(2, 'fr');
    loadSpy.mockRestore();
  });

  it('should load locales on .mo add events', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en', 'fr'], 'messages', true);
    await watcher.start();

    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('add', join(frDir, 'messages.mo'));
    await flushAsync();

    fakeWatcher.emit('add', join(frLcDir, 'messages.mo'));
    await flushAsync();

    expect(loadSpy).toHaveBeenCalledTimes(2);
    expect(loadSpy).toHaveBeenNthCalledWith(1, 'fr');
    expect(loadSpy).toHaveBeenNthCalledWith(2, 'fr');
    loadSpy.mockRestore();
  });

  it('should load locales on .mo add events', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en', 'fr'], 'messages', true);
    await watcher.start();

    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('add', join(frDir, 'messages.mo'));
    await flushAsync();

    expect(loadSpy).toHaveBeenCalledWith('fr');
    loadSpy.mockRestore();
  });

  it('should handle file changes with debug mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);
    await watcher.start();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Polingo] Started watching translations in:')
    );

    const fakeWatcher = ensureWatcher();
    fakeWatcher.emit('change', join(esDir, 'messages.po'));
    await flushAsync();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Polingo] Translation file changed:')
    );

    consoleSpy.mockRestore();
  });

  it('should have error handling logic for reload failures', async () => {
    // Create a watcher - it has error handling in place
    const invalidLoader = new NodeLoader('/nonexistent/path');
    const invalidTranslator = new Translator(invalidLoader, new NoCache(), {
      locale: 'es',
      fallback: 'en',
      domain: 'messages',
    });

    watcher = new TranslationWatcher(invalidTranslator, testDir, ['es'], 'messages', true);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await watcher.start();

    const fakeWatcher = ensureWatcher();
    fakeWatcher.emit('change', join(esDir, 'messages.po'));

    await vi.waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Polingo] Failed to reload translations for locale "es":'),
        expect.any(Error)
      )
    );
    consoleErrorSpy.mockRestore();
  });

  it('should have error handling logic for new file load failures', async () => {
    // Create a watcher - it has error handling in place
    const invalidLoader = new NodeLoader('/nonexistent/path');
    const invalidTranslator = new Translator(invalidLoader, new NoCache(), {
      locale: 'es',
      fallback: 'en',
      domain: 'messages',
    });

    watcher = new TranslationWatcher(invalidTranslator, testDir, ['fr'], 'messages', true);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await watcher.start();

    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('add', join(frDir, 'messages.po'));

    await vi.waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Polingo] Failed to load new translations for locale "fr":'),
        expect.any(Error)
      )
    );

    consoleErrorSpy.mockClear();

    fakeWatcher.emit('add', join(frLcDir, 'messages.po'));

    await vi.waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Polingo] Failed to load new translations for locale "fr":'),
        expect.any(Error)
      )
    );
    consoleErrorSpy.mockRestore();
  });

  it('should extract locale from file path correctly', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);
    await watcher.start();

    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();

    fakeWatcher.emit('change', join(esDir, 'messages.po'));
    await flushAsync();

    expect(loadSpy).toHaveBeenCalledWith('es');
    loadSpy.mockRestore();
  });

  it('should handle file paths that cannot extract locale', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);
    await watcher.start();

    const fakeWatcher = ensureWatcher();
    fakeWatcher.emit('change', join(tmpdir(), 'outside', 'messages.po'));
    await flushAsync();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Polingo] Ignoring unsafe translation path:')
    );
    consoleWarnSpy.mockClear();

    fakeWatcher.emit('change', join(testDir, 'invalid.po'));
    await flushAsync();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not extract locale from path')
    );
    consoleWarnSpy.mockRestore();
  });

  it('should work with custom domain name', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'custom-domain');
    await watcher.start();
    const fakeWatcher = ensureWatcher();
    expect(fakeWatcher.paths).toEqual([
      join(testDir, 'es', 'custom-domain.{po,mo}'),
      join(testDir, 'es', 'LC_MESSAGES', 'custom-domain.{po,mo}'),
      join(testDir, 'en', 'custom-domain.{po,mo}'),
      join(testDir, 'en', 'LC_MESSAGES', 'custom-domain.{po,mo}'),
    ]);
  });

  it('should work without debug mode', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', false);
    await watcher.start();
    expect(chokidarMock.watch).toHaveBeenCalledTimes(1);
  });

  it('should log stop message in debug mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages', true);
    await watcher.start();
    await watcher.stop();

    expect(consoleSpy).toHaveBeenCalledWith('[Polingo] Stopped watching translations');
    consoleSpy.mockRestore();
  });

  it('should watch multiple locales', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en', 'fr'], 'messages');
    await watcher.start();

    const fakeWatcher = ensureWatcher();
    expect(fakeWatcher.paths).toEqual([
      join(testDir, 'es', 'messages.{po,mo}'),
      join(testDir, 'es', 'LC_MESSAGES', 'messages.{po,mo}'),
      join(testDir, 'en', 'messages.{po,mo}'),
      join(testDir, 'en', 'LC_MESSAGES', 'messages.{po,mo}'),
      join(testDir, 'fr', 'messages.{po,mo}'),
      join(testDir, 'fr', 'LC_MESSAGES', 'messages.{po,mo}'),
    ]);
  });

  it('should have clearCache logic in change handler', async () => {
    // The watcher has clearCache logic built into its change handler
    watcher = new TranslationWatcher(translator, testDir, ['es'], 'messages', false);
    await watcher.start();

    const clearCacheSpy = vi.spyOn(translator, 'clearCache');
    const fakeWatcher = ensureWatcher();
    fakeWatcher.emit('change', join(esDir, 'messages.po'));
    await flushAsync();

    expect(clearCacheSpy).toHaveBeenCalled();
    clearCacheSpy.mockRestore();
  });

  const win32 = process.platform === 'win32' ? it : it.skip;

  win32('should handle Windows-style paths in extractLocaleFromPath', async () => {
    watcher = new TranslationWatcher(translator, testDir, ['es', 'en'], 'messages');
    await watcher.start();

    const loadSpy = vi.spyOn(translator, 'load');
    const fakeWatcher = ensureWatcher();
    const windowsPath = `${testDir.replace(/\//g, '\\')}\\es\\messages.po`;
    fakeWatcher.emit('change', windowsPath);
    await flushAsync();

    expect(loadSpy).toHaveBeenCalledWith('es');
    loadSpy.mockRestore();
  });
});
