---
outline: deep
---

# Browser Integration

Load translations over HTTP and render localized UI in the browser using `@polingo/web`.

## Bootstrapping in Vanilla JS

```ts
import { createPolingo, type WebPolingoInstance } from '@polingo/web';

let polingo: WebPolingoInstance;

async function bootstrap() {
  polingo = await createPolingo({
    locale: navigator.language.split('-')[0] ?? 'en',
    locales: ['en', 'es'],
    loader: { baseUrl: '/locales' },
    cacheOptions: { prefix: 'myapp', ttlMs: 10 * 60_000 },
  });

  document.querySelector('#title')!.textContent = polingo.t('Welcome');
  document.querySelector('#cta')!.textContent = polingo.t('Download now');
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap translations', error);
});
```

- Catalogs are requested from `/locales/<locale>/messages.json`.
- If you deploy catalogs behind a CDN or experience a cache miss, the translator gracefully falls back to the source strings.
- Disable persistent caching by passing `cache: false` during development.

## Serving Catalogs

Export gettext catalogs as JSON during your build:

```bash
pnpm exec polingo compile locales --out public/locales --format json --pretty
```

Use the same domain and locale naming conventions on the server so the loader can find the files automatically. The command above keeps the output structure aligned with what `@polingo/web` expects (`public/locales/<locale>/messages.json`).

## Switching Locales at Runtime

```ts
// polingo is initialized in the bootstrap() example above.
const localeSelector = document.querySelector<HTMLSelectElement>('#locale');

localeSelector?.addEventListener('change', async (event) => {
  const locale = (event.target as HTMLSelectElement).value;
  await polingo.setLocale(locale);
  rerenderUI(); // re-render your UI with the new locale
});
```

If the requested locale was not preloaded, `setLocale` loads it on demand before updating internal state.

## Using with Frameworks

Polingo pairs well with state or context providers. For example, in React you can keep the translator in context and trigger re-renders when `setLocale` completes. See the `packages/react` adapter for helper hooks that encapsulate this pattern.
