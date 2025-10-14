# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by `pnpm` workspaces; main packages live under `packages/`.
- `packages/core/src` exposes the framework-agnostic translation engine via `src/index.ts`.
- `packages/node/src` hosts the Node.js loader, middleware, and shared adapters; reuse utilities rather than duplicating logic.
- Co-locate tests under `packages/*/test`, and keep generated `dist/` artifacts out of version control.
- Shared configuration (`tsconfig.*.json`, `eslint.config.js`, `vitest.config.ts`) sits at the repo root; update these sparingly and document changes.

## Build, Test, and Development Commands
- `pnpm install --frozen-lockfile` syncs dependencies without mutating `pnpm-lock.yaml`.
- `pnpm build` (or `make build`) compiles all packages through `tsup`.
- `pnpm lint` runs ESLint with project references; use `pnpm lint:fix` before large refactors.
- `pnpm format:check` enforces Prettier; run `pnpm format` to apply fixes.
- `pnpm typecheck` executes strict TypeScript checks; keep it green before merging.
- `make test` runs Vitest suites; `make coverage` collects coverage for CI parity.

## Coding Style & Naming Conventions
- Language is TypeScript with strict options; prefer explicit return types when not obvious.
- Indent with two spaces, avoid `any`, and keep imports ordered logically (external, internal, relative).
- Name files in kebab-case (`translation-watcher.ts`), classes in PascalCase, and functions/variables in camelCase.
- Limit inline comments; add brief context ahead of complex logic instead.

## Testing Guidelines
- Use Vitest with specs placed beside sources (`packages/<pkg>/test/*.test.ts`).
- Favor behavior-driven test names (`it("loads catalog diff")`); rely on snapshots only for translation catalogs.
- Aim to run `make coverage` locally before PRs; investigate regressions immediately.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(core): add pluralization`); scope to package or area.
- PRs should include a concise summary, linked issues, and validation notes (e.g., `pnpm lint`, `make test`).
- Attach logs or screenshots when altering developer experience or CI behavior.
- Ensure CI pipelines pass and respond promptly to review feedback.

## Environment & Security Notes
- Avoid committing secrets; prefer `.env` files listed in `.gitignore`.
- Respect `workspace-write` expectations: edit within workspace paths and document any deviations.
- When adding dependencies, justify necessity in the PR and run `pnpm audit` if risk is suspected.
