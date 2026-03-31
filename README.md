# Polingo

[![CI](https://img.shields.io/github/actions/workflow/status/ragnarok22/polingo/ci.yml?branch=main&logo=github&label=CI)](https://github.com/ragnarok22/polingo/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ragnarok22/polingo/graph/badge.svg?token=3QVHN9LWNN)](https://codecov.io/gh/ragnarok22/polingo)
[![pnpm](https://img.shields.io/badge/pnpm-10.18.3-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/ragnarok22/polingo/blob/main/LICENSE)
[![Downloads @polingo/core](https://img.shields.io/npm/dm/@polingo/core?label=%40polingo%2Fcore)](https://www.npmjs.com/package/@polingo/core)
[![Downloads @polingo/node](https://img.shields.io/npm/dm/@polingo/node?label=%40polingo%2Fnode)](https://www.npmjs.com/package/@polingo/node)
[![Downloads @polingo/web](https://img.shields.io/npm/dm/@polingo/web?label=%40polingo%2Fweb)](https://www.npmjs.com/package/@polingo/web)
[![Downloads @polingo/react](https://img.shields.io/npm/dm/@polingo/react?label=%40polingo%2Freact)](https://www.npmjs.com/package/@polingo/react)
[![Downloads @polingo/vue](https://img.shields.io/npm/dm/@polingo/vue?label=%40polingo%2Fvue)](https://www.npmjs.com/package/@polingo/vue)
[![Downloads @polingo/cli](https://img.shields.io/npm/dm/@polingo/cli?label=%40polingo%2Fcli)](https://www.npmjs.com/package/@polingo/cli)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ragnarok22/polingo)

Modern internationalization (i18n) for JavaScript and TypeScript using standard gettext catalogs. Polingo gives you one translation model across Node.js, browsers, React, Vue, and CLI-based catalog workflows.

> [!CAUTION]
> **Alpha Notice:** Polingo is still alpha software. The public API is settling down, but breaking changes can still happen.

## Why Polingo

- Gettext-native: work with `.po` and `.mo` files instead of inventing a custom catalog format.
- Shared core runtime: one `Translator` model across server and client environments.
- Synchronous translation APIs after preload: load catalogs once, then call `t()`, `tp()`, `tn()`, or `tnp()` anywhere.
- First-class pluralization, context-aware translations, and variable interpolation.
- Node.js helpers for filesystem loading, middleware, and hot reload during development.
- Browser helpers for fetch-based loading and localStorage-backed caching.
- CLI tooling for initialization, extraction, compilation, and validation.
- TypeScript-first packages with strict typing throughout.

## Package Guide

| Package | Use it for |
| --- | --- |
| [`@polingo/core`](https://github.com/ragnarok22/polingo/tree/main/packages/core) | The environment-agnostic translation engine, cache types, interpolation, and plural logic |
| [`@polingo/node`](https://github.com/ragnarok22/polingo/tree/main/packages/node) | Filesystem loading, middleware, and translation watching for Node.js |
| [`@polingo/web`](https://github.com/ragnarok22/polingo/tree/main/packages/web) | Fetch-based loading and browser caching |
| [`@polingo/react`](https://github.com/ragnarok22/polingo/tree/main/packages/react) | React provider, hooks, and `Trans` component |
| [`@polingo/vue`](https://github.com/ragnarok22/polingo/tree/main/packages/vue) | Vue provider and composables |
| [`@polingo/cli`](https://github.com/ragnarok22/polingo/tree/main/packages/cli) | `init`, `extract`, `compile`, and `validate` commands |
| [`create-polingo-app`](https://github.com/ragnarok22/polingo/tree/main/packages/create-polingo-app) | Interactive starter scaffolding |

## How It Works

1. A loader reads a catalog from disk or over the network.
2. The catalog is normalized into the shared `TranslationCatalog` structure.
3. A cache stores parsed catalogs for reuse.
4. `Translator` handles locale selection, fallback lookup, interpolation, and plural rules.
5. Platform adapters such as `@polingo/node`, `@polingo/web`, `@polingo/react`, and `@polingo/vue` wrap that core runtime for each environment.

## Coverage

Per-package Codecov coverage is published from CI:

| Package | Coverage |
| --- | --- |
| @polingo/core | [![Coverage @polingo/core](https://codecov.io/gh/ragnarok22/polingo/branch/main/graph/badge.svg?token=3QVHN9LWNN&flag=core)](https://app.codecov.io/gh/ragnarok22/polingo/tree/main/packages/core?flags=core) |
| @polingo/node | [![Coverage @polingo/node](https://codecov.io/gh/ragnarok22/polingo/branch/main/graph/badge.svg?token=3QVHN9LWNN&flag=node)](https://app.codecov.io/gh/ragnarok22/polingo/tree/main/packages/node?flags=node) |
| @polingo/react | [![Coverage @polingo/react](https://codecov.io/gh/ragnarok22/polingo/branch/main/graph/badge.svg?token=3QVHN9LWNN&flag=react)](https://app.codecov.io/gh/ragnarok22/polingo/tree/main/packages/react?flags=react) |
| @polingo/vue | [![Coverage @polingo/vue](https://codecov.io/gh/ragnarok22/polingo/branch/main/graph/badge.svg?token=3QVHN9LWNN&flag=vue)](https://app.codecov.io/gh/ragnarok22/polingo/tree/main/packages/vue?flags=vue) |
| @polingo/web | [![Coverage @polingo/web](https://codecov.io/gh/ragnarok22/polingo/branch/main/graph/badge.svg?token=3QVHN9LWNN&flag=web)](https://app.codecov.io/gh/ragnarok22/polingo/tree/main/packages/web?flags=web) |

## Installation

Choose the package set that matches your environment. Examples below use `pnpm`; swap for `npm` or `yarn` if preferred.

### Node.js

```bash
pnpm add @polingo/core @polingo/node
```

### Browser

```bash
pnpm add @polingo/core @polingo/web
```

### React

```bash
pnpm add @polingo/core @polingo/web @polingo/react
```

### Vue

```bash
pnpm add @polingo/core @polingo/web @polingo/vue
```

### CLI

```bash
pnpm add -D @polingo/cli
```

## Starter Templates

Scaffold a starter project from the maintained templates:

```bash
pnpm create polingo-app
```

Current examples include React + Vite and Express.

## Quick Start

### Node.js

```ts
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  directory: './locales',
  fallback: 'en',
});

console.log(polingo.t('Hello'));
console.log(polingo.t('Hello, {name}!', { name: 'Juan' }));
console.log(polingo.tn('{n} item', '{n} items', 3, { n: 3 }));
```

### Browser

```ts
import { createPolingo } from '@polingo/web';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  loader: { baseUrl: '/i18n' },
});

document.querySelector('#greeting')!.textContent = polingo.t('Hello');
```

If you are actively editing translations in development, prefer `cache: false` or set `cacheOptions.cacheKey` so stale localStorage entries do not hide changes.

### React

```tsx
import { PolingoProvider, Trans, useTranslation } from '@polingo/react';

function AppContent() {
  const { t, tn, locale, setLocale } = useTranslation();

  return (
    <div>
      <h1>{t('Welcome to Polingo!')}</h1>
      <p>{tn('You have {n} message', 'You have {n} messages', 3, { n: 3 })}</p>
      <Trans
        message="Read the <0>documentation</0> to learn more"
        components={[<a href="/docs" />]}
      />
      <button type="button" onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}>
        Switch locale
      </button>
    </div>
  );
}

export function App() {
  return (
    <PolingoProvider
      create={{
        locale: 'en',
        locales: ['en', 'es'],
        loader: { baseUrl: '/i18n' },
      }}
    >
      <AppContent />
    </PolingoProvider>
  );
}
```

Vue support follows the same runtime model through `@polingo/vue` provider and composables. See the package README for framework-specific usage details.

## CLI Workflow

Use the CLI to bootstrap a project and manage catalogs:

```bash
# Initialize scripts, dependencies, and locale folders
pnpm dlx @polingo/cli@latest init --env react --languages en,es

# Extract messages from source files and sync locale catalogs
pnpm polingo extract src --locales locales --languages en,es --default-locale en

# Compile catalogs for browser usage
pnpm polingo compile locales -o public/i18n --format json

# Or compile for Node.js usage
pnpm polingo compile locales -o dist/locales --format mo

# Validate catalogs in CI
pnpm polingo validate locales --strict
```

The extractor recognizes `t()`, `tp()`, `tn()`, `tnp()`, and React `Trans` usage. Fuzzy matching is enabled by default so near-renamed strings can be carried forward and marked for translator review.

## Locale Layout

Source catalogs usually live in a locale-first directory structure:

```text
locales/
├── en/
│   └── messages.po
├── es/
│   └── messages.po
└── fr/
    └── messages.po
```

For Node.js, `@polingo/node` also supports gettext-style `LC_MESSAGES` layouts and prefers `.po` files over `.mo` when both exist for the same locale and domain.

## Translation APIs

- `t(msgid, vars?)` translates a basic message.
- `tp(context, msgid, vars?)` translates a message with context.
- `tn(msgid, msgidPlural, count, vars?)` selects the correct plural form.
- `tnp(context, msgid, msgidPlural, count, vars?)` combines context and plural handling.

## Repository Development

For work inside this monorepo:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
make test
make coverage
```

For the maintainer-facing workflow around package tools, example/template sync, changesets, and publishing, see [`docs/guide/repository-workflow.md`](./docs/guide/repository-workflow.md).

Requirements:

- Node.js `>= 22.0.0`
- `pnpm >= 8.0.0`

## Examples

- [React + Vite example](https://github.com/ragnarok22/polingo/tree/main/examples/react-vite)
- [Express example](https://github.com/ragnarok22/polingo/tree/main/examples/express)

## Documentation

- [@polingo/core](https://github.com/ragnarok22/polingo/tree/main/packages/core)
- [@polingo/node](https://github.com/ragnarok22/polingo/tree/main/packages/node)
- [@polingo/web](https://github.com/ragnarok22/polingo/tree/main/packages/web)
- [@polingo/react](https://github.com/ragnarok22/polingo/tree/main/packages/react)
- [@polingo/vue](https://github.com/ragnarok22/polingo/tree/main/packages/vue)
- [@polingo/cli](https://github.com/ragnarok22/polingo/tree/main/packages/cli)
- [create-polingo-app](https://github.com/ragnarok22/polingo/tree/main/packages/create-polingo-app)

## Contributing

Pull requests are welcome. For repository-specific workflow and development guidance, see [`AGENTS.md`](./AGENTS.md).

## Security

If you discover a security issue, follow the [security policy](https://github.com/ragnarok22/polingo/blob/main/.github/SECURITY.md).

## License

MIT © [Reinier Hernández Avila](https://github.com/ragnarok22/polingo/blob/main/LICENSE)
