# @polingo/node

> Node.js and Electron adapter for Polingo

Load translation catalogs from the filesystem and use them in Node.js applications, including Express, Fastify, and Electron apps.

## Installation

```bash
npm install @polingo/core @polingo/node
# or
pnpm add @polingo/core @polingo/node
# or
yarn add @polingo/core @polingo/node
```

## Features

- 📁 **Filesystem loader** - Read .po and .mo files from disk
- 🔄 **Hot reload** - Auto-reload translations in development
- ⚡ **Fast parsing** - Uses gettext-parser for efficient parsing
- 🎯 **Simple API** - One function call to set everything up
- 🚀 **Express/Fastify** - Easy integration with web frameworks
- ⚛️ **Electron** - Works in both main and renderer processes
- 🔧 **TypeScript** - Fully typed

## Quick Start

```typescript
import { createPolingo } from '@polingo/node';

// Create and configure
const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en', 'fr'],
  directory: './locales',
  fallback: 'en',
});

// Use it
console.log(polingo.t('Hello, World!')); // "¡Hola, Mundo!"
```

## Directory Structure

Organize your translations like this:

```
locales/
├── es/
│   ├── messages.po
│   └── errors.po
├── en/
│   ├── messages.po
│   └── errors.po
└── fr/
    ├── messages.po
    └── errors.po
```

Or with the classic gettext structure:

```
locales/
├── es/
│   └── LC_MESSAGES/
│       ├── messages.po
│       └── errors.po
└── en/
    └── LC_MESSAGES/
        ├── messages.po
        └── errors.po
```

Both structures are automatically supported.

## API Reference

### `createPolingo(options)`

Creates a translator instance with a Node.js loader.

```typescript
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  directory: './locales',
  fallback: 'en',
  domain: 'messages',
  format: 'po',
  cache: true,
  watch: false,
  debug: false,
});
```

**Options:**

```typescript
interface CreatePolingoOptions {
  locale: string; // Current locale
  locales?: string[]; // Locales to preload
  directory: string; // Path to locales directory
  fallback?: string; // Fallback locale (default: 'en')
  domain?: string; // Translation domain (default: 'messages')
  format?: 'po' | 'mo'; // File format (default: 'po')
  cache?: boolean; // Use caching (default: true)
  watch?: boolean; // Watch files for changes (default: false)
  debug?: boolean; // Debug mode (default: false)
}
```

**Returns:** `Promise<Translator>`

### `NodeLoader`

Low-level loader class if you want more control:

```typescript
import { createTranslator, MemoryCache } from '@polingo/core';
import { NodeLoader } from '@polingo/node';

const loader = new NodeLoader({
  directory: './locales',
  format: 'po',
  watch: false,
});

const translator = createTranslator(loader, new MemoryCache(), {
  locale: 'es',
  fallback: 'en',
});

await translator.load(['es', 'en']);
```

## Usage Examples

### Express Application

```typescript
import express from 'express';
import { createPolingo } from '@polingo/node';

const app = express();

// Setup translator
const polingo = await createPolingo({
  locale: 'en',
  locales: ['es', 'en', 'fr'],
  directory: './locales',
});

// Middleware to detect locale from headers
app.use(async (req, res, next) => {
  const locale = req.headers['accept-language']?.split(',')[0] || 'en';
  await polingo.setLocale(locale);
  req.polingo = polingo;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send(req.polingo.t('Welcome to our app!'));
});

app.get('/items/:count', (req, res) => {
  const count = parseInt(req.params.count);
  const message = req.polingo.tn('You have {n} item', 'You have {n} items', count, { n: count });
  res.json({ message });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### CLI Application

```typescript
import { createPolingo } from '@polingo/node';

async function main() {
  const polingo = await createPolingo({
    locale: process.env.LANG?.split('.')[0] || 'en',
    locales: ['es', 'en'],
    directory: './locales',
  });

  console.log(polingo.t('Processing files...'));

  const fileCount = 42;
  console.log(polingo.tn('Found {n} file', 'Found {n} files', fileCount, { n: fileCount }));
}

main();
```

### Electron Application

**Main Process:**

```typescript
// main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { createPolingo } from '@polingo/node';
import path from 'path';

let polingo;

app.whenReady().then(async () => {
  // Setup translator
  polingo = await createPolingo({
    locale: app.getLocale(),
    locales: ['es', 'en', 'fr'],
    directory: path.join(__dirname, '../locales'),
  });

  // IPC handlers for renderer process
  ipcMain.handle('translate', (_, msgid, vars) => {
    return polingo.t(msgid, vars);
  });

  ipcMain.handle('setLocale', async (_, locale) => {
    await polingo.setLocale(locale);
    return polingo.getLocale();
  });

  createWindow();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
}
```

**Preload Script:**

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('polingo', {
  t: (msgid: string, vars?: Record<string, any>) => ipcRenderer.invoke('translate', msgid, vars),

  setLocale: (locale: string) => ipcRenderer.invoke('setLocale', locale),
});
```

**Renderer:**

```html
<!-- index.html -->
<script>
  window.polingo.t('Hello, World!').then((text) => {
    document.getElementById('greeting').textContent = text;
  });
</script>
```

### Next.js API Routes

```typescript
// pages/api/translate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPolingo } from '@polingo/node';

// Create once, reuse for all requests
let polingo;

async function getPolingo() {
  if (!polingo) {
    polingo = await createPolingo({
      locale: 'en',
      locales: ['es', 'en', 'fr'],
      directory: './locales',
    });
  }
  return polingo;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const polingo = await getPolingo();
  const locale = req.headers['accept-language']?.split(',')[0] || 'en';
  await polingo.setLocale(locale);

  const message = polingo.t('API response message');
  res.json({ message });
}
```

## File Formats

### .po Files (Recommended for Development)

Plain text, human-readable, version control friendly:

```po
# locales/es/messages.po
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\n"

msgid "Hello, World!"
msgstr "¡Hola, Mundo!"

msgid "Welcome, {name}!"
msgstr "¡Bienvenido, {name}!"

msgid "{n} item"
msgid_plural "{n} items"
msgstr[0] "{n} artículo"
msgstr[1] "{n} artículos"

msgctxt "menu"
msgid "File"
msgstr "Archivo"
```

### .mo Files (Recommended for Production)

Binary format, faster to parse:

```typescript
const polingo = await createPolingo({
  locale: 'es',
  directory: './locales',
  format: 'mo', // Use .mo files
});
```

Compile .po to .mo using [@polingo/cli](../cli):

```bash
polingo compile locales/es/messages.po
```

## Hot Reload (Development)

Enable file watching during development:

```typescript
const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  directory: './locales',
  watch: process.env.NODE_ENV === 'development',
});

// Translations automatically reload when .po files change
```

**Warning:** Only use `watch: true` in development. It uses `fs.watch` which can impact performance.

## Performance Tips

### 1. Preload all locales at startup

```typescript
// ✅ Good - load once
const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en', 'fr', 'de'], // Preload all
  directory: './locales',
});

// ❌ Bad - load on demand
app.use(async (req, res, next) => {
  await polingo.load(req.locale); // Slow!
});
```

### 2. Use .mo files in production

```typescript
// Development: .po (easier to edit)
const devPolingo = await createPolingo({
  format: 'po',
  watch: true,
});

// Production: .mo (faster)
const prodPolingo = await createPolingo({
  format: 'mo',
  cache: true,
});
```

### 3. Cache the translator instance

```typescript
// ✅ Good - create once
let polingo;
async function getPolingo() {
  if (!polingo) {
    polingo = await createPolingo({
      /* ... */
    });
  }
  return polingo;
}

// ❌ Bad - create on every request
app.get('/', async (req, res) => {
  const polingo = await createPolingo({
    /* ... */
  });
});
```

## Troubleshooting

### "Cannot find locale file"

Check your directory structure:

```typescript
const polingo = await createPolingo({
  directory: './locales',
  debug: true, // Enable debug logs
});

// Looks for: ./locales/es/messages.po
// Or: ./locales/es/LC_MESSAGES/messages.po
```

### "Invalid .po file"

Validate your .po files:

```bash
msgfmt -c locales/es/messages.po
```

Or use [@polingo/cli](../cli):

```bash
polingo validate locales/**/*.po
```

### "Translations not updating"

Clear the cache:

```typescript
polingo.clearCache();
await polingo.load('es'); // Reload
```

Or disable caching:

```typescript
const polingo = await createPolingo({
  cache: false, // No caching
});
```

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import type { NodeLoader, CreatePolingoOptions } from '@polingo/node';
import type { Translator } from '@polingo/core';

const options: CreatePolingoOptions = {
  locale: 'es',
  directory: './locales',
};

const polingo: Translator = await createPolingo(options);
```

## Related Packages

- [@polingo/core](../core) - Core translation engine
- [@polingo/web](../web) - Browser adapter
- [@polingo/react](../react) - React hooks and components
- [@polingo/cli](../cli) - CLI tools

## License

MIT © [Reinier Hernández]
