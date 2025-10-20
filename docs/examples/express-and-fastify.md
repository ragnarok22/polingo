---
outline: deep
---

# Express & Fastify

Use the Node middleware to expose a translator on every request. This page shows how to wire Polingo into popular HTTP frameworks with complete step-by-step examples.

## Express Complete Example

### Step 1: Create the Repository

```bash
# Create project directory
mkdir polingo-express-example
cd polingo-express-example

# Initialize package.json
npm init -y

# Initialize git repository
git init
```

### Step 2: Install Packages

```bash
# Install runtime dependencies
npm install express @polingo/node

# Install development dependencies
npm install --save-dev typescript @types/express @types/node tsx
```

### Step 3: Configure TypeScript

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

Add to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### Step 4: Add Polingo Setup

Create `src/server.ts`:

```ts
import express from 'express';
import { polingoMiddleware } from '@polingo/node';

const app = express();

// Mount Polingo middleware
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

// Basic translation route
app.get('/', (req, res) => {
  res.send(req.polingo.t('Hello from Express!'));
});

// Plural translation example
app.get('/notifications', (req, res) => {
  const count = parseInt(req.query.count as string) || 0;
  res.send(
    req.polingo.tn('You have {count} notification', 'You have {count} notifications', count)
  );
});

// Context translation example
app.get('/menu', (req, res) => {
  res.json({
    fileMenu: req.polingo.tp('menu', 'File'),
    editMenu: req.polingo.tp('menu', 'Edit'),
    viewMenu: req.polingo.tp('menu', 'View'),
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/?lang=es`);
  console.log(`Try: http://localhost:${PORT}/notifications?count=5&lang=fr`);
});
```

### Step 5: Add First Translation

Install the Polingo CLI:

```bash
npm install --save-dev @polingo/cli
```

Add extraction script to `package.json`:

```json
{
  "scripts": {
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en"
  }
}
```

Run extraction:

```bash
npm run extract
```

This creates:

- `locales/en/messages.po`
- `locales/es/messages.po`
- `locales/fr/messages.po`

### Step 6: Translate Messages

Edit `locales/es/messages.po`:

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

Edit `locales/fr/messages.po`:

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

### Step 7: Verify Results

Start the development server:

```bash
npm run dev
```

Test the translations:

```bash
# English (default)
curl http://localhost:3000/
# Output: Hello from Express!

# Spanish
curl http://localhost:3000/?lang=es
# Output: ¡Hola desde Express!

# French with plurals
curl "http://localhost:3000/notifications?count=5&lang=fr"
# Output: Vous avez 5 notifications

# Spanish menu with context
curl http://localhost:3000/menu?lang=es
# Output: {"fileMenu":"Archivo","editMenu":"Editar","viewMenu":"Ver"}
```

Test with Accept-Language header:

```bash
curl -H "Accept-Language: es-ES,es;q=0.9" http://localhost:3000/
# Output: ¡Hola desde Express!
```

### Additional Tips

- The middleware preloads every locale you list in `locales`.
- `req.polingo` gives you direct access to the translator inside route handlers.
- Switch to per-locale instances with `perLocale: true` if you need fully isolated translators.
- In development, `watch: true` automatically reloads `.po` files when they change.

---

## Fastify Complete Example

### Step 1: Create the Repository

```bash
# Create project directory
mkdir polingo-fastify-example
cd polingo-fastify-example

# Initialize package.json
npm init -y

# Initialize git repository
git init
```

### Step 2: Install Packages

```bash
# Install runtime dependencies
npm install fastify @polingo/node

# Install development dependencies
npm install --save-dev typescript @types/node tsx
```

### Step 3: Configure TypeScript

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

Add to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### Step 4: Add Polingo Setup

Create `src/server.ts`:

```ts
import fastify from 'fastify';
import { polingoMiddleware } from '@polingo/node';

const app = fastify({ logger: true });

// Mount Polingo middleware as onRequest hook
app.addHook(
  'onRequest',
  polingoMiddleware({
    directory: './locales',
    locales: ['en', 'es', 'fr'],
    fallback: 'en',
    perLocale: true, // Recommended for Fastify's concurrent request handling
    localeExtractor: (req) =>
      typeof req.query?.lang === 'string'
        ? req.query.lang
        : ((req.headers?.['accept-language'] as string | undefined)?.split(',')[0]?.split('-')[0] ??
          'en'),
  })
);

// Basic translation route
app.get('/', async (request) => {
  return request.polingo.t('Hello from Fastify!');
});

// Plural translation example
app.get('/items', async (request) => {
  const count = parseInt((request.query as any).count) || 0;
  return request.polingo.tn('{count} item in cart', '{count} items in cart', count);
});

// JSON response with multiple translations
app.get('/api/status', async (request) => {
  return {
    message: request.polingo.t('Server is running'),
    status: request.polingo.tp('status', 'OK'),
    locale: request.polingo.getLocale(),
  };
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

await app.listen({ port: PORT });

console.log(`Fastify server listening on http://localhost:${PORT}`);
console.log(`Try: http://localhost:${PORT}/?lang=es`);
console.log(`Try: http://localhost:${PORT}/items?count=3&lang=fr`);
```

### Step 5: Add First Translation

Install the Polingo CLI:

```bash
npm install --save-dev @polingo/cli
```

Add extraction script to `package.json`:

```json
{
  "scripts": {
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "validate": "polingo validate locales"
  }
}
```

Run extraction:

```bash
npm run extract
```

### Step 6: Translate Messages

Edit `locales/es/messages.po`:

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

Edit `locales/fr/messages.po`:

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

### Step 7: Verify Results

Validate translations:

```bash
npm run validate
```

Start the development server:

```bash
npm run dev
```

Test the translations:

```bash
# English (default)
curl http://localhost:3000/
# Output: Hello from Fastify!

# Spanish
curl http://localhost:3000/?lang=es
# Output: ¡Hola desde Fastify!

# French with plurals
curl "http://localhost:3000/items?count=3&lang=fr"
# Output: 3 articles dans le panier

# JSON API response
curl http://localhost:3000/api/status?lang=es
# Output: {"message":"El servidor está funcionando","status":"Bien","locale":"es"}
```

### Additional Tips

- Fastify hooks receive the same middleware function exported for Express.
- Setting `perLocale: true` creates a translator per locale instead of reusing a single instance—recommended for Fastify's high-concurrency scenarios.
- Use `async/await` with Fastify route handlers for cleaner code.
- The `validate` command helps catch translation errors before deployment.

---

## Vanilla Node.js (No Framework)

For projects that don't use Express or Fastify, you can use Polingo directly:

### Complete Setup

```bash
# Create project
mkdir polingo-node-example
cd polingo-node-example
npm init -y

# Install dependencies
npm install @polingo/node
npm install --save-dev typescript @types/node tsx @polingo/cli
```

Create `src/app.ts`:

```ts
import { createPolingo } from '@polingo/node';
import http from 'node:http';

// Initialize translator
const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es', 'fr'],
  directory: './locales',
  fallback: 'en',
  watch: process.env.NODE_ENV === 'development',
});

const server = http.createServer((req, res) => {
  // Parse locale from query string
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const locale = url.searchParams.get('lang') || 'en';

  // Set locale for this request
  polingo.setLocale(locale);

  // Use translations
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(polingo.t('Welcome to Polingo!'));
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await polingo.stopWatching?.();
  server.close(() => process.exit(0));
});
```

Add translations to `locales/es/messages.po`:

```po
msgid "Welcome to Polingo!"
msgstr "¡Bienvenido a Polingo!"
```

Run:

```bash
npx tsx src/app.ts
curl http://localhost:3000/?lang=es
# Output: ¡Bienvenido a Polingo!
```

---

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
