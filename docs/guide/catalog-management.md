---
outline: deep
---

# Catalog Management

Polingo speaks gettext natively, so you can reuse the `.po` and `.mo` files produced by translators or localization platforms. This page covers how catalogs are discovered, organized, and validated.

## Directory Layout

By default, loaders look for catalogs using the pattern `<directory>/<locale>/<domain>.(po|mo)`. A typical project structure looks like:

```
locales/
├─ en/
│  └─ messages.po
├─ es/
│  └─ messages.po
└─ fr/
   └─ messages.mo
```

- `directory` corresponds to the `directory` option passed to `createPolingo` (Node) or the `baseUrl` passed to the web loader.
- `locale` is a language or locale tag (`en`, `es`, `pt-BR`, …). The translator uses the part before the hyphen when computing plural rules.
- `domain` represents a catalog namespace. The default is `messages`, but you can create additional catalogs such as `emails` or `admin`.

## Domains and Fallbacks

- **Domains** let you split large projects into smaller catalogs. Pass `domain: 'admin'` when creating the translator to load `admin.po`.
- **Fallback locales** kick in when a key is missing. Set `fallback: 'en'` to always fall back to English strings.
- To pre-load multiple catalogs up front, call `translator.load(['en', 'es'])` (already handled for you by the convenience creators).

## Handling `.po` vs `.mo`

`NodeLoader` prefers `.po` files and falls back to `.mo` if a `.po` catalog is absent. This allows you to deploy either source catalogs or their compiled binary equivalents without changing configuration.

The web loader expects JSON. Convert your gettext catalogs during your build process—using tools such as [`gettext-parser`](https://github.com/smhg/gettext-parser), [`po2json`](https://github.com/mikeedwards83/po2json), or custom scripts—and expose them at the URLs consumed by the loader.

## Plurals and Context

Polingo reads plural definitions and contexts directly from gettext headers:

- `tn`/`tnp` pick the correct plural form based on the rule declared in the catalog headers.
- `tp`/`tnp` resolve messages by both context (`msgctxt`) and identifier (`msgid`), letting you disambiguate strings that share the same source text.

If a translation is missing, the translator falls back to the source string while still interpolating variables.

## Keeping Catalogs Fresh

- Run extraction tools (such as Babel plugins or custom scripts) to update `.po` files with new strings.
- Encourage translators to keep gettext headers up to date—especially `Plural-Forms`, since Polingo relies on it for correct pluralization.
- When working in Node.js, enable `watch: true` so changed catalogs are reloaded automatically. See [Development Workflow](/guide/development-workflow) for details.
