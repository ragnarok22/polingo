# Repository Guidelines

## Project Overview

Polingo is a modern internationalization (i18n) library for JavaScript and TypeScript built around standard `.po` and `.mo` translation catalogs. The repository is a `pnpm` workspace monorepo with packages for the core translation engine, platform loaders, framework integrations, CLI tooling, and app scaffolding.

Key architecture areas:
- `@polingo/core` provides the environment-agnostic translation engine, cache implementations, interpolation, and plural rules.
- `@polingo/node` provides filesystem loading, middleware, and file watching for Node.js applications.
- `@polingo/web` provides HTTP loading and browser caching.
- `@polingo/react` and `@polingo/vue` expose provider and hook/composable integrations.
- `@polingo/cli` provides extraction, compilation, initialization, and validation workflows.
- `create-polingo-app` provides starter templates.

## Project Structure & Module Organization

- Main packages live under `packages/`.
- `packages/core/src` contains the framework-agnostic translation engine and public types.
- `packages/node/src` hosts the Node.js loader, parser, middleware, watcher, and `createPolingo()` factory.
- `packages/web/src` hosts the browser loader, `LocalStorageCache`, and browser `createPolingo()` factory.
- `packages/react/src` and `packages/vue/src` provide providers, translation hooks/composables, and `Trans` helpers.
- `packages/cli/src` contains the CLI entrypoint and catalog workflow commands.
- `packages/create-polingo-app` contains project templates and scaffolding logic.
- Co-locate tests under `packages/*/test`, and keep generated `dist/` artifacts out of version control.
- Shared configuration such as `tsconfig.*.json`, `eslint.config.js`, and `vitest.config.ts` sits at the repo root; update these sparingly and document changes.

## Build, Test, and Development Commands

### Setup

- Prefer `pnpm install --frozen-lockfile` to sync dependencies without mutating `pnpm-lock.yaml`.
- `make install` exists for convenience, but it does not enforce a frozen lockfile.

### Build and development

- `pnpm build` or `make build` builds all packages.
- `pnpm dev` runs workspace dev/watch tasks.
- The published CLI binary is rooted at `packages/cli/dist/cli.js` after a build.

### Tests

- `make test` or `pnpm test` runs the full test suite.
- `make coverage` or `pnpm test:coverage` runs coverage.
- `pnpm test:watch` runs Vitest in watch mode.
- To run a single workspace test suite, use `pnpm --filter @polingo/<package> test`.

### Linting, typing, formatting, and security

- `pnpm lint` or `make lint` runs ESLint across workspaces.
- `pnpm lint:fix` applies autofixable lint changes.
- `pnpm typecheck` runs strict TypeScript checks.
- `pnpm format:check` verifies formatting, and `pnpm format` applies Prettier.
- `pnpm run security` or `make security` runs audit and lockfile validation checks.

### CLI development examples

```bash
pnpm --filter @polingo/cli build
node packages/cli/dist/cli.js extract src/ --out locales/messages.pot --locales locales
node packages/cli/dist/cli.js compile locales/ --format json --out dist/i18n
node packages/cli/dist/cli.js validate locales
node packages/cli/dist/cli.js validate locales --strict
```

## Architecture Details

### Core translation flow

1. A `TranslationLoader` implementation loads a `.po`, `.mo`, or JSON catalog from disk or the network.
2. The catalog is normalized into the shared `TranslationCatalog` structure from `packages/core/src/types.ts`.
3. A `TranslationCache` implementation stores parsed catalogs for reuse.
4. `Translator` orchestrates catalog loading, fallback lookup, interpolation, and plural selection.
5. Framework integrations and middleware wrap a configured `Translator` instance for their runtime.

### TranslationCatalog shape

All loaders normalize to this structure:

```ts
{
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

### Package responsibilities

- `@polingo/core` contains `Translator`, cache implementations (`MemoryCache`, `TtlCache`, `NoCache`), interpolation, plural rules, loader interfaces, and shared types.
- `@polingo/node` contains `NodeLoader`, gettext parsing, `TranslationWatcher`, middleware, and the Node `createPolingo()` helper.
- `@polingo/web` contains `WebLoader`, `LocalStorageCache`, cache-key inference, and the browser `createPolingo()` helper.
- `@polingo/react` exposes `PolingoProvider`, `usePolingo()`, `useTranslation()`, `useLocale()`, `useTranslator()`, and a `Trans` component.
- `@polingo/vue` exposes the Vue provider, composables mirroring the React API, and a `Trans` component.
- `@polingo/cli` owns extract, compile, init, and validate commands and stays decoupled from runtime package internals where possible.
- `create-polingo-app` contains starter templates for supported application shapes.

### Translation APIs

- `t(msgid, vars?)` performs a basic translation.
- `tp(context, msgid, vars?)` performs a contextual translation.
- `tn(msgid, msgidPlural, count, vars?)` performs pluralization.
- `tnp(context, msgid, msgidPlural, count, vars?)` combines context and pluralization.

### Locale and fallback behavior

- Catalogs load asynchronously at startup via `translator.load(locales)`.
- Translation methods are synchronous after loading completes.
- Lookup checks the active locale first, then the fallback locale, then returns the original `msgid` if nothing resolves.
- Cache keys follow `{locale}:{domain}`.
- Missing interpolation variables are preserved in the rendered string instead of being removed.

### Middleware behavior

- `polingoMiddleware()` checks `?locale=` before parsing the `Accept-Language` header.
- `perLocale: false` shares a translator instance and switches locale per request.
- `perLocale: true` creates one translator per locale and is safer under concurrent load.

### Browser cache behavior

- `@polingo/web` defaults to localStorage-backed caching.
- `loader.baseUrl` defaults to `/i18n`.
- Prefer disabling cache during active development or providing `cacheOptions.cacheKey` to invalidate stale translations.

### Expected locale directory structure

```text
locales/
├── en/
│   └── messages.po
├── es/
│   └── messages.po
└── fr/
    └── messages.po
```

## Coding Style & Naming Conventions

- Language is TypeScript with strict options; prefer explicit return types when not obvious.
- Indent with two spaces, avoid `any`, and keep imports ordered logically: external, internal, then relative.
- Name files in kebab-case, classes in PascalCase, and functions and variables in camelCase.
- Reuse shared utilities instead of duplicating logic across packages.
- Limit inline comments; add brief context ahead of complex logic instead.

## Testing Guidelines

- Use Vitest with specs placed beside sources such as `packages/<pkg>/test/*.test.ts`.
- Favor behavior-driven test names such as `it("loads catalog diff")`.
- Rely on snapshots only for translation catalog output where they add real signal.
- Prefer JSON or fixture-driven catalogs for deterministic tests.
- Use simple mock loaders or existing fixtures from `packages/core/test` when writing unit tests.
- Run `make coverage` locally before merging changes that affect behavior, and investigate regressions immediately.

## Common Workflows

### Adding a new translation method

1. Add the method to `packages/core/src/translator.ts`.
2. Update shared types in `packages/core/src/types.ts` if needed.
3. Update CLI extraction logic in `packages/cli/src` so the new API is discoverable.
4. Add or update tests in the relevant package.
5. Expose the new API through React and Vue integrations when applicable.

### Adding support for a new environment

1. Create a new workspace package under `packages/`.
2. Implement `TranslationLoader` from `@polingo/core`.
3. Add an environment-specific cache only if the runtime needs one.
4. Export a factory similar to the existing `createPolingo()` helpers.
5. Add unit and integration coverage using existing fixture patterns.

### Managing browser cache during development

Use one of these patterns when working with `@polingo/web`:

```tsx
<PolingoProvider
  create={{
    locale: 'en',
    locales: ['en', 'es'],
    loader: { baseUrl: '/i18n' },
    cache: import.meta.env.PROD,
  }}
>
  <App />
</PolingoProvider>
```

```tsx
<PolingoProvider
  create={{
    locale: 'en',
    locales: ['en', 'es'],
    loader: { baseUrl: '/i18n' },
    cacheOptions: { cacheKey: '2026-03-31' },
  }}
>
  <App />
</PolingoProvider>
```

If localStorage-backed translations become stale in development, clear the relevant `polingo:` keys or reset localStorage in the browser.

## Build System

- Workspace orchestration is handled by `turbo`.
- Package builds use `tsup`.
- Output targets include ESM and CJS builds plus TypeScript declarations where configured.
- The repository uses Vitest with V8 coverage, ESLint flat config, and Prettier.
- The root package is ESM (`"type": "module"`).

## Requirements

- Node.js `>= 18.0.0`
- `pnpm >= 8.0.0`

## Commit & Pull Request Guidelines

- Follow Conventional Commits such as `feat(core): add pluralization`.
- Scope commit types to the affected package or area when possible.
- PRs should include a concise summary, linked issues, and validation notes such as `pnpm lint` and `make test`.
- Attach logs or screenshots when altering developer experience, CLI output, or CI behavior.
- Ensure CI pipelines pass and respond promptly to review feedback.

## Environment & Security Notes

- Avoid committing secrets; prefer `.env` files that are ignored by Git.
- Respect `workspace-write` expectations: edit within workspace paths and document any deviations.
- When adding dependencies, justify the need in the PR and run security checks if risk is suspected.
