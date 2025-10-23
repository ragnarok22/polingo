---
outline: deep
---

# @polingo/web

Browser-focused adapter that wires the core translator to the Fetch API and an optional `localStorage` cache.

## `createPolingo(options)`

Creates a preloaded translator configured for browser (or edge) environments.

```ts
import { createPolingo } from '@polingo/web';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  loader: { baseUrl: '/i18n' },
  cacheOptions: { ttlMs: 60_000 },
});
```

### Options

| Option         | Type                                                    | Default                | Description                                           |
| -------------- | ------------------------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `locale`       | `string`                                                | —                      | Locale used right after initialization.               |
| `locales`      | `string[]`                                              | —                      | Locales to preload via HTTP.                          |
| `loader`       | [`WebLoaderOptions`](#webloaderoptions)                 | `{ baseUrl: '/i18n' }` | Controls how catalogs are fetched.                    |
| `fallback`     | `string`                                                | `'en'`                 | Fallback locale when lookups miss.                    |
| `domain`       | `string`                                                | `'messages'`           | Catalog namespace.                                    |
| `debug`        | `boolean`                                               | `false`                | Emit console output for loads, misses, and fallbacks. |
| `cache`        | `boolean`                                               | `true`                 | Enable the persistent `LocalStorageCache`.            |
| `cacheOptions` | [`LocalStorageCacheOptions`](#localstoragecacheoptions) | `{}`                   | Configure cache namespace or TTL.                     |

`locales` must contain at least one entry; an error is thrown otherwise so you catch misconfiguration early.

The default loader fetches catalogs from `/i18n`. If your JSON exports live elsewhere, override the path with `loader.baseUrl`
or provide a custom `loader.buildUrl`.

## `WebLoader`

HTTP loader used behind the scenes by `createPolingo`. You can instantiate it directly when composing your own translator.

```ts
import { WebLoader } from '@polingo/web';
import { Translator, NoCache } from '@polingo/core';

const loader = new WebLoader({
  baseUrl: 'https://cdn.example.com/i18n',
  requestInit: { credentials: 'include' },
});

const translator = new Translator(loader, new NoCache(), {
  locale: 'en',
  fallback: 'en',
  domain: 'messages',
});
```

### `WebLoaderOptions`

| Option              | Type                              | Default                | Description                                                     |
| ------------------- | --------------------------------- | ---------------------- | --------------------------------------------------------------- |
| `baseUrl`           | `string`                          | `'/i18n'`              | Base path used to construct `<baseUrl>/<locale>/<domain>.json`. |
| `buildUrl`          | `(locale, domain) => string`      | Derived from `baseUrl` | Override for custom catalog URLs.                               |
| `fetch`             | `typeof fetch`                    | Global `fetch`         | Provide a polyfill (e.g. for SSR).                              |
| `requestInit`       | `RequestInit`                     | `undefined`            | Extra options forwarded to `fetch`.                             |
| `transformResponse` | `(payload) => TranslationCatalog` | Identity               | Convert custom payloads into a catalog shape.                   |

The loader throws when the HTTP request fails (`!response.ok`) or when the payload cannot be coerced into a `TranslationCatalog`.

## `LocalStorageCache`

Cache implementation that persists catalogs in `localStorage` with graceful fallback to an in-memory store when storage is unavailable or full.

```ts
import { LocalStorageCache } from '@polingo/web';

const cache = new LocalStorageCache({ prefix: 'myapp', ttlMs: 5 * 60_000 });
```

### `LocalStorageCacheOptions`

| Option    | Type              | Default                              | Description                                                                |
| --------- | ----------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| `storage` | `Storage \| null` | `window.localStorage` when available | Supply a custom storage implementation.                                    |
| `prefix`  | `string`          | `'polingo'`                          | Prefix used for stored keys.                                               |
| `ttlMs`   | `number`          | `undefined`                          | Time-to-live in milliseconds; when omitted, entries persist until cleared. |

If serialization fails (for example due to storage limits), the cache logs a warning in debug builds and falls back to the in-memory implementation from `@polingo/core`.
