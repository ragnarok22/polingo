# @polingo/node

Node.js loader for the Polingo translation system. Provides filesystem-based translation loading with support for `.po` and `.mo` files.

## Features

- 📁 Load `.po` and `.mo` translation files from filesystem
- 🔄 Hot-reload support for development
- 🚀 Express/Fastify middleware integration
- 💾 Built-in caching
- 📦 Full TypeScript support
- 🎯 Zero configuration required

## Installation

```bash
npm install @polingo/node
# or
pnpm add @polingo/node
# or
yarn add @polingo/node
```

## Quick Start

### Basic Usage

```typescript
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en', 'fr'],
  directory: './locales',
  fallback: 'en',
  cache: true,
  watch: process.env.NODE_ENV === 'development',
});

// Use translations
console.log(polingo.t('Hello')); // "Hola"
console.log(polingo.t('Hello, {name}!', { name: 'Juan' })); // "¡Hola, Juan!"
```

### Directory Structure

Your translation files should be organized like this:

```
locales/
├── es/
│   └── messages.po
├── en/
│   └── messages.po
└── fr/
    └── messages.po
```

### Express Middleware

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
  res.send(req.polingo.t('Welcome'));
});

app.listen(3000);
```

### Fastify Plugin

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

## API

### `createPolingo(options)`

Creates a configured Polingo translator instance.

#### Options

- `locale` (string, required): Current locale (e.g., 'es', 'en')
- `locales` (string[], required): Array of locales to preload
- `directory` (string, required): Directory containing translation files
- `fallback` (string, optional): Fallback locale when translation is not found (default: 'en')
- `domain` (string, optional): Domain name (default: 'messages')
- `cache` (boolean, optional): Enable caching (default: true)
- `watch` (boolean, optional): Enable file watching for hot-reload (default: false)
- `debug` (boolean, optional): Enable debug logging (default: false)

### `polingoMiddleware(options)`

Creates an Express/Fastify middleware for request-based translations.

#### Options

All options from `createPolingo` except `locale`, plus:

- `localeExtractor` (function, optional): Function to extract locale from request (default: reads Accept-Language header)
- `perLocale` (boolean, optional): Store translator instances per locale (default: false)

### `NodeLoader`

Low-level loader class for direct usage.

```typescript
import { NodeLoader } from '@polingo/node';
import { Translator, MemoryCache } from '@polingo/core';

const loader = new NodeLoader('./locales');
const cache = new MemoryCache();
const translator = new Translator(loader, cache, {
  locale: 'es',
  fallback: 'en',
});

await translator.load(['es', 'en']);
```

## Translation Methods

Once you have a Polingo instance, you can use these methods:

- `t(msgid, vars?)`: Translate a message
- `tp(context, msgid, vars?)`: Translate with context
- `tn(msgid, msgidPlural, count, vars?)`: Translate with pluralization
- `tnp(context, msgid, msgidPlural, count, vars?)`: Translate with context and pluralization

See [@polingo/core](../core) documentation for more details.

## License

MIT
