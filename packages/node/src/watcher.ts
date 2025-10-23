import { watch, FSWatcher } from 'chokidar';
import { join, relative, resolve, sep } from 'path';
import type { Translator } from '@polingo/core';

/**
 * File watcher for hot-reload of translation files
 *
 * Watches .po and .mo files and reloads them when they change
 */
export class TranslationWatcher {
  private watcher?: FSWatcher;
  private translator: Translator;
  private directory: string;
  private locales: string[];
  private domain: string;
  private debug: boolean;
  private readonly localesRoot: string;

  constructor(
    translator: Translator,
    directory: string,
    locales: string[],
    domain: string = 'messages',
    debug: boolean = false
  ) {
    this.translator = translator;
    this.directory = directory;
    this.locales = locales;
    this.domain = domain;
    this.debug = debug;
    this.localesRoot = resolve(directory);
  }

  /**
   * Start watching translation files
   * Returns a promise that resolves when the watcher is ready
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      if (this.watcher) {
        if (this.debug) {
          console.log('[Polingo] Watcher already started');
        }
        resolve();
        return;
      }

      // Watch all .po and .mo files in locale directories
      const patterns = this.locales.flatMap((locale) => {
        const localeDirectory = join(this.directory, locale);
        return [
          join(localeDirectory, `${this.domain}.{po,mo}`),
          join(localeDirectory, 'LC_MESSAGES', `${this.domain}.{po,mo}`),
        ];
      });

      this.watcher = watch(patterns, {
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: 2,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100,
        },
      });

      this.watcher.on('change', (path) => {
        void (async () => {
          if (!this.isSafeCatalogPath(path)) {
            if (this.debug) {
              console.warn(`[Polingo] Ignoring unsafe translation path: ${path}`);
            }
            return;
          }

          if (this.debug) {
            console.log(`[Polingo] Translation file changed: ${path}`);
          }

          // Extract locale from path
          const locale = this.extractLocaleFromPath(path);
          if (!locale) {
            if (this.debug) {
              console.warn(`[Polingo] Could not extract locale from path: ${path}`);
            }
            return;
          }

          // Reload the catalog
          try {
            // Clear cache for this locale
            this.translator.clearCache();

            // Reload the locale
            await this.translator.load(locale);

            if (this.debug) {
              console.log(`[Polingo] Reloaded translations for locale: ${locale}`);
            }
          } catch (error) {
            console.error(`[Polingo] Failed to reload translations for locale "${locale}":`, error);
          }
        })();
      });

      this.watcher.on('add', (path) => {
        void (async () => {
          if (!this.isSafeCatalogPath(path)) {
            if (this.debug) {
              console.warn(`[Polingo] Ignoring unsafe translation path: ${path}`);
            }
            return;
          }

          if (this.debug) {
            console.log(`[Polingo] New translation file detected: ${path}`);
          }

          const locale = this.extractLocaleFromPath(path);
          if (!locale) return;

          try {
            await this.translator.load(locale);
            if (this.debug) {
              console.log(`[Polingo] Loaded new translations for locale: ${locale}`);
            }
          } catch (error) {
            console.error(
              `[Polingo] Failed to load new translations for locale "${locale}":`,
              error
            );
          }
        })();
      });

      this.watcher.on('ready', () => {
        if (this.debug) {
          console.log(`[Polingo] Started watching translations in: ${this.directory}`);
        }
        resolve();
      });
    });
  }

  /**
   * Stop watching translation files
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      if (this.debug) {
        console.log('[Polingo] Stopped watching translations');
      }
    }
  }

  /**
   * Extract locale code from file path
   * Example: ./locales/es/messages.po -> 'es'
   */
  private extractLocaleFromPath(path: string): string | null {
    const absolutePath = resolve(path);
    const relativePath = relative(this.localesRoot, absolutePath).replace(/\\/g, '/');

    if (!relativePath || relativePath.startsWith('..')) {
      return null;
    }

    const segments = relativePath.split('/');
    if (segments.length < 2) {
      return null;
    }

    const locale = segments[0];
    if (!locale) {
      return null;
    }
    if (!this.locales.includes(locale)) {
      return null;
    }

    const filename = segments[segments.length - 1];
    if (!filename) {
      return null;
    }
    if (!filename.startsWith(`${this.domain}.`)) {
      return null;
    }

    return locale;
  }

  private isSafeCatalogPath(filePath: string): boolean {
    const absolutePath = resolve(filePath);
    if (!this.isPathInsideLocalesRoot(absolutePath)) {
      return false;
    }
    return absolutePath.endsWith('.po') || absolutePath.endsWith('.mo');
  }

  private isPathInsideLocalesRoot(candidatePath: string): boolean {
    const relativePath = relative(this.localesRoot, candidatePath);
    return (
      relativePath.length > 0 &&
      !relativePath.startsWith('..') &&
      !relativePath.includes(`..${sep}`)
    );
  }
}
