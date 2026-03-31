---
outline: deep
---

# Repository Workflow

This guide is the maintainer-oriented map for working inside the Polingo monorepo: setup, daily commands, testing, templates, changesets, and publishing.

## Repository Model

- The repo root is a private workspace orchestrator. Published artifacts live under `packages/`.
- `packages/create-polingo-app/templates/` is the canonical source for starter apps.
- `examples/` is a mirrored consumer view used for documentation and smoke validation.
- `turbo` coordinates workspace tasks, while `make` provides convenient shortcuts for the most common repo-wide commands.

## Local Setup

Install dependencies from the repo root:

```bash
pnpm install --frozen-lockfile
```

If you prefer the shortcut:

```bash
make install
```

Use the root `package.json` scripts and `Makefile` from the repository root unless you are intentionally targeting a single package.

## Daily Commands

### Workspace Health

Use either the direct `pnpm` scripts or the matching `make` shortcuts:

| Task                   | Preferred command    | Shortcut        |
| ---------------------- | -------------------- | --------------- |
| Build all packages     | `pnpm build`         | `make build`    |
| Lint all packages      | `pnpm lint`          | `make lint`     |
| Typecheck all packages | `pnpm typecheck`     | none            |
| Run all tests          | `pnpm test`          | `make test`     |
| Run coverage           | `pnpm test:coverage` | `make coverage` |
| Run security checks    | `pnpm run security`  | `make security` |

### Docs

```bash
pnpm run docs:dev
pnpm run docs:build
pnpm run docs:preview
```

### Targeting One Package

Run package-scoped work with `--filter` when you do not need the full workspace:

```bash
pnpm --filter @polingo/core test
pnpm --filter @polingo/node typecheck
pnpm --filter @polingo/react build
```

## Working on Code Changes

Use this loop for normal feature and bug-fix work:

1. Install dependencies from the root.
2. Make the code and test changes in the relevant package.
3. Run the smallest targeted package checks that prove the change.
4. Run the repo-wide checks before opening or merging a PR:

```bash
pnpm lint
pnpm typecheck
make test
make coverage
```

If the change affects docs or examples, also run the relevant docs build or example checks before you finish.

## Templates and Examples

Do not treat `examples/` as the primary source for starter apps. Edit the canonical templates under `packages/create-polingo-app/templates/`, then resync the mirror:

```bash
pnpm examples:sync
pnpm examples:check
```

Use the smoke build when you change starter templates, scaffolding behavior, or package versions used by the generated apps:

```bash
pnpm examples:smoke
```

What each command does:

- `pnpm examples:sync` copies canonical templates into `examples/`.
- `pnpm examples:check` fails if tracked example files drift from the canonical templates.
- `pnpm examples:smoke` verifies the mirrors are in sync, installs each example as a consumer app, and runs their builds.

## Changesets and Versioning

Use Changesets for any change that should affect a published package.

Create a changeset:

```bash
pnpm run changeset
```

Guidelines:

- Add a changeset when package behavior, public APIs, package contents, or published docs meaningfully change.
- Skip a changeset for internal-only repo mechanics, test-only changes, or docs changes that do not affect published packages.
- Choose `patch`, `minor`, or `major` based on the user-facing impact to each affected package.

Apply version bumps after changesets have landed:

```bash
pnpm run version-packages
```

That command updates package versions and changelog content based on the queued changesets.

## Publishing

The normal publish path is the Changesets release flow:

```bash
pnpm build
pnpm run release
```

`pnpm run release` runs the build and then publishes queued package releases through Changesets.

There is also a lower-level publish shortcut:

```bash
make publish
```

Optional publish controls:

```bash
make publish PUBLISH_TAG=next
make publish PUBLISH_FILTERS="--filter @polingo/cli"
```

Use `make publish` only when you intentionally want direct workspace publishing behavior. Prefer `pnpm run release` for the standard versioned release flow.

## Recommended Pre-Release Checklist

Before publishing or merging a substantial change:

1. Run `pnpm lint`.
2. Run `pnpm typecheck`.
3. Run `make test`.
4. Run `make coverage`.
5. If templates or scaffolding changed, run `pnpm examples:smoke`.
6. If docs changed materially, run `pnpm run docs:build`.
7. If a package release is intended, create or verify the required changeset.
