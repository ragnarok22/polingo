---
outline: deep
---

# React Wrapper

`@polingo/react` wraps the web translator with idiomatic providers, hooks, and a `<Trans>` component. This tutorial bootstraps a Vite project, wires the provider, and showcases locale switching with catalog extraction.

## Create the Project

```bash
pnpm create vite polingo-react-example --template react-ts
cd polingo-react-example
pnpm install
pnpm add @polingo/react @polingo/web
pnpm add -D @polingo/cli
```

If you prefer other package managers:

- npm: `npm create vite@latest polingo-react-example -- --template react-ts`
- yarn: `yarn create vite polingo-react-example --template react-ts`
- bun: `bun create vite polingo-react-example --template react-ts`

## Configure Scripts

Add helpful commands to `package.json`:

```json
{
  "scripts": {
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "compile": "polingo compile locales --out public/i18n --format json --pretty"
  }
}
```

Create the catalog directory:

```bash
mkdir -p locales/en
```

## Provide the Translator

Replace `src/main.tsx` with:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { PolingoProvider } from '@polingo/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PolingoProvider
      create={{
        locale: 'en',
        locales: ['en', 'es', 'fr'],
        loader: { baseUrl: '/i18n' },
      }}
      loadingFallback={<p>Loading translations…</p>}
      onError={(error) => console.error('Translator failed', error)}
    >
      <App />
    </PolingoProvider>
  </React.StrictMode>
);
```

Update `src/App.tsx`:

```tsx
import { useState } from 'react';
import { Trans, useTranslation } from '@polingo/react';

export default function App() {
  const { locale, setLocale, t, tn } = useTranslation();
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header>
        <h1>{t('Welcome to Polingo')}</h1>
        <p>{t('Manage translations without leaving React.')}</p>
        <label>
          Language:
          <select
            value={locale}
            onChange={async (event) => {
              await setLocale(event.target.value);
            }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </label>
      </header>

      <section>
        <p>{tn('Clicked {count} time', 'Clicked {count} times', count)}</p>
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          <Trans message="Click me" context="button" />
        </button>
        <button type="button" onClick={() => setCount(0)}>
          <Trans message="Reset" context="button" />
        </button>
      </section>
    </div>
  );
}
```

## Generate & Translate Catalogs

Extract strings:

```bash
pnpm extract
```

Translate `locales/es/messages.po`:

```po
msgid "Welcome to Polingo"
msgstr "Bienvenido a Polingo"

msgid "Manage translations without leaving React."
msgstr "Gestiona traducciones sin salir de React."

msgid "Clicked {count} time"
msgid_plural "Clicked {count} times"
msgstr[0] "Has hecho clic {count} vez"
msgstr[1] "Has hecho clic {count} veces"

msgctxt "button"
msgid "Click me"
msgstr "Haz clic"

msgctxt "button"
msgid "Reset"
msgstr "Reiniciar"
```

Translate `locales/fr/messages.po` similarly, and compile JSON for the browser:

```bash
pnpm compile
```

Place the output under `public/i18n`. If you serve the JSON catalogs from a different path, update the provider's `loader.baseUrl`
to match.

## Run the App

```bash
pnpm dev
```

Visit `http://localhost:5173`, switch locales, and watch the UI update without reloading. For SSR frameworks, hydrate the provider with an existing translator and omit the `create` prop.
