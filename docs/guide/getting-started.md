---
outline: deep
---

# Getting Started

Polingo brings industry-standard gettext catalogs to modern JavaScript runtimes. This guide walks you through installing the right package, validating your setup, and rendering your first translation in both Node.js and the browser.

## Prerequisites

- Node.js 18 or newer
- A package manager (`pnpm`, `npm`, or `yarn`)
- Translation catalogs stored as `.po` or `.mo` files (you can add them later)

## Pick Your Setup Path

Polingo offers two onboarding flows depending on whether you are starting fresh or integrating into an existing codebase.

### 1. Scaffold a New Project

Use the project generator to bootstrap an application with working translations, scripts, and examples:

```bash
pnpm create polingo-app
```

Other package managers are supported too:

- npm: `npm create polingo-app@latest`
- yarn: `yarn create polingo-app`
- bun: `bun create polingo-app`

The wizard asks for your target runtime (React, Vue, Node, Express, etc.), sets up TypeScript, installs the right Polingo adapters, and seeds sample catalogs so you can start translating immediately.

### 2. Add Polingo to an Existing Project

Inject the CLI into your project and let the initializer wire catalog folders, scripts, and configuration:

```bash
npx polingo init
```

Prefer a specific package manager?

- pnpm: `pnpm dlx polingo init`
- yarn: `yarn dlx polingo init`
- bun: `bunx polingo init`

The initializer leaves your package manager intact, detects frameworks automatically, and only prompts when configuration changes are required.

## Installation

Pick the packages that match your runtime. You can mix and match them in the same project. If you ran `pnpm create polingo-app` or `polingo init`, most of these dependencies are already installed—you can skip straight to verification.

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
  loader: { baseUrl: '/i18n' },
});

document.querySelector('#headline')!.textContent = polingo.t('Welcome');
```

Ship JSON exports of your catalogs at `<baseUrl>/<locale>/<domain>.json`. The default base URL is `/i18n`, but you can point the loader at another path or CDN by changing `loader.baseUrl` (or providing a custom `loader.buildUrl`). To generate the files for the default path, run `pnpm exec polingo compile locales --out public/i18n --format json --pretty`.

## Next steps

- Follow a detailed walkthrough in the [Step-by-Step Project](/guide/step-by-step-guide).
- Learn how to organize and keep catalogs up-to-date in [Catalog Management](/guide/catalog-management).
- Understand the translator API, fallbacks, and interpolation in [Runtime Translators](/guide/runtime).
- See how to keep translations fresh during development in [Development Workflow](/guide/development-workflow).
