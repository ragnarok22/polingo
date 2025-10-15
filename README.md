# Polingo

[![CI](https://img.shields.io/github/actions/workflow/status/ragnarok22/polingo/ci.yml?branch=main&logo=github&label=CI)](https://github.com/ragnarok22/polingo/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ragnarok22/polingo/graph/badge.svg?token=3QVHN9LWNN)](https://codecov.io/gh/ragnarok22/polingo)
[![pnpm](https://img.shields.io/badge/pnpm-10.18.3-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Downloads @polingo/core](https://img.shields.io/npm/dm/@polingo/core?label=%40polingo%2Fcore)](https://www.npmjs.com/package/@polingo/core)
[![Downloads @polingo/node](https://img.shields.io/npm/dm/@polingo/node?label=%40polingo%2Fnode)](https://www.npmjs.com/package/@polingo/node)
[![Downloads @polingo/web](https://img.shields.io/npm/dm/@polingo/web?label=%40polingo%2Fweb)](https://www.npmjs.com/package/@polingo/web)
[![Downloads @polingo/react](https://img.shields.io/npm/dm/@polingo/react?label=%40polingo%2Freact)](https://www.npmjs.com/package/@polingo/react)
[![Downloads @polingo/cli](https://img.shields.io/npm/dm/@polingo/cli?label=%40polingo%2Fcli)](https://www.npmjs.com/package/@polingo/cli)

Modern internationalization (i18n) library using industry-standard `.po` and `.mo` files for JavaScript/TypeScript projects.

> [!CAUTION]
> **Alpha Notice:** Polingo is currently in an alpha state. Breaking changes are becoming less common, but anything and everything may still change.

## Features

- **Standard Gettext Support**: Use `.po` and `.mo` files, the industry standard for translations
- **Automatic Catalog Detection**: Seamlessly load either `.po` or `.mo` catalogs from disk
- **Environment-Agnostic Core**: Universal translation engine that works anywhere
- **Node.js Integration**: Filesystem loader with optional hot-reload via chokidar
- **Browser Ready**: Fetch loader backed by localStorage caching
- **Pluralization**: Full support for plural forms across different languages
- **Context Support**: Disambiguate identical strings with different meanings
- **Variable Interpolation**: Dynamic content with placeholder replacement
- **Middleware Ready**: Express and Fastify helpers with locale detection hooks
- **TypeScript First**: Strict types, excellent IntelliSense
- **Flexible Caching**: Choose in-memory, TTL, or no caching depending on your needs

## Packages

Polingo is organized as a monorepo with the following packages:

- **[@polingo/core](./packages/core)**: Environment-agnostic translation engine
- **[@polingo/node](./packages/node)**: Node.js loader with filesystem support and middleware
- **[@polingo/web](./packages/web)**: Browser adapter using fetch + localStorage caching
- **[@polingo/react](./packages/react)**: React bindings with hooks, context provider, and Trans component
- **[@polingo/cli](./packages/cli)**: Command-line tools for extraction, compilation, and validation

## Installation

Choose the package that fits your environment:

**For Node.js applications:**
```bash
npm install @polingo/node
# or
pnpm add @polingo/node
# or
yarn add @polingo/node
```

**For browser/React applications:**
```bash
npm install @polingo/core @polingo/web @polingo/react
# or
pnpm add @polingo/core @polingo/web @polingo/react
```

**For CLI tooling (development dependency):**
```bash
npm install -D @polingo/cli
# or
pnpm add -D @polingo/cli
```

**For environment-agnostic usage:**
```bash
npm install @polingo/core
```

## Quick Start

### Basic Usage (Node.js)

```typescript
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en', 'fr'],
  directory: './locales',
  fallback: 'en',
});

console.log(polingo.t('Hello')); // "Hola"
console.log(polingo.t('Hello, {name}!', { name: 'Juan' })); // "¡Hola, Juan!"

// Pluralization
console.log(polingo.tn('{n} item', '{n} items', 1, { n: 1 })); // "1 artículo"
console.log(polingo.tn('{n} item', '{n} items', 5, { n: 5 })); // "5 artículos"
```

### Basic Usage (Browser)

```typescript
import { createPolingo } from '@polingo/web';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  loader: { baseUrl: '/locales' },
});

document.querySelector('#greeting')!.textContent = polingo.t('Hello');
```

### Express Integration

```typescript
import express from 'express';
import { polingoMiddleware } from '@polingo/node';

const app = express();

app.use(
  polingoMiddleware({
    directory: './locales',
    locales: ['es', 'en', 'fr'],
    fallback: 'en',
  })
);

app.get('/', (req, res) => {
  const greeting = req.polingo.t('Welcome, {name}!', { name: 'User' });
  res.send(greeting);
});

app.listen(3000);
```

### Fastify Integration

```typescript
import fastify from 'fastify';
import { polingoMiddleware } from '@polingo/node';

const app = fastify();

app.addHook(
  'onRequest',
  polingoMiddleware({
    directory: './locales',
    locales: ['es', 'en', 'fr'],
    fallback: 'en',
  })
);

app.get('/', async (request, reply) => {
  return request.polingo.t('Welcome');
});

app.listen({ port: 3000 });
```

### React Integration

```typescript
import { PolingoProvider, useTranslation, Trans } from '@polingo/react';
import { createPolingo } from '@polingo/web';

function App() {
  return (
    <PolingoProvider
      create={() =>
        createPolingo({
          locale: 'en',
          locales: ['en', 'es', 'fr'],
          loader: { baseUrl: '/i18n' },
        })
      }
    >
      <MyComponent />
    </PolingoProvider>
  );
}

function MyComponent() {
  const { t, tn, setLocale } = useTranslation();

  return (
    <div>
      <h1>{t('Welcome to Polingo!')}</h1>
      <p>{tn('You have {n} message', 'You have {n} messages', 3, { n: 3 })}</p>
      <Trans
        message="Read the <0>documentation</0> to learn more"
        components={[<a href="/docs" />]}
      />
      <button onClick={() => setLocale('es')}>Español</button>
    </div>
  );
}
```

For a complete React example, see the [React + Vite example](./examples/react-vite).

### CLI Workflow

Use the CLI to extract, compile, and validate translations:

```bash
# Install CLI tools
pnpm add -D @polingo/cli

# Extract translatable strings from source code
pnpm polingo extract src -o locales/messages.pot

# After translating .po files, compile to runtime format
pnpm polingo compile locales -o public/i18n --format json

# Validate translations before deployment
pnpm polingo validate locales --strict
```

See the [@polingo/cli documentation](./packages/cli) for detailed command reference.

### Hot Reload During Development

Enable file watching so catalogs reload automatically when your `.po`/`.mo` files change:

```typescript
const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  directory: './locales',
  watch: process.env.NODE_ENV === 'development',
  debug: true,
});

// Later, when shutting down:
await polingo.stopWatching?.();
```

## Directory Structure

Your translation files should be organized by locale:

```
locales/
├── es/
│   └── messages.po
├── en/
│   └── messages.po
└── fr/
    └── messages.po
```

## Translation Methods

- `t(msgid, vars?)` - Translate a message
- `tp(context, msgid, vars?)` - Translate with context
- `tn(msgid, msgidPlural, count, vars?)` - Translate with pluralization
- `tnp(context, msgid, msgidPlural, count, vars?)` - Translate with context and pluralization

## Configuration

### `createPolingo(options)`

```typescript
interface CreatePolingoOptions {
  locale: string;        // Initial locale (e.g. 'en')
  locales: string[];     // Locales to preload during startup
  directory: string;     // Path to the locales folder
  fallback?: string;     // Fallback locale when a key is missing (default: 'en')
  domain?: string;       // Translation domain filename prefix (default: 'messages')
  cache?: boolean;       // Use in-memory caching (default: true)
  watch?: boolean;       // Watch .po/.mo files and reload on change (default: false)
  debug?: boolean;       // Log loading and cache activity (default: false)
}
```

`NodeLoader` automatically looks for both `<locale>/<domain>.po` and `<locale>/<domain>.mo`, preferring `.po` when both exist.

### `polingoMiddleware(options)`

The middleware shares the same options (minus `locale`) plus:

- `localeExtractor(req)` – customize how the locale is detected (defaults to `Accept-Language` or `?locale=` query parameter).
- `perLocale` – set to `true` to create dedicated translator instances per locale instead of reusing one shared translator.

## Development

This project uses `pnpm` workspaces and includes a Makefile for common tasks. Recommended workflow:

```bash
# Install dependencies without touching the lockfile
pnpm install --frozen-lockfile

# Type safety and linting
pnpm typecheck
pnpm lint
pnpm format:check

# Unit tests
pnpm test
```

Or use the Makefile shortcuts:

```bash
# Install dependencies
make install

# Build all packages
make build

# Run tests
make test

# Run tests with coverage
make coverage

# Run linter
make lint

# Clean build artifacts
make clean
```

## Requirements

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (developed with pnpm 10.x)

## Examples

Check out our working examples to see Polingo in action:

- **[React + Vite Example](./examples/react-vite)**: Full-featured React app demonstrating hooks, Trans component, locale switching, and complete translation workflow

## Documentation

For detailed documentation, see the individual package READMEs:

- [@polingo/core documentation](./packages/core)
- [@polingo/node documentation](./packages/node)
- [@polingo/web documentation](./packages/web)
- [@polingo/react documentation](./packages/react)
- [@polingo/cli documentation](./packages/cli)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Security

If you discover a security vulnerability, please follow our [security policy](.github/SECURITY.md) for responsible disclosure guidelines.

## License

MIT © [Reinier Hernández Avila](LICENSE)
