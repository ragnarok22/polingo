# @polingo/node

[![npm version](https://img.shields.io/npm/v/%40polingo%2Fnode.svg)](https://www.npmjs.com/package/@polingo/node)

> Node.js adapter that loads gettext catalogs from disk, watches for changes, and plugs into web frameworks.

`@polingo/node` combines a filesystem loader, optional hot-reload watcher, and helper utilities so you can bootstrap Polingo in backend services, CLIs, Electron apps, or server-rendered frameworks.

## Contents

1. [What it does](#what-it-does)
2. [Installation](#installation)
3. [Quick start](#quick-start)
4. [Directory layout](#directory-layout)
5. [API overview](#api-overview)
6. [Framework recipes](#framework-recipes)
7. [Hot reload & deployment tips](#hot-reload--deployment-tips)
8. [Troubleshooting](#troubleshooting)
9. [Related packages](#related-packages)
10. [License](#license)

## What it does

- Parses `.po` and `.mo` catalogs with [`gettext-parser`](https://github.com/smhg/gettext-parser).
- Provides `createPolingo` for one-call setup (loader, cache, preload, optional watcher).
- Exposes `NodeLoader` if you need to wire things manually.
- Ships an Express/Fastify-compatible `polingoMiddleware` with locale detection.
- Includes `TranslationWatcher` for chokidar-based hot reloading during development.
- Designed for TypeScript with rich types carried through from `@polingo/core`.

## Installation

```bash
npm install @polingo/core @polingo/node
# or
pnpm add @polingo/core @polingo/node
# or
yarn add @polingo/core @polingo/node
```

## Quick start

```typescript
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  directory: './locales',
  fallback: 'en',
  cache: true,
  watch: process.env.NODE_ENV === 'development',
});

polingo.t('Hello, world!');
polingo.tn('{n} file', '{n} files', 3, { n: 3 });
```

Call `polingo.stopWatching?.()` on shutdown if you enabled `watch: true`.

## Directory layout

The loader accepts either of the common gettext layouts:

```
locales/
├── en/
│   ├── messages.po
│   └── errors.po
└── es/
    └── LC_MESSAGES/
        ├── messages.mo
        └── errors.mo
```

Internally the loader first tries `<locale>/<domain>.po` and falls back to `<locale>/<domain>.mo`.

## API overview

### `createPolingo(options: CreatePolingoOptions)`

Convenience helper that configures the loader, cache, domain, preload list, and optional watcher in one await.

```typescript
interface CreatePolingoOptions {
  locale: string; // current locale
  locales: string[]; // locales to preload during init
  directory: string; // root folder that holds locale subfolders
  fallback?: string; // defaults to 'en'
  domain?: string; // defaults to 'messages'
  cache?: boolean; // MemoryCache when true, NoCache when false
  watch?: boolean; // enables chokidar watcher
  debug?: boolean; // console logging for missing catalogs, watcher events
}
```

Returns a `Translator` from `@polingo/core` extended with an optional `stopWatching()` method.

### `NodeLoader`

Low-level loader if you prefer constructing translators yourself:

```typescript
import { NodeLoader } from '@polingo/node';
import { Translator, MemoryCache } from '@polingo/core';

const loader = new NodeLoader('./locales');
const translator = new Translator(loader, new MemoryCache(), {
  locale: 'en',
  fallback: 'en',
});

await translator.load(['en', 'es']);
```

### `polingoMiddleware(options: MiddlewareOptions)`

Drop-in Express/Fastify middleware that attaches a translator to `req.polingo`.

- Detects the locale from `req.query.locale` or the `Accept-Language` header by default.
- Supports `perLocale: true` to keep individual translator instances per locale.
- Accepts the same preload, directory, cache, and watch options as `createPolingo`.

```typescript
app.use(
  polingoMiddleware({
    locales: ['en', 'es'],
    directory: './locales',
    fallback: 'en',
    debug: process.env.NODE_ENV !== 'production',
  })
);
```

### `TranslationWatcher`

Wires [`chokidar`](https://github.com/paulmillr/chokidar) to re-load catalogs whenever matching `.po` or `.mo` files change. Normally you do not need to interact with it directly—`createPolingo({ watch: true })` handles the setup.

## Framework recipes

### Express

```typescript
import express from 'express';
import { polingoMiddleware } from '@polingo/node';

const app = express();

app.use(
  polingoMiddleware({
    locales: ['en', 'es'],
    directory: './locales',
    fallback: 'en',
  })
);

app.get('/', (req, res) => {
  res.send(req.polingo.t('Welcome to Polingo!'));
});
```

### Fastify

```typescript
import Fastify from 'fastify';
import { polingoMiddleware } from '@polingo/node';

const fastify = Fastify();
fastify.addHook('onRequest', polingoMiddleware({ locales: ['en', 'es'], directory: './locales' }));

fastify.get('/', async (req) => {
  return { message: req.polingo.t('Hello from Fastify') };
});
```

### Next.js route handlers / API routes

Create once and reuse between requests to avoid repeated disk IO:

```typescript
import { createPolingo } from '@polingo/node';

let nodePolingo: Awaited<ReturnType<typeof createPolingo>> | null = null;

async function getPolingo() {
  if (!nodePolingo) {
    nodePolingo = await createPolingo({
      locale: 'en',
      locales: ['en', 'es'],
      directory: './locales',
    });
  }
  return nodePolingo;
}
```

## Hot reload & deployment tips

- Enable `watch: true` only in development. File-system watchers keep extra descriptors open and may not be supported on serverless providers.
- On change events the watcher clears the cache and re-loads the affected locale automatically. If you persist catalogs elsewhere, disable caching with `cache: false` and manage reloads manually.
- Compile `.po` files to `.mo` for production to reduce parsing cost (use `msgfmt` or `@polingo/cli` once it lands).
- Call `await polingo.stopWatching?.()` during graceful shutdown to release chokidar resources.

## Troubleshooting

- **`Translation file not found`** – verify your `directory` and ensure both `<locale>/<domain>.po` and `<locale>/LC_MESSAGES/<domain>.po` variants are present if you rely on gettext structure.
- **`Invalid .po file`** – run `msgfmt -c` or a lint tool before deployment; parsing errors bubble up from `gettext-parser`.
- **High memory usage with many locales** – disable caching (`cache: false`) or supply a `MemoryCache` with a `maxSize`.
- **Locale fallback not respected** – make sure the `fallback` locale is included in the `locales` preload array so it is available immediately.

## Related packages

- [`@polingo/core`](../core) – translation runtime (`Translator`, caches, helpers).
- [`@polingo/web`](../web) – fetch-based loader with localStorage cache for browsers.
- [`@polingo/react`](../react) – React hooks, context provider, and Trans component.
- [`@polingo/cli`](../cli) – command line tooling for extraction, compilation, and validation.

## License

MIT © Reinier Hernández Avila
