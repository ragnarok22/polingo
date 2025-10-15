---
outline: deep
---

# Polingo vs i18next & react-intl

Many teams already use i18next or react-intl. This comparison highlights where Polingo fits and how it complements existing tooling.

## Key differences

| Capability             | Polingo                                                | i18next                                            | react-intl                               |
| ---------------------- | ------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------- |
| Catalog format         | Standard gettext (`.po`/`.mo`)                         | JSON, ICU, optional gettext plugins                | ICU message format (`.json`/`.js`)       |
| Runtime coverage       | Node.js, browsers, edge runtimes via one core          | Wide ecosystem adapters, browser-first origin      | React components and hooks               |
| Pluralization rules    | gettext plurals, compiled from catalogs                | MessageFormat/CLDR-based plurals                   | ICU plurals                              |
| Translation workflow   | Works with established gettext tools (Poedit, Weblate) | Rich plugin ecosystem, custom pipeline per project | Requires external tooling for extraction |
| Cache strategies       | In-memory, TTL, LocalStorage out of the box            | Depends on adapter (memory, LocalStorage, custom)  | Relies on React state/context            |
| Middleware integration | Express/Fastify middleware included                    | Community middlewares; requires configuration      | None (focuses on React rendering)        |
| CLI tooling            | Extract, compile, validate                             | `i18next-scanner`, `locize-cli`, community tools   | Babel/AST extraction via `formatjs` CLI  |
| TypeScript experience  | Strict types, generics for loaders/caches              | TypeScript support via helpers                     | TS types for components and hooks        |

## When Polingo shines

- You collaborate with translators who already use gettext-based workflows.
- You need the same translation engine on the server, the client, and in serverless or edge functions.
- You prefer explicit, file-based catalogs that can be diffed and reviewed in version control.
- You want a CLI that can extract, compile, and validate without additional config.

## Migration tips

- **From i18next**: export existing resources to gettext using `i18next-conv`, then drop them under `locales/<locale>/<domain>.po`. Replace translation calls (`t('key')`) with gettext-style `polingo.t('Message')`. Keep interpolation keys identical to avoid diff churn.
- **From react-intl**: use `formatjs` to export messages, convert them to `.po` with `formatjs compile --format=po`, and reuse the resulting catalogs with `@polingo/web` or `@polingo/react`.

## Interoperability

Polingo is not mutually exclusive with other libraries. Many teams:

- Keep existing i18next-powered UIs and introduce Polingo in new services that benefit from gettext catalogs.
- Use `@polingo/core` in a Node.js backend while continuing to render React components with react-intl until the migration is complete.
- Reuse exported JSON catalogs from Polingo in legacy pipelines by compiling with `pnpm exec polingo compile locales/es --format json`.

Focus on the workflow improvements you need first—catalog consolidation, better middleware, or a consistent CLI—and bring other runtimes over incrementally.
