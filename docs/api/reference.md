---
outline: deep
---

# Full API Reference

This page aggregates every public export across the Polingo packages. Jump to the runtime you use most and cross-reference the more detailed package-specific pages when you need examples.

## Package map

| Package         | Description                                                             | Entry point              |
| --------------- | ----------------------------------------------------------------------- | ------------------------ |
| `@polingo/core` | Framework-agnostic translator, caches, helpers, and shared types        | [`/api/core`](/api/core) |
| `@polingo/node` | Filesystem loader, middleware, and development tooling for Node.js      | [`/api/node`](/api/node) |
| `@polingo/web`  | Fetch-based loader, persistent cache, and edge/browser convenience APIs | [`/api/web`](/api/web)   |

## Core exports (`@polingo/core`)

- `createTranslator(loader, cache, config)` – Factory that wires dependencies into a ready-to-use `Translator`.
- `Translator` – Class exposing `load`, `setLocale`, `t`, `tn`, `tp`, `tnp`, and cache utilities.
- `interpolate(message, vars)` – Replace `{name}` placeholders with runtime values.
- `getPluralIndex(count, locale)` – Resolve gettext plural forms for a locale.
- Cache implementations: `MemoryCache`, `TtlCache`, `NoCache`.

### Configuration

```ts
type PolingoConfig = {
  locale: string;
  fallback: string;
  domain?: string;
  debug?: boolean;
};
```

- `locale` and `fallback` are required, ensuring every lookup resolves.
- `domain` defaults to `'messages'`.
- When `debug` is `true`, loader, cache, and fallback operations log to the console.

### Types to implement custom tooling

- `TranslationLoader` – Objects with a `load(locale, domain)` method returning a `TranslationCatalog`.
- `TranslationCache` – Interface that supports `get`, `set`, `has`, and `clear`.
- `TranslationCatalog` – Internal representation of parsed gettext catalogs; use it for build pipelines.

## Node runtime (`@polingo/node`)

- `createPolingo(options)` – Pre-configured translator that loads catalogs from disk and optionally watches for changes.
- `NodeLoader` – Low-level filesystem loader; accepts a base directory and reads `.po/.mo` files.
- `polingoMiddleware(options)` – Express/Fastify middleware that attaches a translator per request.
- `TranslationWatcher` – File watcher used internally when `watch: true`, exposed for custom setups.

### `createPolingo` options

| Option      | Type       | Default      | Notes                                                           |
| ----------- | ---------- | ------------ | --------------------------------------------------------------- |
| `locale`    | `string`   | —            | Locale that becomes active after initialization.                |
| `locales`   | `string[]` | —            | All locales that should be preloaded.                           |
| `directory` | `string`   | —            | Folder that contains `<locale>/<domain>.po` catalogs.           |
| `fallback`  | `string`   | `'en'`       | Locale used when a translation is missing.                      |
| `domain`    | `string`   | `'messages'` | Catalog namespace.                                              |
| `cache`     | `boolean`  | `true`       | Toggle the `MemoryCache`.                                       |
| `watch`     | `boolean`  | `false`      | Rebuild catalogs when files change (uses `TranslationWatcher`). |
| `debug`     | `boolean`  | `false`      | Emit verbose logs for loads, writes, and cache hits.            |

`polingoMiddleware` accepts every `createPolingo` option except `locale` plus:

- `localeExtractor(req): string` – Decide the locale per request (defaults to `?locale=` or the `Accept-Language` header).
- `perLocale` (`boolean`) – Create dedicated translators per locale instead of reusing one global instance.

## Web runtime (`@polingo/web`)

- `createPolingo(options)` – Preconfigured translator that fetches catalogs over HTTP and caches the payload.
- `WebLoader` – Loader that turns HTTP responses into `TranslationCatalog` objects.
- `LocalStorageCache` – Adapter that persists catalogs in `localStorage` and gracefully falls back to memory.

### `createPolingo` options

| Option         | Type                       | Default                   | Notes                                                           |
| -------------- | -------------------------- | ------------------------- | --------------------------------------------------------------- |
| `locale`       | `string`                   | —                         | Locale that becomes active after initialization.                |
| `locales`      | `string[]`                 | —                         | Locales that should be preloaded via HTTP.                      |
| `loader`       | `WebLoaderOptions`         | `{ baseUrl: '/locales' }` | Configure catalog URLs, fetch options, and transformers.        |
| `fallback`     | `string`                   | `'en'`                    | Locale used when a translation misses.                          |
| `domain`       | `string`                   | `'messages'`              | Catalog namespace.                                              |
| `cache`        | `boolean`                  | `true`                    | Disable to skip persistence and use an in-memory cache instead. |
| `cacheOptions` | `LocalStorageCacheOptions` | `{}`                      | Control the storage prefix and TTL.                             |
| `debug`        | `boolean`                  | `false`                   | Log loads, misses, and fallbacks to the console.                |

`WebLoaderOptions` include `baseUrl`, `buildUrl`, `fetch`, `requestInit`, and `transformResponse`. `LocalStorageCacheOptions` include `storage`, `prefix`, and `ttlMs`.

## Shared patterns

Across packages, translators expose:

- `await translator.load(locales)` – Ensure catalogs are in memory.
- `await translator.setLocale(locale)` – Switch the active locale (loads on demand).
- `translator.t(msgId, variables?)` – Singular lookups with optional interpolation.
- `translator.tn(msgId, pluralId, count, variables?)` – Plural lookups with gettext semantics.
- `translator.clearCache()` – Reset caches; useful in tests or hot-reload flows.

When you only need typed helpers, import from `@polingo/core` even inside Node or browser projects. It keeps bundles slim and eliminates duplicate loader logic.
