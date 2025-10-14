# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by `pnpm` workspaces. Primary packages live under `packages/`.
- `packages/core` contains the framework-agnostic translation engine; its public surface is exported from `src/index.ts`.
- `packages/node` provides the Node.js loader, middleware, and filesystem watcher. Shared utilities and adapters reside in `src/`.
- Tests live beside each package in `packages/*/test`. Generated build output is written to `packages/*/dist` and should never be committed.
- Configuration files (`tsconfig.*.json`, `eslint.config.js`, `vitest.config.ts`) sit at the repo root and apply across packages.

## Build, Test, and Development Commands
- `pnpm install --frozen-lockfile` synchronizes dependencies without mutating `pnpm-lock.yaml`.
- `pnpm lint` runs ESLint with type-aware rules across `packages/*/{src,test}`.
- `pnpm format:check` verifies Prettier formatting for `*.ts`, `*.json`, and `*.md`.
- `pnpm typecheck` executes TypeScript in project references for all packages.
- `pnpm build` or `make build` compiles every package via `tsup`.
- `make test` runs Vitest; `make coverage` collects coverage and uploads to Codecov in CI.

## Coding Style & Naming Conventions
- Source code is TypeScript with strict compiler options. Use two-space indentation, explicit return types when clarity requires, and avoid `any`.
- Follow idiomatic naming: PascalCase for classes (`TranslationWatcher`), camelCase for functions and variables (`createPolingo`), kebab-case for files when appropriate (`middleware.ts`).
- Always run `pnpm lint` and `pnpm format:check` before submitting changes; auto-fixes are available via `pnpm lint:fix` and `pnpm format`.

## Testing Guidelines
- Testing is handled by Vitest. Place specs under `packages/<pkg>/test` with filenames ending in `.test.ts`.
- Prefer descriptive test names mirroring user-facing behaviors. Leverage Vitest snapshots only when asserting translation catalogs.
- Aim to keep coverage green; CI enforces a coverage upload step, so run `make coverage` locally before large merges.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat(core): add pluralization helpers`, `docs(readme): explain setup`), matching the existing history.
- Each PR should describe the change, reference related issues, and note validation steps (`pnpm lint`, `pnpm build`, tests).
- Attach screenshots or logs when modifying developer experience or CI workflows. Ensure workflows pass before requesting review.
