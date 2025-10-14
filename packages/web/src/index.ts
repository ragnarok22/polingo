/**
 * @polingo/web - Browser loader for Polingo translation system
 *
 * Provides Fetch-based catalog loading and localStorage caching.
 *
 * @packageDocumentation
 */

export { createPolingo, type CreatePolingoOptions, type WebPolingoInstance } from './create';
export { WebLoader, type WebLoaderOptions } from './loader';
export { LocalStorageCache, type LocalStorageCacheOptions } from './cache';
