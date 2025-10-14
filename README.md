# Polingo

[![CI](https://github.com/ragnarok22/polingo/actions/workflows/ci.yml/badge.svg)](https://github.com/ragnarok22/polingo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Modern internationalization (i18n) library using industry-standard `.po` and `.mo` files for JavaScript/TypeScript projects.

## Features

- **Standard Gettext Support**: Use `.po` and `.mo` files, the industry standard for translations
- **Environment-Agnostic Core**: Universal translation engine that works anywhere
- **Node.js Integration**: Filesystem-based translation loading with hot-reload support
- **Pluralization**: Full support for plural forms across different languages
- **Context Support**: Disambiguate identical strings with different meanings
- **Variable Interpolation**: Dynamic content with placeholder replacement
- **Middleware Ready**: Built-in Express and Fastify middleware
- **TypeScript First**: Full type safety and autocomplete support
- **Performance Optimized**: Built-in caching with multiple strategies (memory, TTL, none)
- **Zero Configuration**: Works out of the box with sensible defaults

## Packages

Polingo is organized as a monorepo with the following packages:

- **[@polingo/core](./packages/core)**: Environment-agnostic translation engine
- **[@polingo/node](./packages/node)**: Node.js loader with filesystem support and middleware

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

## Development

This project uses `pnpm` workspaces and includes a Makefile for common tasks:

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
- pnpm >= 8.0.0

## Documentation

For detailed documentation, see the individual package READMEs:

- [@polingo/core documentation](./packages/core)
- [@polingo/node documentation](./packages/node)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Security

If you discover a security vulnerability, please follow our [security policy](.github/SECURITY.md) for responsible disclosure guidelines.

## License

MIT © [Reinier Hernández](LICENSE)
