# Polingo React + Vite Example

Minimal React + Vite app wired with `@polingo/react` and the CLI tools. Copy this folder anywhere and install dependencies to try Polingo in the browser.

## Quick Start

```bash
pnpm install
pnpm extract    # updates ./locales and removes the temporary POT file
pnpm compile    # writes JSON catalogs to public/i18n/
pnpm dev        # starts Vite on http://localhost:5173
```

Swap `pnpm` with your preferred package manager if needed.

## Useful Scripts

- `pnpm extract` – scan `src/` and sync locale catalogs (add `--keep-template` to retain `locales/messages.pot`)
- `pnpm compile` – convert `.po` files in `locales/` to JSON for the web loader
- `pnpm validate` – lint the `.po` files before deployment
- `pnpm build` – run the full pipeline and create a production build in `dist/`
- `pnpm preview` – serve the production build locally

## Translation Loop

1. Write code with `t`, `tp`, `tn`, `tnp`, or `<Trans>`.
2. Run `pnpm extract` to update the catalogs under `./locales`.
3. Translate each `locales/<lang>/messages.po`.
4. Run `pnpm compile` (and optionally `pnpm validate`) before shipping.

The provider setup lives in `src/App.tsx`, and `src/components/` contains small examples that show each translation helper in action.

## Learn More

- [`@polingo/react` docs](../../packages/react/README.md)
- [`@polingo/cli` docs](../../packages/cli/README.md)
- Main project README: [`../../README.md`](../../README.md)
