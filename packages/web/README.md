# @polingo/web

> Browser-oriented loader and cache for the Polingo translation engine.

`@polingo/web` bundles a Fetch-based loader and a resilient `localStorage` cache so you can use `@polingo/core` inside traditional SPAs, server-rendered apps that hydrate on the client, or edge runtimes with a compatible fetch implementation.

## Contents

1. [What it does](#what-it-does)
2. [Installation](#installation)
3. [Quick start](#quick-start)
4. [Loader options](#loader-options)
5. [Caching behaviour](#caching-behaviour)
6. [Usage patterns](#usage-patterns)
7. [Catalog format](#catalog-format)
8. [Tips & gotchas](#tips--gotchas)
9. [Related packages](#related-packages)
10. [License](#license)

## What it does

- Downloads catalogs via the Fetch API with sensible defaults (`/locales/<locale>/<domain>.json`).
- Lets you provide a custom `buildUrl`, `fetch`, and `RequestInit` for CDNs or authenticated endpoints.
- Ships a storage-backed cache that transparently falls back to memory when `localStorage` is unavailable.
- Works together with `@polingo/core` to provide synchronous translations after the initial preload.
- Fully typed TypeScript API—great for Next.js, Remix, Astro, Vite, and more.

## Installation

```bash
npm install @polingo/core @polingo/web
# or
pnpm add @polingo/core @polingo/web
# or
yarn add @polingo/core @polingo/web
```

## Quick start

```typescript
import { createPolingo } from '@polingo/web';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  loader: { baseUrl: '/i18n' }, // fetches /i18n/en/messages.json, etc.
  cache: true,
  cacheOptions: { prefix: 'my-app', ttlMs: 86_400_000 }, // 24h
});

polingo.t('Welcome');
polingo.tn('{n} item', '{n} items', 3, { n: 3 });
```

## Loader options

`WebLoader` powers `createPolingo` under the hood. You can customise it through the `loader` key or instantiate it yourself.

```typescript
interface WebLoaderOptions {
  baseUrl?: string; // defaults to '/locales'
  buildUrl?: (locale: string, domain: string) => string; // overrides baseUrl
  fetch?: typeof fetch; // provide for older browsers, React Native, SSR, or tests
  requestInit?: RequestInit; // extra options (credentials, headers, cache directives, ...)
  transformResponse?: (payload: unknown) => TranslationCatalog; // adapt bespoke formats
}
```

Example: streaming from a CDN with authentication.

```typescript
const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'fr'],
  loader: {
    buildUrl: (locale, domain) => `https://cdn.example.com/static/i18n/${locale}/${domain}.json`,
    requestInit: {
      credentials: 'include',
      cache: 'reload',
    },
  },
});
```

## Caching behaviour

`createPolingo` enables caching by default (`cache: true`). Behind the scenes it uses `LocalStorageCache`, which offers:

- `prefix` to namespace entries (defaults to `polingo`).
- `ttlMs` to automatically expire catalogs (unset means persist indefinitely).
- `storage` to swap the backing store (useful for testing).

When `localStorage` is unavailable (SSR, Safari private mode, locked-down WebViews), the cache drops down to an in-memory `MemoryCache` so translations continue to work, albeit without persistence between reloads.

Disable caching with `cache: false` if your catalogs are short-lived or you control caching via HTTP headers.

## Usage patterns

### Single Page Applications

- Preload the locales you need during app bootstrap to keep translations synchronous.
- Combine with client-side routing to lazily switch locales via `await polingo.setLocale(locale)`.

### Server-Side Rendering / Hydration

- Run `createPolingo` only on the client if `localStorage` is required.
- For SSR-only environments, manually construct a `Translator` with `WebLoader` and `NoCache`, then hydrate with `createPolingo` on the client for persistence.

### Edge runtimes or React Native

- Pass an explicit `fetch` implementation (e.g., from `undici`, `cross-fetch`, or the platform) through `loader.fetch`.
- Swap the cache for an in-memory implementation if the target does not support `localStorage`.

## Catalog format

By default the loader expects JSON that matches `TranslationCatalog` from `@polingo/core`:

```json
{
  "charset": "utf-8",
  "headers": {
    "Plural-Forms": "nplurals=2; plural=(n != 1);"
  },
  "translations": {
    "": {
      "Welcome": {
        "msgid": "Welcome",
        "msgstr": "Bienvenido"
      }
    },
    "menu": {
      "File": {
        "msgid": "File",
        "msgctxt": "menu",
        "msgstr": "Archivo"
      }
    }
  }
}
```

If your backend returns a different shape, use `transformResponse` to convert it before it reaches the translator.

## Tips & gotchas

- Serve catalogs with far-future cache headers and rely on `ttlMs` to refresh them periodically.
- Handle fetch failures gracefully by catching `createPolingo` errors during startup and surfacing a user-friendly fallback.
- When bundling with Vite or Webpack, you can import static catalogs and feed them to a custom loader for fully offline behaviour.
- Use the same domain names (`messages`, `errors`, etc.) clients expect—catalog URLs are derived from the domain.

## Related packages

- [`@polingo/core`](../core) – translation runtime (`Translator`, caches, helpers).
- [`@polingo/node`](../node) – filesystem loader, middleware, and watcher for Node.js.
- [`@polingo/react`](../react) – bindings for React applications (coming soon).
- [`@polingo/cli`](../cli) – extraction and compilation tooling (coming soon).

## License

MIT © Reinier Hernández Avila
