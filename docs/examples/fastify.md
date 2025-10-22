---
outline: deep
---

# Fastify Hook

Fastify integrates with Polingo through the same `polingoMiddleware` helper used by Express. Register it as an `onRequest` hook to provide localized helpers on each request.

## Project Setup

```bash
mkdir polingo-fastify-example
cd polingo-fastify-example
pnpm init
git init
```

Install dependencies:

```bash
pnpm add fastify @polingo/node
pnpm add -D typescript tsx @types/node @polingo/cli
```

TypeScript configuration (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Add scripts to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "validate": "polingo validate locales"
  }
}
```

## Register the Hook

Create `src/server.ts`:

```ts
import fastify from 'fastify';
import { polingoMiddleware } from '@polingo/node';

const app = fastify({ logger: true });

app.addHook(
  'onRequest',
  polingoMiddleware({
    directory: './locales',
    locales: ['en', 'es', 'fr'],
    fallback: 'en',
    perLocale: true,
    localeExtractor: (req) =>
      typeof req.query?.lang === 'string'
        ? req.query.lang
        : ((req.headers['accept-language'] as string | undefined)?.split(',')[0]?.split('-')[0] ??
          'en'),
  })
);

app.get('/', async (request) => request.polingo.t('Hello from Fastify!'));

app.get('/items', async (request) => {
  const count = Number.parseInt((request.query as Record<string, string>).count ?? '0', 10);
  return request.polingo.tn('{count} item in cart', '{count} items in cart', count);
});

app.get('/api/status', async (request) => ({
  message: request.polingo.t('Server is running'),
  status: request.polingo.tp('status', 'OK'),
  locale: request.polingo.getLocale(),
}));

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

await app.listen({ port: PORT });

console.log(`Fastify server listening on http://localhost:${PORT}`);
```

Using `perLocale: true` ensures each request receives an isolated translator, matching Fastify's concurrency model.

## Translate Catalogs

Extract strings and create the catalogs:

```bash
pnpm extract
```

Translate `locales/es/messages.po`:

```po
msgid "Hello from Fastify!"
msgstr "¡Hola desde Fastify!"

msgid "{count} item in cart"
msgid_plural "{count} items in cart"
msgstr[0] "{count} artículo en el carrito"
msgstr[1] "{count} artículos en el carrito"

msgid "Server is running"
msgstr "El servidor está funcionando"

msgctxt "status"
msgid "OK"
msgstr "Bien"
```

Translate `locales/fr/messages.po`:

```po
msgid "Hello from Fastify!"
msgstr "Bonjour depuis Fastify!"

msgid "{count} item in cart"
msgid_plural "{count} items in cart"
msgstr[0] "{count} article dans le panier"
msgstr[1] "{count} articles dans le panier"

msgid "Server is running"
msgstr "Le serveur fonctionne"

msgctxt "status"
msgid "OK"
msgstr "D'accord"
```

## Validate & Run

```bash
pnpm validate
pnpm dev
```

Hit the endpoints:

```bash
curl http://localhost:3000/
curl http://localhost:3000/?lang=es
curl "http://localhost:3000/items?count=3&lang=fr"
curl http://localhost:3000/api/status?lang=es
```

- The middleware is framework-agnostic; swap Fastify for Express without changing translation logic.
- Prefer environment variables or cookies in `localeExtractor` for production deployments.
- Shut down gracefully by awaiting `app.close()` and calling `request.polingo.stopWatching?.()` when `watch` is enabled.
