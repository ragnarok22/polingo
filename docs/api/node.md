---
outline: deep
---

# @polingo/node

Node.js runtime utilities that wrap the core translator with filesystem loading, middleware, and hot reloading.

## `createPolingo(options)`

Creates and preloads a `Translator` configured for Node.js. It wires up the filesystem loader, in-memory cache, and optional file watcher.

```ts
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  directory: './locales',
  fallback: 'en',
  cache: true,
  watch: process.env.NODE_ENV === 'development',
});
```

### Options

| Option      | Type       | Default      | Description                                                      |
| ----------- | ---------- | ------------ | ---------------------------------------------------------------- |
| `locale`    | `string`   | —            | Locale used after initialization.                                |
| `locales`   | `string[]` | —            | Locales to preload via `translator.load`.                        |
| `directory` | `string`   | —            | Root folder that contains gettext catalogs.                      |
| `fallback`  | `string`   | `'en'`       | Locale used when a translation key is missing.                   |
| `domain`    | `string`   | `'messages'` | Catalog namespace (`<domain>.po`).                               |
| `cache`     | `boolean`  | `true`       | Toggle the in-memory cache (`MemoryCache`).                      |
| `watch`     | `boolean`  | `false`      | Subscribe to file changes with `TranslationWatcher`.             |
| `debug`     | `boolean`  | `false`      | Emit verbose logs for loading, caching, and fallback operations. |

The returned translator exposes a `stopWatching?: () => Promise<void>` helper when `watch` is enabled so you can clean up on shutdown.

## `NodeLoader`

```ts
import { NodeLoader } from '@polingo/node';

const loader = new NodeLoader('./locales');
const catalog = await loader.load('en', 'messages');
```

- Resolves `<directory>/<locale>/<domain>.po` or `.mo` using `gettext-parser`.
- Converts parsed content into the `TranslationCatalog` shape expected by `@polingo/core`.
- Throws when neither catalog file exists so you can fail fast during startup.

## `polingoMiddleware(options)`

Express/Fastify-compatible middleware that attaches a translator to every incoming request.

```ts
// Inside your Express or Fastify app setup
app.use(
  polingoMiddleware({
    directory: './locales',
    locales: ['en', 'es'],
    fallback: 'en',
    watch: process.env.NODE_ENV !== 'production',
    localeExtractor: (req) => (req.query?.lang as string) ?? 'en',
  })
);
```

### Middleware Options

All `createPolingo` options except `locale` are supported, plus:

| Option            | Type              | Default                                    | Description                                                            |
| ----------------- | ----------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `localeExtractor` | `(req) => string` | Accept-Language header or `?locale=` query | Extracts the locale for the current request.                           |
| `perLocale`       | `boolean`         | `false`                                    | Keep a translator instance per locale instead of reusing a shared one. |

- When `perLocale` is `false`, a shared translator is reused and `setLocale` is called per request.
- When `true`, translators are created on-demand and cached in memory.
- The translator is available as `req.polingo` (type `Translator`).

## `TranslationWatcher`

Low-level helper used by `createPolingo` when `watch: true`.

```ts
const watcher = new TranslationWatcher(translator, './locales', ['en', 'es'], 'messages', true);
watcher.start();
// …
await watcher.stop();
```

- Watches `<locale>/<domain>.po` and `<locale>/<domain>.mo` files using `chokidar`.
- Clears the translator cache and reloads the modified locale when file changes are detected.
- Emits debug logs when `debug` is set to `true`.
