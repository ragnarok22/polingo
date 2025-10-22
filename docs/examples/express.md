---
outline: deep
---

# Express Middleware

Use the `polingoMiddleware` helper from `@polingo/node` to attach a translator to every Express request. This walkthrough sets up a full TypeScript project, extracts catalogs, and exercises plural, contextual, and locale-detection features.

## Project Setup

```bash
mkdir polingo-express-example
cd polingo-express-example
pnpm init
git init
```

Install runtime and tooling dependencies:

```bash
pnpm add express @polingo/node
pnpm add -D typescript tsx @types/express @types/node @polingo/cli
```

Generate `tsconfig.json` with strict defaults:

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

Add helpful scripts to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "compile": "polingo compile locales --out locales --format mo",
    "validate": "polingo validate locales"
  }
}
```

## Wire the Middleware

Create `src/server.ts`:

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
        : ((req.headers['accept-language'] as string | undefined)?.split(',')[0]?.split('-')[0] ??
          'en'),
  })
);

app.get('/', (req, res) => {
  res.send(req.polingo.t('Hello from Express!'));
});

app.get('/notifications', (req, res) => {
  const count = Number.parseInt(req.query.count as string, 10) || 0;
  res.send(
    req.polingo.tn('You have {count} notification', 'You have {count} notifications', count)
  );
});

app.get('/menu', (req, res) => {
  res.json({
    file: req.polingo.tp('menu', 'File'),
    edit: req.polingo.tp('menu', 'Edit'),
    view: req.polingo.tp('menu', 'View'),
  });
});

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
```

The middleware hydrates `req.polingo` with translation helpers so every handler can call `t`, `tn`, `tp`, or `tnp` directly.

## Extract & Translate

Generate seed catalogs:

```bash
pnpm extract
```

Translate the new entries in `locales/es/messages.po`:

```po
msgid "Hello from Express!"
msgstr "¡Hola desde Express!"

msgid "You have {count} notification"
msgid_plural "You have {count} notifications"
msgstr[0] "Tienes {count} notificación"
msgstr[1] "Tienes {count} notificaciones"

msgctxt "menu"
msgid "File"
msgstr "Archivo"

msgctxt "menu"
msgid "Edit"
msgstr "Editar"

msgctxt "menu"
msgid "View"
msgstr "Ver"
```

Mirror the same phrases in `locales/fr/messages.po`:

```po
msgid "Hello from Express!"
msgstr "Bonjour depuis Express!"

msgid "You have {count} notification"
msgid_plural "You have {count} notifications"
msgstr[0] "Vous avez {count} notification"
msgstr[1] "Vous avez {count} notifications"

msgctxt "menu"
msgid "File"
msgstr "Fichier"

msgctxt "menu"
msgid "Edit"
msgstr "Édition"

msgctxt "menu"
msgid "View"
msgstr "Affichage"
```

## Try It Out

```bash
pnpm dev
```

Exercise different locales:

```bash
curl http://localhost:3000/
curl http://localhost:3000/?lang=es
curl "http://localhost:3000/notifications?count=4&lang=fr"
curl http://localhost:3000/menu?lang=es
curl -H "Accept-Language: fr-FR,fr;q=0.9" http://localhost:3000/
```

- Use `watch: true` in development to reload catalogs on save.
- Switch to `perLocale: true` when you need request-scoped translators instead of a shared instance.
- The same middleware also works in Connect-compatible frameworks (Nest.js, Blitz.js, etc.).
