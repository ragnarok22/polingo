---
outline: deep
---

# Runtime Translators

At the heart of Polingo is the `Translator` class exported by `@polingo/core`. The Node and web packages wrap it with environment-specific loaders and caches, but the runtime behavior is shared.

## Loading Catalogs

`createPolingo` (Node/Web) preloads the locales you pass in `locales`. Under the hood it calls:

```ts
await translator.load(['en', 'es', 'fr']);
```

You can call `load` yourself if you instantiate a translator manually. The loader resolves the catalog, converts it into Polingo's internal shape, and stores it in the configured cache.

## Switching Locales

Use `setLocale` to switch at runtime:

```ts
await polingo.setLocale('fr');
polingo.t('Welcome'); // translation from the French catalog
```

If the requested locale has not been loaded yet, the translator automatically loads it before switching.

## Translation Methods

Polingo mirrors the gettext API surface:

| Method                                           | Description                        |
| ------------------------------------------------ | ---------------------------------- |
| `t(msgid, vars?)`                                | Translate a simple string.         |
| `tp(context, msgid, vars?)`                      | Translate with a `msgctxt`.        |
| `tn(msgid, msgidPlural, count, vars?)`           | Translate with plural forms.       |
| `tnp(context, msgid, msgidPlural, count, vars?)` | Combine context and pluralization. |

- Variables in `vars` are interpolated using `{name}` placeholders.
- Plural calls automatically expose the `count` as `{n}` so you do not need to pass it twice.

## Caching Strategy

The translator accepts any object that implements the `TranslationCache` interface with `get`, `set`, `has`, and `clear` methods.

- Node uses `MemoryCache` by default and can be switched to `NoCache`.
- Web uses `LocalStorageCache` when available; otherwise it falls back to an in-memory cache scoped to the tab.
- You can provide your own cache (for example Redis or KV storage) by implementing the interface and passing it to the translator constructor.

Call `translator.clearCache()` to invalidate every cached catalog—a handy step before reloading translations when files change.

## Debugging and Fallbacks

Set `debug: true` in the configuration to see log messages whenever catalogs are loaded, caches are hit, or lookups fail. When a message cannot be found in the active locale, Polingo tries the fallback locale next. If both miss, the source string is returned so your UI remains usable.

## Working with Custom Loaders

All runtime packages accept a `TranslationLoader`. Implement `load(locale, domain)` and return a `TranslationCatalog`. This allows you to fetch translations from databases, APIs, or encrypted bundles while keeping the translation API identical across environments.
