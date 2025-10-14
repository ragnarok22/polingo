---
outline: deep
---

# Development Workflow

Polingo ships with tooling that streamlines the iteration loop while keeping translations accurate. This page highlights recommended practices for local development.

## Hot Reloading Catalogs (Node)

Enable the built-in watcher to pick up changes the moment a `.po` or `.mo` file is saved:

```ts
const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  directory: './locales',
  watch: process.env.NODE_ENV === 'development',
  debug: true,
});

// Later when shutting down the app
await polingo.stopWatching?.();
```

`TranslationWatcher` relies on `chokidar` and clears the cache before reloading the modified catalog, so your application sees the new translations on the next lookup.

## Working in the Browser

Translations are cached in `localStorage` by default. During development you can disable the persistent cache to see updates instantly:

```ts
const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  loader: { baseUrl: '/locales' },
  cache: false,
  debug: true,
});
```

Alternatively, keep the cache and call `localStorage.clear()` when you publish fresh catalogs.

## Debug Logging

Set `debug: true` in any environment to receive detailed console output whenever catalogs are loaded, cache hits occur, or fallbacks trigger. This is especially useful when tracking down missing translations or confirming that plural rules are being applied.

## Recommended Scripts

The repository includes a Makefile and pnpm scripts that keep the monorepo healthy:

- `pnpm lint` – ESLint with type-aware rules across every package.
- `pnpm format:check` – ensure Markdown, JSON, and TypeScript files follow Prettier formatting.
- `pnpm typecheck` – run TypeScript project references to surface type issues early.
- `make test` – execute Vitest suites colocated with each package.

Run these regularly—especially before publishing catalogs or shipping new integrations—to detect regressions early.

## Shipping Updates

1. Extract fresh source strings and update your `.po` catalogs.
2. Run translators' workflows (Poedit, Weblate, Transifex, etc.) to gather approved translations.
3. Commit `.po` files; optionally compile `.mo` files for production.
4. Verify the runtime by running your test suite or the relevant example applications.
5. Build distributable bundles with `pnpm build` before pushing to CI.
