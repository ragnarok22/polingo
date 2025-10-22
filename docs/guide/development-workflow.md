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
  loader: { baseUrl: '/i18n' },
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

## Fuzzy Matching for Translation Updates

When you run `polingo extract`, fuzzy matching is enabled by default to intelligently handle changes to your translatable strings. This feature works similarly to GNU gettext's `msgmerge` command:

```bash
# Extract with default fuzzy matching (threshold: 0.6)
pnpm exec polingo extract src --locales locales

# Adjust sensitivity - higher threshold = stricter matching
pnpm exec polingo extract src --locales locales --fuzzy-threshold 0.8

# Disable fuzzy matching completely
pnpm exec polingo extract src --locales locales --no-fuzzy
```

### How Fuzzy Matching Works

1. **Exact matches** - When source strings haven't changed, references are updated and existing `#, fuzzy` flags are cleared
2. **Similar strings** - When strings change slightly (e.g., "Delete file" → "Delete selected file"), the tool:
   - Finds the most similar existing translation using Levenshtein distance
   - Copies the old translation to the new entry
   - Marks it with `#, fuzzy` flag so translators know to review it
3. **Obsolete entries** - Strings no longer in source code are marked with `#~` for reference

This saves translators time by preserving existing work when strings change slightly, while clearly flagging what needs review.

### Validating Fuzzy Entries

Use the validate command with `--strict` to catch fuzzy entries in CI:

```bash
# This will fail if any fuzzy entries exist
pnpm exec polingo validate locales --strict
```

Remove the `#, fuzzy` flag from entries after translators have reviewed and approved them.

## Shipping Updates

1. Extract fresh source strings and update your `.po` catalogs with fuzzy matching.
2. Review fuzzy-flagged entries and update translations as needed.
3. Run translators' workflows (Poedit, Weblate, Transifex, etc.) to gather approved translations.
4. Clear `#, fuzzy` flags from reviewed entries.
5. Validate catalogs with `pnpm exec polingo validate locales --strict`.
6. Commit `.po` files; optionally compile `.mo` files for production.
7. Verify the runtime by running your test suite or the relevant example applications.
8. Build distributable bundles with `pnpm build` before pushing to CI.
