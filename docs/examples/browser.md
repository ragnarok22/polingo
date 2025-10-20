---
outline: deep
---

# Browser Integration

Load translations over HTTP and render localized UI in the browser using `@polingo/web`. This page provides complete step-by-step examples for vanilla JavaScript and popular frameworks.

## Vanilla JavaScript Complete Example

### Step 1: Create the Repository

```bash
# Create project directory
mkdir polingo-web-example
cd polingo-web-example

# Initialize package.json
npm init -y

# Initialize git repository
git init
```

### Step 2: Install Packages

```bash
# Install runtime dependencies
npm install @polingo/web

# Install development dependencies
npm install --save-dev vite @polingo/cli typescript
```

### Step 3: Configure Vite

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
});
```

Add to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "compile": "polingo compile locales --out public/i18n --format json --pretty"
  }
}
```

### Step 4: Create HTML Structure

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Polingo Web Example</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .controls {
        margin-bottom: 2rem;
      }
      select {
        padding: 0.5rem;
        font-size: 1rem;
      }
      .counter {
        margin: 1rem 0;
      }
      button {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="controls">
      <label for="locale-selector">Language:</label>
      <select id="locale-selector">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
      </select>
    </div>

    <h1 id="title"></h1>
    <p id="description"></p>

    <div class="counter">
      <p id="counter-text"></p>
      <button id="increment">+</button>
      <button id="decrement">-</button>
    </div>

    <button id="cta"></button>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### Step 5: Add Polingo Setup

Create `src/main.ts`:

```ts
import { createPolingo, type WebPolingoInstance } from '@polingo/web';

let polingo: WebPolingoInstance;
let count = 0;

async function bootstrap() {
  // Detect user's preferred language
  const browserLang = navigator.language.split('-')[0] ?? 'en';
  const savedLang = localStorage.getItem('locale') ?? browserLang;

  polingo = await createPolingo({
    locale: savedLang,
    locales: ['en', 'es', 'fr'],
    loader: { baseUrl: '/i18n' },
    cacheOptions: { prefix: 'myapp', ttlMs: 10 * 60_000 },
  });

  // Set up locale selector
  const localeSelector = document.querySelector<HTMLSelectElement>('#locale-selector')!;
  localeSelector.value = savedLang;
  localeSelector.addEventListener('change', async (event) => {
    const locale = (event.target as HTMLSelectElement).value;
    await polingo.setLocale(locale);
    localStorage.setItem('locale', locale);
    renderUI();
  });

  // Set up counter buttons
  document.querySelector('#increment')!.addEventListener('click', () => {
    count++;
    renderUI();
  });

  document.querySelector('#decrement')!.addEventListener('click', () => {
    count = Math.max(0, count - 1);
    renderUI();
  });

  // Initial render
  renderUI();
}

function renderUI() {
  // Basic translations
  document.querySelector('#title')!.textContent = polingo.t('Welcome');
  document.querySelector('#description')!.textContent = polingo.t(
    'This is a simple example of Polingo in the browser.'
  );

  // Plural translations
  document.querySelector('#counter-text')!.textContent = polingo.tn(
    'You clicked {count} time',
    'You clicked {count} times',
    count
  );

  // Translation with context
  document.querySelector('#cta')!.textContent = polingo.tp('button', 'Download now');
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap translations', error);
  document.body.innerHTML = '<p>Failed to load translations. Please refresh the page.</p>';
});
```

### Step 6: Extract and Translate

Extract translation strings:

```bash
npm run extract
```

This creates:

- `locales/en/messages.po`
- `locales/es/messages.po`
- `locales/fr/messages.po`

Edit `locales/es/messages.po`:

```po
msgid "Welcome"
msgstr "Bienvenido"

msgid "This is a simple example of Polingo in the browser."
msgstr "Este es un ejemplo simple de Polingo en el navegador."

msgid "You clicked {count} time"
msgid_plural "You clicked {count} times"
msgstr[0] "Hiciste clic {count} vez"
msgstr[1] "Hiciste clic {count} veces"

msgctxt "button"
msgid "Download now"
msgstr "Descargar ahora"
```

Edit `locales/fr/messages.po`:

```po
msgid "Welcome"
msgstr "Bienvenue"

msgid "This is a simple example of Polingo in the browser."
msgstr "Ceci est un exemple simple de Polingo dans le navigateur."

msgid "You clicked {count} time"
msgid_plural "You clicked {count} times"
msgstr[0] "Vous avez cliqué {count} fois"
msgstr[1] "Vous avez cliqué {count} fois"

msgctxt "button"
msgid "Download now"
msgstr "Télécharger maintenant"
```

### Step 7: Compile Catalogs

Compile `.po` files to JSON for the browser:

```bash
npm run compile
```

This creates:

- `public/i18n/en/messages.json`
- `public/i18n/es/messages.json`
- `public/i18n/fr/messages.json`

### Step 8: Verify Results

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser and:

1. Verify the page loads with your browser's default language
2. Switch between languages using the dropdown
3. Click the + and - buttons to test plural translations
4. Open DevTools → Application → Local Storage to see cached translations
5. Refresh the page - it should remember your language preference

### Additional Tips

- Catalogs are requested from `/i18n/<locale>/messages.json`
- The loader uses LocalStorage to cache parsed catalogs across page reloads
- Disable persistent caching by passing `cache: false` during development
- Deploy catalogs behind a CDN for faster global access
- The translator gracefully falls back to source strings on cache miss

---

## React Complete Example

### Step 1: Create the Repository

```bash
# Create project with Vite
npm create vite@latest polingo-react-example -- --template react-ts
cd polingo-react-example

# Initialize git repository
git init
```

### Step 2: Install Packages

```bash
# Install runtime dependencies
npm install @polingo/react @polingo/web @polingo/core

# Install development dependencies
npm install --save-dev @polingo/cli
```

### Step 3: Setup Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "compile": "polingo compile locales --out public/i18n --format json --pretty",
    "validate": "polingo validate locales"
  }
}
```

### Step 4: Add Polingo Provider

Edit `src/App.tsx`:

```tsx
import { PolingoProvider } from '@polingo/react';
import { AppContent } from './components/AppContent';

function App() {
  return (
    <PolingoProvider
      locale={navigator.language.split('-')[0] ?? 'en'}
      locales={['en', 'es', 'fr']}
      loader={{ baseUrl: '/i18n' }}
      cacheOptions={{ prefix: 'myapp', ttlMs: 10 * 60_000 }}
    >
      <AppContent />
    </PolingoProvider>
  );
}

export default App;
```

### Step 5: Create Components

Create `src/components/AppContent.tsx`:

```tsx
import { useTranslation, useLocale } from '@polingo/react';
import { useState } from 'react';

export function AppContent() {
  const { t, tp, tn } = useTranslation();
  const { locale, setLocale } = useLocale();
  const [count, setCount] = useState(0);

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <label htmlFor="locale">Language: </label>
        <select id="locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </div>

      <h1>{t('Welcome to Polingo')}</h1>
      <p>{t('A modern i18n solution for React applications.')}</p>

      <div style={{ margin: '2rem 0' }}>
        <p>{tn('You clicked {count} time', 'You clicked {count} times', count)}</p>
        <button onClick={() => setCount((c) => c + 1)}>+</button>
        <button onClick={() => setCount((c) => Math.max(0, c - 1))}>-</button>
      </div>

      <button style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
        {tp('button', 'Get Started')}
      </button>
    </div>
  );
}
```

### Step 6: Extract, Translate, and Compile

Extract strings:

```bash
npm run extract
```

Edit `locales/es/messages.po`:

```po
msgid "Welcome to Polingo"
msgstr "Bienvenido a Polingo"

msgid "A modern i18n solution for React applications."
msgstr "Una solución i18n moderna para aplicaciones React."

msgid "You clicked {count} time"
msgid_plural "You clicked {count} times"
msgstr[0] "Hiciste clic {count} vez"
msgstr[1] "Hiciste clic {count} veces"

msgctxt "button"
msgid "Get Started"
msgstr "Comenzar"
```

Edit `locales/fr/messages.po`:

```po
msgid "Welcome to Polingo"
msgstr "Bienvenue à Polingo"

msgid "A modern i18n solution for React applications."
msgstr "Une solution i18n moderne pour les applications React."

msgid "You clicked {count} time"
msgid_plural "You clicked {count} times"
msgstr[0] "Vous avez cliqué {count} fois"
msgstr[1] "Vous avez cliqué {count} fois"

msgctxt "button"
msgid "Get Started"
msgstr "Commencer"
```

Compile catalogs:

```bash
npm run compile
```

### Step 7: Verify Results

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173` and:

1. Verify the page loads in your browser's default language
2. Switch languages using the dropdown
3. Test the counter with plural translations
4. Check that translations update reactively
5. Inspect Network tab to see catalog loading

---

## Vue 3 Complete Example

### Step 1: Create the Repository

```bash
# Create project with Vite
npm create vite@latest polingo-vue-example -- --template vue-ts
cd polingo-vue-example

# Initialize git repository
git init
```

### Step 2: Install Packages

```bash
# Install runtime dependencies
npm install @polingo/vue @polingo/web @polingo/core

# Install development dependencies
npm install --save-dev @polingo/cli
```

### Step 3: Setup Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "compile": "polingo compile locales --out public/i18n --format json --pretty",
    "validate": "polingo validate locales"
  }
}
```

### Step 4: Add Polingo Setup

Edit `src/main.ts`:

```ts
import { createApp } from 'vue';
import { createPolingoPlugin } from '@polingo/vue';
import App from './App.vue';

const app = createApp(App);

const polingo = await createPolingoPlugin({
  locale: navigator.language.split('-')[0] ?? 'en',
  locales: ['en', 'es', 'fr'],
  loader: { baseUrl: '/i18n' },
  cacheOptions: { prefix: 'myapp', ttlMs: 10 * 60_000 },
});

app.use(polingo);
app.mount('#app');
```

### Step 5: Create Component

Edit `src/App.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { usePolingo } from '@polingo/vue';

const { t, tp, tn, locale, setLocale } = usePolingo();
const count = ref(0);
</script>

<template>
  <div class="app">
    <div class="controls">
      <label for="locale">Language: </label>
      <select
        id="locale"
        :value="locale"
        @change="(e) => setLocale((e.target as HTMLSelectElement).value)"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
      </select>
    </div>

    <h1>{{ t('Welcome to Polingo Vue') }}</h1>
    <p>{{ t('Building multilingual Vue apps made easy.') }}</p>

    <div class="counter">
      <p>{{ tn('You clicked {count} time', 'You clicked {count} times', count) }}</p>
      <button @click="count++">+</button>
      <button @click="count = Math.max(0, count - 1)">-</button>
    </div>

    <button class="cta">{{ tp('button', 'Learn More') }}</button>
  </div>
</template>

<style scoped>
.app {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.controls {
  margin-bottom: 2rem;
}

.counter {
  margin: 2rem 0;
}

button {
  padding: 0.5rem 1rem;
  margin: 0 0.5rem;
  font-size: 1rem;
  cursor: pointer;
}

.cta {
  margin-top: 1rem;
}
</style>
```

### Step 6: Extract, Translate, and Compile

Extract strings:

```bash
npm run extract
```

Edit `locales/es/messages.po`:

```po
msgid "Welcome to Polingo Vue"
msgstr "Bienvenido a Polingo Vue"

msgid "Building multilingual Vue apps made easy."
msgstr "Construir aplicaciones Vue multilingües es fácil."

msgid "You clicked {count} time"
msgid_plural "You clicked {count} times"
msgstr[0] "Hiciste clic {count} vez"
msgstr[1] "Hiciste clic {count} veces"

msgctxt "button"
msgid "Learn More"
msgstr "Aprender más"
```

Compile catalogs:

```bash
npm run compile
```

### Step 7: Verify Results

Start the development server:

```bash
npm run dev
```

Test all features as described in previous examples.

---

## Serving Catalogs

Export gettext catalogs as JSON during your build:

```bash
npm run compile
# Or directly:
npx polingo compile locales --out public/i18n --format json --pretty
```

Use the same domain and locale naming conventions on the server so the loader can find the files automatically. The command above keeps the output structure aligned with what `@polingo/web` expects (`public/i18n/<locale>/messages.json`).

## Production Build

For production builds, integrate compilation into your build pipeline:

```json
{
  "scripts": {
    "prebuild": "npm run extract && npm run validate && npm run compile",
    "build": "vite build"
  }
}
```

This ensures translations are always extracted, validated, and compiled before building.
