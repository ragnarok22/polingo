---
outline: deep
---

# Interactive Playground

Explore Polingo in a live environment and iterate on translations without guessing. The examples below mirror the repository layout so you can adapt them to your own project.

## React + Vite demo

1. Install dependencies at the repo root: `pnpm install`.
2. Run the example in watch mode:

   ```bash
   pnpm --filter polingo-react-example dev
   ```

3. Visit `http://localhost:5173` to see the UI render strings loaded from `.po` catalogs compiled into JSON.
4. Edit `examples/react-vite/locales/es/messages.po` and keep the terminal open. Vite reloads automatically while the Polingo CLI recompiles the catalog through the `compile` script.

Use `pnpm --filter polingo-react-example compile` whenever you add locales. The command runs `pnpm exec polingo compile ...` under the hood so you can copy it into your own build scripts.

## Try the CLI commands

The CLI ships with three commands that make translation workflows interactive:

```bash
pnpm exec polingo extract src --out locales/messages.pot --locales locales --languages en,es --default-locale en
pnpm exec polingo compile locales/en --out public/i18n/en --format json
pnpm exec polingo validate locales --strict
```

- `extract` scans source files for gettext calls, emits a `.pot` template, and (when `--locales` is passed) keeps each locale's `.po` file up to date—copying strings into the default locale automatically.
- `compile` transforms `.po` or `.mo` catalogs into JSON or compiled binaries.
- `validate` checks for missing plurals, inconsistent placeholders, and syntax errors.

Combine `extract` with `pnpm exec polingo compile` inside `package.json` scripts to automate the roundtrip between developers and translators.

## Hot reload in Node.js

Enable the built-in watcher to see translations update without restarting your server:

```ts
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es'],
  directory: './locales',
  watch: true,
  debug: true,
});
```

With `watch: true`, `TranslationWatcher` keeps the caches in sync, and `debug: true` prints when files change. Combine it with `nodemon` or `tsx watch` for a smooth development loop.

## Share on playground services

Need to demo Polingo outside your local machine? Zip the `examples/react-vite` folder or create a reproduction with:

```bash
pnpm create vite polingo-playground -- --template react-ts
cd polingo-playground
pnpm add @polingo/core @polingo/web
```

Copy the `locales/` directory and translator setup from the example into the new project. Most online editors (StackBlitz, CodeSandbox) support Vite out of the box, so you can paste the project and iterate collaboratively.
