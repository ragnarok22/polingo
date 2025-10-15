# Polingo Express Example

This example demonstrates how to mount the `@polingo/node` middleware in an Express server. Each request gets a translator attached to `req.polingo`, so routes can respond in the requested language using `?locale=...` or the `Accept-Language` header. The project is standalone—copy the `express` folder anywhere and install dependencies to try it out.

## Project Layout

```
express/
├── locales/            # Source gettext catalogs (.po)
│   ├── en/messages.po
│   └── es/messages.po
├── src/server.ts       # Express server with Polingo middleware
├── package.json
└── tsconfig.json
```

## Getting Started

```bash
pnpm install
pnpm dev
```

> Prefer `npm` or `yarn`? Swap the commands to match your package manager.

By default the server listens on `http://localhost:3000`. Pass a custom port with `PORT=4000 pnpm dev`.

## Available Scripts

- `pnpm dev` – Start the server with `tsx` (restarts on file changes)
- `pnpm start` – Run the server once with the current sources
- `pnpm build` – Type-check and emit JavaScript to `dist/`

## Locale Switching

- Query string: `GET /greeting/Alice?locale=es`
- Header: `GET /notifications` with `Accept-Language: es`

When `NODE_ENV !== "production"` the middleware watches `.po` files and reloads translations on the fly.

## Example Routes

- `GET /` – Plain text landing message that shows the active locale
- `GET /greeting/:name` – Returns a localized greeting JSON payload
- `GET /notifications?count=3` – Demonstrates pluralization via `tn()`
