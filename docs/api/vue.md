---
outline: deep
---

# @polingo/vue

Vue 3 bindings that bridge the web translator with idiomatic composition APIs, providers, and a template-friendly `<Trans>` component.

## Installation

```bash
pnpm add @polingo/vue @polingo/web
```

The adapter assumes Vue 3 with the Composition API (built into core). Provide your catalog loader via `@polingo/web`.

## `PolingoProvider`

Wrap your root component so every descendant can inject translation helpers.

```ts
import { createApp } from 'vue';
import App from './App.vue';
import { PolingoProvider } from '@polingo/vue';

createApp({
  render() {
    return (
      <PolingoProvider
        create={{
          locale: 'en',
          locales: ['en', 'es'],
          loader: { baseUrl: '/locales' },
        }}
        loadingFallback="Loading translations…"
        onError={(error) => console.error('Translator failed', error)}
      >
        <App />
      </PolingoProvider>
    );
  },
}).mount('#app');
```

### Props

| Prop              | Type                                                        | Description                                                                     |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `create`          | `CreatePolingoOptions \| () => Promise<WebPolingoInstance>` | Optional async factory that instantiates the translator through `@polingo/web`. |
| `translator`      | `Translator`                                                | Provide an already-initialized translator (SSR hydration, tests, etc.).         |
| `loadingFallback` | `VNodeChild`                                                | Rendered while the translator is loading.                                       |
| `onError`         | `(error: unknown) => void`                                  | Invoked when translator creation or locale switching fails.                     |

Only one of `create` or `translator` should be set.

## Composables

All composables require an ancestor `<PolingoProvider>`. They expose refs so UI updates reactively when the locale changes.

### `usePolingo()`

Returns the full context:

```ts
const { translator, locale, loading, error, setLocale, t, tp, tn, tnp } = usePolingo();
```

`translator` is a shallow ref that resolves once the provider finishes loading.

### `useTranslator()`

Returns the raw translator instance (throws if the provider is still loading or missing). Useful for advanced cases such as manual cache control.

### `useTranslation()`

Convenience composable that returns computed refs plus translation helpers:

```ts
const { locale, loading, error, setLocale, t, tn } = useTranslation();
```

### `useLocale()`

Focuses on locale switching:

```ts
const { locale, loading, setLocale } = useLocale();
await setLocale('fr');
```

## `<Trans>`

Render translated strings directly in templates and compose inline markup with `components`.

```vue
<script setup lang="ts">
import { h } from 'vue';
</script>

<template>
  <Trans
    message="Read the <0>documentation</0>."
    :components="[(children) => h('a', { href: '/docs' }, children)]"
  />
</template>
```

### Props

| Prop         | Type                                       | Description                                                                               |
| ------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `message`    | `string`                                   | Required `msgid` to translate.                                                            |
| `context`    | `string`                                   | Optional `msgctxt` for disambiguation.                                                    |
| `plural`     | `string`                                   | Plural `msgid_plural`; used with `count`.                                                 |
| `count`      | `number`                                   | Enables plural resolution (`tn`/`tnp`).                                                   |
| `values`     | `Record<string, string>`                   | Interpolation variables referenced as `{name}`.                                           |
| `components` | `Component[] \| Record<string, Component>` | Inline markup placeholders: `<Trans message="Click <0>here</0>" :components="[Link]" />`. |
| `fallback`   | `string`                                   | Rendered while translations are loading.                                                  |

Use functions inside `components` when you need dynamic content:

```vue
<Trans
  message="Signed in as <username/>."
  :components="{
    username: (children) => h('strong', null, children.length ? children : user.email),
  }"
/>
```

## Error Handling & SSR

- SSR flows can pass a hydrated translator via the `translator` prop to skip client-side loading.
- The `onError` callback is ideal for toast notifications or logging services.
- When hydrating, call `await translator.load(locales)` on the server so the initial render has every catalog needed by your route.
