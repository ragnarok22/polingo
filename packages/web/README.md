# @polingo/web

> Browser adapter for Polingo – Fetch loader with localStorage cache

The web package provides a Fetch-powered loader and localStorage cache so Polingo works seamlessly in browsers and edge runtimes.

## Installation

```bash
npm install @polingo/core @polingo/web
# or
pnpm add @polingo/core @polingo/web
# or
yarn add @polingo/core @polingo/web
```

## Quick Start

```typescript
import { createPolingo } from '@polingo/web';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  loader: { baseUrl: '/locales' }, // looks for /locales/<locale>/messages.json
});

console.log(polingo.t('Hello')); // "Hola"
```

## Catalog Format

`WebLoader` expects JSON compatible with `TranslationCatalog`:

```json
{
  "charset": "utf-8",
  "headers": {
    "Plural-Forms": "nplurals=2; plural=(n != 1);"
  },
  "translations": {
    "": {
      "Hello": {
        "msgid": "Hello",
        "msgstr": "Hola"
      },
      "{n} item": {
        "msgid": "{n} item",
        "msgid_plural": "{n} items",
        "msgstr": ["{n} artículo", "{n} artículos"]
      }
    }
  }
}
```

Generate these files at build time (e.g., with `@polingo/node`, `@polingo/cli`, or your own pipeline) and serve them from a CDN or static directory.

## API Overview

### `createPolingo(options)`

Creates a `Translator` configured for browser usage.

```typescript
const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'fr'],
  fallback: 'en',
  loader: {
    baseUrl: '/i18n',
    requestInit: { cache: 'reload' },
  },
  cacheOptions: { prefix: 'my-app', ttlMs: 86_400_000 }, // 24 hours
});
```

### `WebLoader`

Reusable loader if you want to wire Polingo manually:

```typescript
import { WebLoader, LocalStorageCache } from '@polingo/web';
import { Translator } from '@polingo/core';

const loader = new WebLoader({
  buildUrl: (locale, domain) => `https://cdn.example.com/i18n/${locale}/${domain}.json`,
});

const cache = new LocalStorageCache({ prefix: 'cdn-polingo' });
const translator = new Translator(loader, cache, {
  locale: 'en',
  fallback: 'en',
});

await translator.load(['en', 'fr']);
```

### `LocalStorageCache`

Implements the `TranslationCache` interface on top of `localStorage`. It handles TTL, namespace isolation, and gracefully falls back to an in-memory cache when `localStorage` is unavailable (e.g., during SSR).

## Best Practices

- Host catalogs on a CDN for faster delivery and enable immutable caching.
- Use `ttlMs` to periodically refresh translations without forcing full reloads.
- Provide a custom `fetch` implementation when running in non-browser environments (e.g., React Native, edge runtimes).

## License

MIT © [Reinier Hernández](../../LICENSE)
