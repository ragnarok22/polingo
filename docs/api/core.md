---
outline: deep
---

# @polingo/core

Framework-agnostic building blocks: the translator class, cache implementations, and helpers that power every runtime package.

## `createTranslator(loader, cache, config)`

Factory that wires a `TranslationLoader`, `TranslationCache`, and runtime configuration into a ready-to-use `Translator`.

```ts
import { createTranslator, MemoryCache } from '@polingo/core';

const translator = createTranslator(customLoader, new MemoryCache(), {
  locale: 'en',
  fallback: 'en',
  domain: 'messages',
});

await translator.load(['en', 'es']);
translator.t('Hello');
```

Use this when you want complete control over loaders and caches (for example in serverless functions or testing).

## `Translator`

Class that performs synchronous lookups against preloaded catalogs.

```ts
import { Translator, NoCache } from '@polingo/core';

const translator = new Translator(customLoader, new NoCache(), {
  locale: 'es',
  fallback: 'en',
  domain: 'messages',
  debug: true,
});
```

### Key Methods

| Method                    | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `load(locales)`           | Asynchronously load one or more locales.                  |
| `setLocale(locale)`       | Switch the active locale; automatically loads if missing. |
| `getLocale()`             | Return the current locale.                                |
| `hasLocale(locale)`       | Check if a locale is already loaded.                      |
| `clearCache()`            | Invalidate the underlying cache.                          |
| `t` / `tp` / `tn` / `tnp` | Translation helpers mirroring gettext semantics.          |

## Cache Implementations

`@polingo/core` ships three caches that satisfy the `TranslationCache` contract:

- `MemoryCache` – In-memory `Map` with basic `get`, `set`, `has`, and `clear`.
- `TtlCache` – Extends `MemoryCache` with per-entry expiration.
- `NoCache` – Passthrough implementation when you want fresh catalogs every time.

You can also provide your own cache implementation if you need to persist translations.

## Helpers

- `interpolate(msg, vars)` – Replace `{name}` placeholders with corresponding values.
- `getPluralIndex(count, locale)` – Derive the plural form index using gettext plural rules.

These helpers are exported separately so you can reuse them in custom tooling or tests.

## Types

The following TypeScript types are available:

- `PolingoConfig` – Configuration object accepted by the translator.
- `TranslationLoader` – Interface describing `load(locale, domain)`.
- `TranslationCache` – Interface implemented by caches.
- `Translation` and `TranslationCatalog` – Internal representation of parsed catalogs.
- `TranslateOptions` – Advanced flags accepted by lower-level API surface.

Use them to ensure custom loaders, caches, or utilities stay type-safe across packages.
