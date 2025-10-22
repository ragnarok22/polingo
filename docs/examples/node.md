---
outline: deep
---

# Vanilla Node.js

`@polingo/node` works without any HTTP framework—you can load catalogs once, serve translations over raw `http`, or reuse the translator inside workers and scripts. This guide sets up a minimal TypeScript project that responds with localized strings.

## Project Setup

```bash
mkdir polingo-node-example
cd polingo-node-example
pnpm init
git init
```

Install dependencies:

```bash
pnpm add @polingo/node
pnpm add -D typescript tsx @types/node @polingo/cli
```

Create `tsconfig.json`:

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

Update `package.json` scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "build": "tsc",
    "extract": "polingo extract src --locales locales --languages en,es --default-locale en",
    "compile": "polingo compile locales --out locales --format mo",
    "validate": "polingo validate locales"
  }
}
```

## Create a Server

Define `src/server.ts`:

```ts
import { createServer } from 'node:http';
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  directory: './locales',
  fallback: 'en',
  watch: process.env.NODE_ENV === 'development',
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const locale = url.searchParams.get('lang') ?? 'en';

  await polingo.setLocale(locale);

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(
    [
      polingo.t('Welcome to Polingo!'),
      polingo.tn('You have {count} task', 'You have {count} tasks', 3),
      polingo.tp('button', 'Download'),
    ].join('\n')
  );
});

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

server.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await polingo.stopWatching?.();
  server.close(() => process.exit(0));
});
```

## Catalog Workflow

Extract strings:

```bash
pnpm extract
```

Add translations to `locales/es/messages.po`:

```po
msgid "Welcome to Polingo!"
msgstr "¡Bienvenido a Polingo!"

msgid "You have {count} task"
msgid_plural "You have {count} tasks"
msgstr[0] "Tienes {count} tarea"
msgstr[1] "Tienes {count} tareas"

msgctxt "button"
msgid "Download"
msgstr "Descargar"
```

Optionally compile to `.mo` before shipping:

```bash
pnpm compile
```

## Test the Output

```bash
pnpm start
curl http://localhost:3000/
curl http://localhost:3000/?lang=es
```

- `createPolingo` returns a promise—await it once and reuse the translator globally.
- Use `polingo.load(locale)` to warm up additional languages before serving requests.
- For worker threads or background jobs, share compiled `.mo` files and instantiate translators on demand.
