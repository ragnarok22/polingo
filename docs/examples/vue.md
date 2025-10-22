---
outline: deep
---

# Vue Wrapper

The `@polingo/vue` package offers a `<PolingoProvider>` component and composables that mirror the React experience. This guide bootstraps a Vite + Vue project, configures the provider, and demonstrates locale switching.

## Create the Project

```bash
pnpm create vite polingo-vue-example --template vue-ts
cd polingo-vue-example
pnpm install
pnpm add @polingo/vue @polingo/web
pnpm add -D @polingo/cli
```

Other package managers:

- npm: `npm create vite@latest polingo-vue-example -- --template vue-ts`
- yarn: `yarn create vite polingo-vue-example --template vue-ts`
- bun: `bun create vite polingo-vue-example --template vue-ts`

## Wire the Provider

Update `src/main.ts`:

```ts
import { createApp } from 'vue';
import App from './App.vue';
import { PolingoProvider } from '@polingo/vue';

createApp(PolingoProvider, {
  create: {
    locale: 'en',
    locales: ['en', 'es', 'fr'],
    loader: { baseUrl: '/i18n' },
  },
  loadingFallback: 'Loading translations…',
})
  .component('App', App)
  .mount('#app');
```

Replace `src/App.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useTranslation, Trans } from '@polingo/vue';

const { locale, setLocale, t, tn } = useTranslation();
const count = ref(0);

async function changeLocale(event: Event) {
  const target = event.target as HTMLSelectElement;
  await setLocale(target.value);
}
</script>

<template>
  <main class="container">
    <header>
      <h1>{{ t('Welcome to Polingo') }}</h1>
      <p>{{ t('Translate your Vue apps with familiar gettext workflows.') }}</p>

      <label>
        Language:
        <select :value="locale" @change="changeLocale">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </label>
    </header>

    <section>
      <p>{{ tn('Clicked {count} time', 'Clicked {count} times', count) }}</p>
      <button type="button" @click="count++">
        <Trans message="Click me" context="button" />
      </button>
      <button type="button" @click="count = 0">
        <Trans message="Reset" context="button" />
      </button>
    </section>
  </main>
</template>
```

## Catalog Workflow

Add scripts to `package.json`:

```json
{
  "scripts": {
    "extract": "polingo extract src --locales locales --languages en,es,fr --default-locale en",
    "compile": "polingo compile locales --out public/i18n --format json --pretty"
  }
}
```

Extract messages and translate them:

```bash
pnpm extract
```

`locales/es/messages.po`:

```po
msgid "Welcome to Polingo"
msgstr "Bienvenido a Polingo"

msgid "Translate your Vue apps with familiar gettext workflows."
msgstr "Traduce tus aplicaciones Vue con flujos gettext conocidos."

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

Translate the same keys into French and compile JSON catalogs:

```bash
pnpm compile
```

Ensure the output directory matches the `loader.baseUrl` setting—adjust it if you host catalogs somewhere other than `/i18n`.

## Preview

```bash
pnpm dev
```

Navigate to `http://localhost:5173` to toggle languages instantly. In Nuxt or SSR setups, pre-create a translator with `createPolingo` and pass it via the provider’s `translator` prop for faster hydration.
