/**
 * @polingo/node - Node.js loader for Polingo translation system
 *
 * Provides filesystem-based translation loading with support for .po and .mo files,
 * hot-reload during development, and Express/Fastify middleware integration.
 *
 * @packageDocumentation
 */

// Main exports
export { NodeLoader } from './loader';
export { createPolingo } from './create';
export { polingoMiddleware } from './middleware';
export { TranslationWatcher } from './watcher';

// Type exports
export type { CreatePolingoOptions, PolingoInstance } from './create';
export type { MiddlewareOptions, PolingoRequest } from './middleware';

// Re-export commonly used types from core
export type {
  Translation,
  TranslationCatalog,
  TranslationLoader,
  TranslationCache,
  PolingoConfig,
  TranslateOptions,
} from '@polingo/core';
