# @polingo/react

React bindings for the Polingo translation engine.

This package exposes a context provider, data hooks, and a rich-text `<Trans />` component that wrap the framework-agnostic `Translator` from `@polingo/core`.

## Usage

```tsx
import { PolingoProvider, Trans, useTranslation } from '@polingo/react';
import { createPolingo } from '@polingo/web';

function Example(): JSX.Element {
  const { t, tn, setLocale, locale } = useTranslation();

  return (
    <div>
      <p>{t('Hello {name}', { name: 'Polingo' })}</p>
      <p>{tn('You have {n} message', 'You have {n} messages', 3)}</p>

      <button type="button" onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}>
        <Trans message="Switch to <0>Spanish</0>" components={[<strong />]} />
      </button>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <PolingoProvider
      create={() =>
        createPolingo({
          locale: 'en',
          locales: ['en', 'es'],
          loader: { baseUrl: '/i18n' },
        })
      }
    >
      <Example />
    </PolingoProvider>
  );
}
```

The provider also accepts an existing `Translator` instance (useful for SSR pipelines) and exposes loading and error states while catalogs are being fetched.

## API surface

- `PolingoProvider` – wires a translator (created on demand or injected) into React context.
- `useTranslation()` – access helper methods, locale, loading state, and `setLocale`.
- `useTranslator()` / `usePolingo()` / `useLocale()` – low-level access helpers.
- `Trans` – render translations that contain interpolation variables or component placeholders.

## Related packages

- [`@polingo/core`](../core) – translation runtime shared by all adapters.
- [`@polingo/node`](../node) – filesystem loader, middleware, and watcher for Node.js.
- [`@polingo/web`](../web) – fetch-based loader for browsers that pairs well with React.
- [`@polingo/cli`](../cli) – forthcoming command line tooling.

## License

MIT © Reinier Hernández Avila
