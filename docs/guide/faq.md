---
outline: deep
---

# FAQ

## What Node.js and browser versions are supported?

Polingo targets Node.js 18+ and modern browsers with ES2020 features. The web package relies on the Fetch API and `localStorage`; provide polyfills if you support legacy environments.

## Where should translation catalogs live?

Place catalogs under `<directory>/<locale>/<domain>.po` (or `.mo`). For example, `locales/es/messages.po`. Use additional domains (`emails.po`, `admin.po`) to keep catalogs focused and avoid merge conflicts.

## How do I handle missing translations?

The translator falls back to the `fallback` locale (default: `en`). Enable `debug: true` to log every fallback during development, or run `pnpm exec polingo validate locales --strict` in CI to fail when keys are missing.

## Can I load catalogs on demand?

Yes. Call `await translator.load(['fr'])` whenever you introduce a new locale. The translator caches results, so subsequent lookups are synchronous. Combine this with `translator.hasLocale('fr')` to avoid duplicate loads.

## How do I translate interpolated messages?

Use the `{name}` placeholder syntax inside your `.po` files:

```
msgid "Welcome, {name}!"
msgstr "¡Bienvenido, {name}!"
```

Then call `polingo.t('Welcome, {name}!', { name: 'Ada' })`. The translator validates placeholders and throws if you pass an unexpected key.

## Is there React support?

Yes. Install `@polingo/react` for hooks and context helpers that wrap the core translator. See the `examples/react-vite` project and the `usePolingo` hook for idiomatic usage.

## How do I bundle catalogs for the browser?

Use the CLI to compile catalogs to JSON:

```bash
pnpm exec polingo compile locales/es --out public/i18n/es --format json
```

Expose the compiled files via your web server or CDN and configure `@polingo/web` with `loader: { baseUrl: '/i18n' }`.
