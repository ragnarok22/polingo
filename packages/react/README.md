# @polingo/react

> React bindings for the Polingo translation engine. _(Work in progress)_

The React package will provide idiomatic hooks, context providers, and suspense-friendly helpers built on top of `@polingo/core`. It is not ready for production yet; the module currently only exists as a placeholder while the API takes shape.

## Design goals

- Simple provider that makes a `Translator` available to any component tree.
- Hooks such as `useTranslator()` and `useTranslate()` with automatic re-render when the locale changes.
- Server Components support for frameworks like Next.js and Remix.
- Optional suspense-based loaders to defer translation until catalogs are ready.

## Current status

- No runtime code is published yet—imports will resolve to an empty module.
- Documentation, types, and testing strategy are still being drafted.
- Expect breaking changes between prereleases while we iterate on ergonomics.

## How to contribute

We welcome early feedback on API shape and ecosystem integration. Please open an issue with:

- Scenarios you would like first-class support for (e.g., SSR, React Native, React Server Components).
- Existing i18n patterns you would like to migrate from.
- Performance constraints we should keep in mind (bundle size, re-render frequency, etc.).

## Related packages

- [`@polingo/core`](../core) – translation runtime shared by all adapters.
- [`@polingo/node`](../node) – filesystem loader, middleware, and watcher for Node.js.
- [`@polingo/web`](../web) – fetch-based loader for browsers that pairs well with React.
- [`@polingo/cli`](../cli) – forthcoming command line tooling.

## License

MIT © Reinier Hernández Avila
