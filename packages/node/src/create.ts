import { Translator, MemoryCache, NoCache } from '@polingo/core';
import { NodeLoader } from './loader';
import { TranslationWatcher } from './watcher';

/**
 * Configuration options for createPolingo
 */
export interface CreatePolingoOptions {
  /** Current locale (e.g., 'es', 'en') */
  locale: string;
  /** Array of locales to preload */
  locales: string[];
  /** Directory containing translation files (e.g., './locales') */
  directory: string;
  /** Fallback locale when translation is not found */
  fallback?: string;
  /** Domain name (default: 'messages') */
  domain?: string;
  /** Enable caching (default: true) */
  cache?: boolean;
  /** Enable file watching for hot-reload (default: false) */
  watch?: boolean;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Extended Translator with watcher for cleanup
 */
export interface PolingoInstance extends Translator {
  /** Stop file watching if enabled */
  stopWatching?: () => Promise<void>;
}

/**
 * Create a configured Polingo translator instance
 *
 * This is the recommended way to use Polingo in Node.js applications.
 * It automatically configures the loader, cache, and file watching.
 *
 * @param options - Configuration options
 * @returns Configured and ready-to-use translator instance
 *
 * @example
 * ```typescript
 * import { createPolingo } from '@polingo/node';
 *
 * const polingo = await createPolingo({
 *   locale: 'es',
 *   locales: ['es', 'en', 'fr'],
 *   directory: './locales',
 *   fallback: 'en',
 *   cache: true,
 *   watch: process.env.NODE_ENV === 'development'
 * });
 *
 * // Ready to use
 * polingo.t('Hello'); // "Hola"
 * ```
 */
export async function createPolingo(options: CreatePolingoOptions): Promise<PolingoInstance> {
  const {
    locale,
    locales,
    directory,
    fallback = 'en',
    domain = 'messages',
    cache = true,
    watch = false,
    debug = false,
  } = options;

  // Create loader
  const loader = new NodeLoader(directory);

  // Create cache
  const cacheInstance = cache ? new MemoryCache() : new NoCache();

  // Create translator
  const translator = new Translator(loader, cacheInstance, {
    locale,
    fallback,
    domain,
    debug,
  });

  // Load all locales
  await translator.load(locales);

  // Setup file watching if enabled
  let watcher: TranslationWatcher | undefined;
  if (watch) {
    watcher = new TranslationWatcher(translator, directory, locales, domain, debug);
    watcher.start();
  }

  // Extend translator with watcher cleanup
  const instance = translator as PolingoInstance;
  if (watcher) {
    const currentWatcher = watcher;
    instance.stopWatching = async () => {
      await currentWatcher.stop();
    };
  }

  return instance;
}
