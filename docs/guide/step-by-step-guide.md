---
outline: deep
---

# Step-by-Step Project

Build a minimal, production-ready Polingo setup from scratch. The steps below assume a fresh Node.js workspace, but you can adapt them to an existing app.

## 1. Scaffold your workspace

```bash
mkdir polingo-demo
cd polingo-demo
pnpm init
```

Enable ESM in your `package.json` if you plan to use top-level `await`:

```json
{
  "type": "module"
}
```

## 2. Install Polingo and types

```bash
pnpm add @polingo/node
pnpm add -D typescript @types/node tsx
```

Initialize TypeScript (use `--tsconfig` if you already have a base config):

```bash
pnpm exec tsc --init --module esnext --moduleResolution node16 --target es2021
```

## 3. Create catalogs

```bash
mkdir -p locales/en locales/es
```

`locales/en/messages.po`:

```
msgid ""
msgstr ""
"Language: en\n"

msgid "Welcome"
msgstr "Welcome"
```

`locales/es/messages.po`:

```
msgid ""
msgstr ""
"Language: es\n"

msgid "Welcome"
msgstr "Bienvenido"
```

## 4. Load translations in Node.js

Create `src/server.ts`:

```ts
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  directory: './locales',
  fallback: 'en',
  watch: process.env.NODE_ENV === 'development',
});

export default polingo;

console.log('Default locale:', polingo.getLocale());
console.log('English:', polingo.t('Welcome'));
await polingo.setLocale('es');
console.log('Spanish:', polingo.t('Welcome'));
```

Run the script with `pnpm exec tsx src/server.ts`. You should see the translated output for both locales.

## 5. Expose a translation helper

Wire the translator into your HTTP framework of choice. Example with Fastify in `src/app.ts`:

```ts
import Fastify from 'fastify';
import polingo from './server';

const app = Fastify();

app.get('/', async (_, reply) => {
  const message = polingo.t('Welcome');
  return reply.send({ message });
});

app.listen({ port: 3000 });
```

Visit `http://localhost:3000` to confirm the JSON response.

## 6. Validate with tests

Add Vitest for fast feedback:

```bash
pnpm add -D vitest
```

`test/polingo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import polingo from '../src/server';

describe('polingo demo', () => {
  it('translates loaded keys', async () => {
    await polingo.setLocale('es');
    expect(polingo.t('Welcome')).toBe('Bienvenido');
  });
});
```

Run `pnpm exec vitest run` to ensure translations resolve during CI.

## 7. Add a build script

Keep catalogs up-to-date and ready for deployment:

```json
{
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Compile with `pnpm exec tsc` before shipping to production so the translator can run in plain JavaScript environments.

## Next steps

- Use `polingoMiddleware` to attach translators per request (see [Express & Fastify](/examples/express-and-fastify)).
- Export catalogs as JSON for client-side apps (see [Browser Integration](/examples/browser)).
- Share caches and loaders across packages with the [Runtime Translators](/guide/runtime) deep dive.
