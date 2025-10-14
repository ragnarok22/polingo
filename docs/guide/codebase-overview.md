---
outline: deep
---

# Codebase Overview

This guide orients new contributors to the Polingo monorepo so you can quickly find the moving pieces, understand how they fit together, and know which docs to explore next.

## Top-level Layout

Polingo is a `pnpm` workspace that keeps each runtime integration inside its own package under `packages/`. Shared tooling such as ESLint, TypeScript configs, and Vitest live at the repo root alongside helper scripts in the `Makefile`. Day-to-day commands map to familiar tasks:

- `pnpm install` or `make install` installs dependencies across the workspace.
- `pnpm -r build` (aliased as `make build`) runs `tsup` builds for every package.
- `make test`, `pnpm lint`, and `pnpm typecheck` cover automated verification before publishing.

The `docs/` directory powers the public documentation site, and `docs/examples/` contains runnable samples that exercise the different packages.

## Core Translation Engine (`packages/core`)

The core package holds the framework-agnostic translation engine. Its entry point exports `createTranslator`, the `Translator` class, cache implementations (`MemoryCache`, `TtlCache`, `NoCache`), and utilities like `interpolate` and `getPluralIndex`. The `Translator` orchestrates catalog loading through an injected loader, caches the results, and exposes translation helpers (`t`, `tp`, `tn`, `tnp`) once catalogs are loaded.

Complementary modules define the in-memory cache implementations, a loader contract, pluralization logic, and interpolation helpers. Tests under `packages/core/test` validate the translation workflows end to end.

## Runtime Integrations (`packages/node`, `packages/web`, `packages/react`)

Each runtime package adapts the core translator to a specific environment:

- `@polingo/node` wires the filesystem loader, optional hot-reload via `TranslationWatcher`, and server middleware. `createPolingo` assembles a ready-to-use translator with caching, watching, and Express/Fastify helpers.
- `@polingo/web` provides a fetch-based loader with optional `localStorage` caching. Its `createPolingo` factory mirrors the Node entry point but targets browsers and edge runtimes.
- `@polingo/react` wraps the translator with a context provider, hooks like `useTranslator`, and a `<Trans>` component for declarative translation inside JSX.

Each package mirrors the same structure—`src/` for implementation, `test/` for Vitest suites, and a package-level README describing usage.

## CLI Toolkit (`packages/cli`)

The CLI package exposes three developer-focused commands:

- `extract` walks the provided source directories, detects gettext strings, and emits a POT catalog.
- `compile` converts `.po` catalogs into either `.mo` binaries or JSON bundles, suitable for runtime loaders.
- `validate` runs consistency checks (missing plurals, invalid contexts, etc.) across your translation files.

All commands share the same argument parser and emit actionable console output to integrate with CI.

## Documentation & Examples

Starter guides live under `docs/guide/`, while API references sit in `docs/api/`. The `docs/examples/` directory contains runnable demos for popular stacks—follow the README inside each example to spin them up. When in doubt, `docs/index.md` links to the recommended entry points for new adopters.

## Suggested Next Steps

1. Read through [`docs/guide/getting-started.md`](./getting-started.md) to configure a minimal project.
2. Explore [`docs/guide/runtime.md`](./runtime.md) for deeper explanations of loaders, caching, and pluralization.
3. Skim the package-level READMEs (`packages/*/README.md`) to see environment-specific usage snippets.
4. Run `pnpm lint` and `make test` locally to ensure your environment is wired correctly before submitting changes.
5. Dive into the Vitest suites under `packages/*/test` when you need examples of expected translator behavior.
