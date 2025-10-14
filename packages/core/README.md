# @polingo/core

> Environment-agnostic translation engine that powers every Polingo adapter.

`@polingo/core` provides the runtime that loads catalogs, resolves plural forms, interpolates variables, and caches translations. It ships without any I/O so it can run in Node.js, browsers, React Native, edge runtimes, and test environments alike.

## Contents

1. [What it does](#what-it-does)
2. [Installation](#installation)
3. [Quick start](#quick-start)
4. [Core concepts](#core-concepts)
5. [API cheatsheet](#api-cheatsheet)
6. [Catalog format](#catalog-format)
7. [Interpolation & pluralization](#interpolation--pluralization)
8. [Best practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Related packages](#related-packages)
11. [License](#license)

## What it does

- Works with any loader that returns a `TranslationCatalog`.
- Ships zero runtime dependencies and stays framework-free.
- Exposes sync translation calls after the initial async preload.
- Includes ready-to-use caches (`MemoryCache`, `TtlCache`, `NoCache`).
- Provides first-class TypeScript definitions for the entire surface area.

## Installation

```bash
npm install @polingo/core
# or
pnpm add @polingo/core
# or
yarn add @polingo/core
```

## Quick start

```typescript
import { createTranslator, MemoryCache } from '@polingo/core';

// Provide your own loader (see @polingo/node, @polingo/web, etc.)
const loader = {
  async load(locale: string, domain: string) {
    const catalog = await fetchCatalogSomehow(locale, domain);
    return catalog;
  },
};

const translator = createTranslator(loader, new MemoryCache(), {
  locale: 'es',
  fallback: 'en',
  domain: 'messages',
  debug: false,
});

// Preload the catalogs you intend to use
await translator.load(['es', 'en']);

// Synchronous translations everywhere else
translator.t('Hello'); // => "Hola"
translator.t('Welcome, {name}!', { name: 'María' });
translator.tn('{n} item', '{n} items', 5, { n: 5 });
translator.tnp('cart', '{n} item', '{n} items', 3, { n: 3 });
```

## Core concepts

### Translator lifecycle

`Translator` instances orchestrate loading, caching, and runtime translation. Use the factory `createTranslator` or construct the class directly if you want full control.

- `await translator.load(locales)` must be called before the first translation.
- `await translator.setLocale(locale)` changes the active locale and ensures it is loaded.
- `translator.clearCache()` invalidates all cached catalogs.

### Translation loaders

A loader is any object that implements:

```typescript
interface TranslationLoader {
  load(locale: string, domain: string): Promise<TranslationCatalog>;
}
```

Adapters such as `@polingo/node` and `@polingo/web` provide production-ready loaders. You can provide your own to fetch from a database, GraphQL endpoint, or in-memory fixtures during tests.

### Cache strategies

- `MemoryCache(maxSize?: number)` – in-memory cache with optional LRU behaviour.
- `TtlCache(ttlMs?: number)` – expiring cache that eagerly prunes stale entries.
- `NoCache` – passthrough implementation that always misses (great for testing).

All caches implement the shared `TranslationCache` contract and can be swapped freely.

## API cheatsheet

### Creation

```typescript
createTranslator(loader, cache, config);
new Translator(loader, cache, config);
```

`config` accepts:

```typescript
interface PolingoConfig {
  locale: string;
  fallback?: string;
  domain?: string;
  debug?: boolean;
}
```

### Runtime methods

| Method                                                 | Purpose                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `await translator.load(locales)`                       | Load one or more locales up front.                        |
| `await translator.setLocale(locale)`                   | Switch the active locale and load on demand.              |
| `translator.getLocale()`                               | Inspect the active locale.                                |
| `translator.hasLocale(locale)`                         | Check whether the catalog is already loaded.              |
| `translator.t(msgid, vars?)`                           | Translate a singular message with optional interpolation. |
| `translator.tp(context, msgid, vars?)`                 | Translate within a gettext context.                       |
| `translator.tn(msgid, plural, count, vars?)`           | Translate plural forms.                                   |
| `translator.tnp(context, msgid, plural, count, vars?)` | Context + plural in one call.                             |
| `translator.clearCache()`                              | Flush the cache implementation.                           |

All translation helpers accept an optional `vars` map for interpolation.

## Catalog format

Catalogs follow the `TranslationCatalog` interface:

```typescript
interface TranslationCatalog {
  charset: string;
  headers: Record<string, string>;
  translations: {
    [context: string]: {
      [msgid: string]: {
        msgid: string;
        msgstr: string | string[];
        msgctxt?: string;
        msgid_plural?: string;
      };
    };
  };
}
```

Example JSON payload:

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

## Interpolation & pluralization

- Placeholders use `{variable}` syntax and accept any stringifiable value.
- Plural rules are derived from CLDR data for languages including English, Spanish, French, German, Polish, Russian, Ukrainian, Czech, Slovak, Romanian, Arabic, Chinese, Japanese, Korean, Thai, Vietnamese, Indonesian, Malay, and more. Unknown locales default to the standard singular/plural rule.
- Use `translator.tn` and `translator.tnp` to benefit from locale-specific plural forms automatically.

You can reuse the underlying helpers directly:

```typescript
import { interpolate, getPluralIndex } from '@polingo/core';
```

## Best practices

- Preload the locales you need during application bootstrap instead of per request.
- Keep `fallback` set to a language with full coverage (usually `en`).
- Use gettext contexts for ambiguous strings instead of duplicating message IDs.
- Pair `TtlCache` with periodic `prune()` calls when translations change frequently.
- Enable `debug: true` while developing to log missing translations.

## Troubleshooting

- **Missing catalog** – ensure your loader returns a valid `TranslationCatalog` and that the path/domain combination exists.
- **Outdated translations** – call `translator.clearCache()` or disable caching temporarily.
- **Unexpected plural form** – double-check the locale code (`pt` vs `pt-BR`) and message plural strings in your catalog.

## Related packages

- [`@polingo/node`](../node) – filesystem loader, middleware, and watcher for Node.js.
- [`@polingo/web`](../web) – fetch-based loader with a localStorage cache.
- [`@polingo/react`](../react) – hooks and provider for React applications.
- [`@polingo/cli`](../cli) – command line tools for extraction, validation, and compilation.

## License

MIT © Reinier Hernández Avila
