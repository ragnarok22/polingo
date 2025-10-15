---
outline: deep
---

# Getting Started

Polingo brings industry-standard gettext catalogs to modern JavaScript runtimes. This guide walks you through installing the right package, validating your setup, and rendering your first translation in both Node.js and the browser.

## Prerequisites

- Node.js 18 or newer
- A package manager (`pnpm`, `npm`, or `yarn`)
- Translation catalogs stored as `.po` or `.mo` files (you can add them later)

## Installation

Pick the packages that match your runtime. You can mix and match them in the same project.

### Node.js backends

```bash
pnpm add @polingo/node
```

### Browser or edge environments

```bash
pnpm add @polingo/web
```

### Framework-agnostic usage

```bash
pnpm add @polingo/core
```

### Framework bindings

- React: `pnpm add @polingo/react @polingo/web`
- Vue: `pnpm add @polingo/vue @polingo/web`

### CLI tooling (recommended)

Install the CLI as a dev dependency when you need to extract, compile, or validate catalogs:

```bash
pnpm add -D @polingo/cli
```

## Verify your environment

1. Create a simple `locales/en/messages.po` catalog with the following content:

   ```
   msgid ""
   msgstr ""
   "Language: en\n"

   msgid "Hello"
   msgstr "Hello"
   ```

2. Run a smoke test script to ensure catalogs load:

   ```js
   // check-polingo.mjs
   import { createPolingo } from '@polingo/node';

   const polingo = await createPolingo({
     locale: 'en',
     locales: ['en'],
     directory: './locales',
   });

   console.log(polingo.t('Hello'));
   ```

   Then execute `node check-polingo.mjs`.

3. If you are using TypeScript, add `"@polingo/*"` to your `types` array or rely on automatic type acquisition.
4. When the setup looks good, continue with the runtime-specific quick starts below.

## Project structure

Polingo expects catalogs under `<directory>/<locale>/<domain>.po` (or `.mo`). Start with:

```
locales/
└─ en/
   └─ messages.po
└─ es/
   └─ messages.po
```

Keep domains small—`messages.po` for UI copy, `emails.po` for transactional templates, and so on. Catalogs can be compiled to `.mo` files if you prefer binary formats.

## Quick Start (Node.js)

```ts
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  directory: './locales',
  fallback: 'en',
  watch: process.env.NODE_ENV === 'development',
});

console.log(polingo.t('Hello')); // => "Hola"
console.log(polingo.tn('{n} item', '{n} items', 3)); // => "3 artículos"
```

When `watch` is enabled, a file watcher reloads catalogs whenever you save `.po` or `.mo` files—perfect for development environments.

## Quick Start (Browser)

```ts
import { createPolingo } from '@polingo/web';

const polingo = await createPolingo({
  locale: 'es',
  locales: ['es', 'en'],
  loader: { baseUrl: '/locales' },
});

document.querySelector('#headline')!.textContent = polingo.t('Welcome');
```

Ship JSON exports of your catalogs at `<baseUrl>/<locale>/<domain>.json`. Use the same domain naming convention as the Node.js package. To generate these files, run `pnpm exec polingo compile locales --out public/locales --format json --pretty`.

## Next steps

- Follow a detailed walkthrough in the [Step-by-Step Project](/guide/step-by-step-guide).
- Learn how to organize and keep catalogs up-to-date in [Catalog Management](/guide/catalog-management).
- Understand the translator API, fallbacks, and interpolation in [Runtime Translators](/guide/runtime).
- See how to keep translations fresh during development in [Development Workflow](/guide/development-workflow).
