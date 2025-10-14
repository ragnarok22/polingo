# Polingo

[![CI](https://img.shields.io/github/actions/workflow/status/ragnarok22/polingo/ci.yml?branch=main&logo=github&label=CI)](https://github.com/ragnarok22/polingo/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ragnarok22/polingo/graph/badge.svg?token=3QVHN9LWNN)](https://codecov.io/gh/ragnarok22/polingo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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

## Installation

```bash
npm install @polingo/node
# or
pnpm add @polingo/node
# or
yarn add @polingo/node
```

For environment-agnostic usage (browser, edge, etc.), install only the core:

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

## Documentation

For detailed documentation, see the individual package READMEs:

- [@polingo/core documentation](./packages/core)
- [@polingo/node documentation](./packages/node)
- [@polingo/web documentation](./packages/web)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Security

If you discover a security vulnerability, please follow our [security policy](.github/SECURITY.md) for responsible disclosure guidelines.

## License

MIT © [Reinier Hernández](LICENSE)
