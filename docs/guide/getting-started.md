---
outline: deep
---

# Getting Started

Polingo brings industry-standard gettext catalogs to modern JavaScript runtimes. This guide helps you install the packages you need and load your first translations in both Node.js and the browser.

## Prerequisites

- Node.js 18 or newer
- A package manager (`pnpm`, `npm`, or `yarn`)
- Translation catalogs stored as `.po` or `.mo` files (you can add them later)

## Installation

Install the package that matches your runtime. The Node.js bundle includes filesystem loading and middleware helpers, while the core package gives you the low-level translator.

```bash
pnpm add @polingo/node
# or
npm install @polingo/node
```

If you only need the framework-agnostic translator (for example in edge runtimes or custom loaders), install the core package instead:

```bash
pnpm add @polingo/core
```

For browser apps, use the web adapter which wraps the core translator with an HTTP loader and localStorage cache:

```bash
pnpm add @polingo/web
```

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

Place your gettext catalogs under `./locales/<locale>/<domain>.po` (or `.mo`). The default domain is `messages`, so a Spanish catalog would live at `locales/es/messages.po`.

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

Ship JSON exports of your catalogs at `<baseUrl>/<locale>/<domain>.json`. Use the same domain naming convention as the Node.js package.

## Next Steps

- Learn how to organize and keep catalogs up-to-date in [Catalog Management](/guide/catalog-management).
- Understand the translator API, fallbacks, and interpolation in [Runtime Translators](/guide/runtime).
- See how to keep translations fresh during development in [Development Workflow](/guide/development-workflow).
