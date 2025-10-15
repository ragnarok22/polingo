# Polingo Express Example

Tiny Express server that mounts the `@polingo/node` middleware so every request gets `req.polingo` for translations.

## Quick Start

```bash
pnpm install
pnpm dev       # http://localhost:3000 (override with PORT=4000 pnpm dev)
```

Swap in `npm` or `yarn` if you prefer another package manager.

## What It Shows

- Locale negotiation via `?locale=` or the `Accept-Language` header
- Plural handling with `tn()` in the `/notifications` route
- Auto-reloading `.po` files during development

## Handy Scripts

- `pnpm dev` – watch mode with hot reload
- `pnpm start` – run once with the compiled output
- `pnpm build` – type-check and emit JavaScript to `dist/`

Locales live under `./locales/<lang>/messages.po`; edit them and refresh the browser to see the response change.
