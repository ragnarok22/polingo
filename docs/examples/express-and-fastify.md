---
outline: deep
---

# Express & Fastify

Use the Node middleware to expose a translator on every request. This page shows how to wire Polingo into popular HTTP frameworks.

## Express

```ts
import express from 'express';
import { polingoMiddleware } from '@polingo/node';

const app = express();

app.use(
  polingoMiddleware({
    directory: './locales',
    locales: ['en', 'es', 'fr'],
    fallback: 'en',
    watch: process.env.NODE_ENV === 'development',
    localeExtractor: (req) =>
      typeof req.query?.lang === 'string'
        ? req.query.lang
        : ((req.headers?.['accept-language'] as string | undefined)?.split(',')[0]?.split('-')[0] ??
          'en'),
  })
);

app.get('/', (req, res) => {
  res.send(req.polingo.t('Hello from Express!'));
});

app.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
```

- The middleware preloads every locale you list in `locales`.
- `req.polingo` gives you direct access to the translator inside route handlers.
- Switch to per-locale instances with `perLocale: true` if you need fully isolated translators.

## Fastify

```ts
import fastify from 'fastify';
import { polingoMiddleware } from '@polingo/node';

const app = fastify();

app.addHook(
  'onRequest',
  polingoMiddleware({
    directory: './locales',
    locales: ['en', 'es'],
    fallback: 'en',
    perLocale: true,
  })
);

app.get('/', (request) => {
  return request.polingo.t('Hello from Fastify!');
});

await app.listen({ port: 3000 });
```

- Fastify hooks receive the same middleware function exported for Express.
- Setting `perLocale: true` creates a translator per locale instead of reusing a single instance—handy when you want to avoid calling `setLocale` on a shared instance.

## Graceful Shutdown

When `watch: true`, remember to stop the watcher before exiting:

```ts
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  directory: './locales',
  watch: true,
});

process.on('SIGTERM', async () => {
  await polingo.stopWatching?.();
  process.exit(0);
});
```
