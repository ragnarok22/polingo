---
outline: deep
---

# @polingo/react

React bindings that wrap the browser translator (`@polingo/web`) with idiomatic providers, hooks, and a `<Trans>` component.

## Installation

```bash
pnpm add @polingo/react @polingo/web
```

Bring your own loader configuration via the web adapter—React components focus purely on state management and rendering.

## `PolingoProvider`

Context provider that exposes the translator and helpers to the component tree. You can pass an existing translator (for SSR hydration) or let the provider create one asynchronously.

The `create` prop accepts two forms:

1. **Configuration object (recommended)** - Pass `CreatePolingoOptions` directly, and the provider calls `createPolingo()` internally
2. **Factory function (advanced)** - Pass a function that returns a `Promise<WebPolingoInstance>` for custom initialization logic

### Basic usage with configuration object

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PolingoProvider } from '@polingo/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PolingoProvider
      create={{
        locale: 'en',
        locales: ['en', 'es'],
        loader: { baseUrl: '/locales' },
      }}
      loadingFallback={<p>Loading translations…</p>}
      onError={(error) => console.error('Translator failed', error)}
    >
      <App />
    </PolingoProvider>
  </StrictMode>
);
```

### Advanced usage with factory function

```tsx
import { createPolingo } from '@polingo/web';

<PolingoProvider
  create={() =>
    createPolingo({
      locale: 'en',
      locales: ['en', 'es'],
      loader: { baseUrl: '/locales' },
    })
  }
  loadingFallback={<p>Loading translations…</p>}
>
  <App />
</PolingoProvider>;
```

### Props

| Prop              | Type                                                        | Description                                                                      |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `create`          | `CreatePolingoOptions \| () => Promise<WebPolingoInstance>` | Configuration object or factory to initialize a translator using `@polingo/web`. |
| `translator`      | `Translator`                                                | Use an existing translator (skip async creation).                                |
| `loadingFallback` | `ReactNode`                                                 | UI rendered while the translator is loading.                                     |
| `onError`         | `(error: unknown) => void`                                  | Error callback triggered when creation or locale switching fails.                |
| `children`        | `ReactNode`                                                 | Your app components.                                                             |

> Passing both `translator` and `create` is invalid—the provider enforces exactly one mode.

## Hooks

All hooks must be used under `PolingoProvider`; they throw otherwise.

### `usePolingo()`

Returns the full context object:

```ts
const { translator, locale, loading, error, setLocale, t, tp, tn, tnp } = usePolingo();
```

### `useTranslator()`

Returns the underlying translator instance (or `null` while loading), allowing you to call methods like `load` or `clearCache`.

### `useTranslation()`

Convenience wrapper that exposes translation helpers and the active locale:

```ts
const { locale, loading, error, setLocale, t, tp, tn, tnp } = useTranslation();
```

### `useLocale()`

Lightweight hook focused on the active locale:

```ts
const { locale, loading, setLocale } = useLocale();
await setLocale('es');
```

The setter returns a promise so UI components can guard against race conditions.

## `<Trans>`

Component version of `t` with optional interpolation and render props.

```tsx
import { Trans } from '@polingo/react';

function CheckoutSummary({ name, total }: { name: string; total: number }) {
  return (
    <Trans
      message="Thank you for your order, {name}! Total: {total}"
      values={{ name, total: total.toFixed(2) }}
      fallback="Thank you for your order!"
    />
  );
}
```

- `message` (required) – `msgid` in your catalogs.
- `context` – `msgctxt` used to disambiguate (`tp`/`tnp`).
- `plural` & `count` – Provide plural grammar (`tn`/`tnp` semantics).
- `values` – Interpolation map for `{placeholder}` tokens.
- `components` – Map or array of React nodes/functions to render inline markup (e.g. `<Trans message="Click <0>here</0>" components={[<a href="/help" />]} />`).
- `fallback` – String rendered while the provider is still loading a translator.

For advanced markup, pass functions that receive the translated children:

```tsx
<Trans
  message="Signed in as <username/>."
  components={{
    username: (children) => <strong>{children.length ? children : user.email}</strong>,
  }}
/>
```

## Error Handling & SSR

- When you hydrate on the client with a preloaded translator, pass it via the `translator` prop to avoid flashing fallback states.
- The `onError` callback receives any error thrown by `createPolingo` or `setLocale`. Use it to surface toast notifications or logging.
- During SSR, call `translator.load(locales)` ahead of time and serialize the translator state alongside your HTML.
