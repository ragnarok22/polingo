# Polingo React + Vite Example

This example demonstrates how to use Polingo in a React application with Vite. It showcases all the main features of the `@polingo/react` package including hooks, components, and translation workflows. The project is fully standalone—copy the `react-vite` folder anywhere and install dependencies to try it out.

## Features Demonstrated

- **Basic translations** - Simple `t()` calls
- **Variable interpolation** - Using `{variable}` placeholders
- **Pluralization** - Using `tn()` for plural-aware translations
- **Rich text translations** - Using `<Trans>` component with embedded React elements
- **Context-aware translations** - Using `tp()` to disambiguate homonyms
- **Locale switching** - Dynamic language switching with `setLocale()` and disabled buttons while loading
- **Loading fallback UI** - `loadingFallback` keeps the UI responsive while catalogs load
- **Error handling** - `onError` callback surfaces failures with a friendly message

## Project Structure

```
react-vite/
├── public/
│   └── i18n/              # Compiled JSON catalogs (generated)
│       ├── en/
│       │   └── messages.json
│       ├── es/
│       │   └── messages.json
│       └── fr/
│           └── messages.json
├── locales/               # Source .po files
│   ├── en/
│   │   └── messages.po
│   ├── es/
│   │   └── messages.po
│   └── fr/
│       └── messages.po
├── src/
│   ├── components/
│   │   ├── AppContent.tsx        # Main app content and feature showcase
│   │   ├── BasicTranslation.tsx  # Basic t() example
│   │   ├── VariableTranslation.tsx # Variable interpolation example
│   │   ├── PluralTranslation.tsx  # Plural forms example
│   │   ├── RichTextTranslation.tsx # Trans component example
│   │   ├── ContextTranslation.tsx # Context (tp) example
│   │   ├── LanguageSwitcher.tsx   # Locale switcher component
│   │   └── Features.tsx           # Features list
│   ├── App.tsx            # PolingoProvider setup
│   ├── main.tsx           # React entry point
│   └── styles.css         # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

> Tip: feel free to swap `pnpm` for `npm` or `yarn` if you prefer.

### 2. Compile translations

Compile the `.po` files to JSON format:

```bash
pnpm compile
```

This generates JSON catalogs in `public/i18n/` that the web loader can fetch.

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

- `pnpm dev` - Start the Vite development server
- `pnpm build` - Extract strings, compile translations, type-check, and build for production
- `pnpm preview` - Preview the production build
- `pnpm extract` - Extract translatable strings from source code to `.pot` template
- `pnpm compile` - Compile `.po` files to JSON catalogs
- `pnpm validate` - Validate `.po` files for missing/fuzzy translations

## How It Works

### Provider Setup

The app is wrapped with `PolingoProvider` in `src/App.tsx`:

```tsx
<PolingoProvider
  create={{
    locale: 'en',
    locales: ['en', 'es', 'fr'],
    fallback: 'en',
    cache: true,
    loader: {
      baseUrl: '/i18n',
    },
  }}
  loadingFallback={
    <div className="container">
      <div className="loading">Loading translations...</div>
    </div>
  }
  onError={(error) => {
    console.error('[Polingo] Failed to initialize translator', error);
  }}
>
  <AppContent />
</PolingoProvider>
```

The `create` prop accepts either a configuration object (shown above) or a factory that returns a `Promise<Translator>`. The provider handles:
- Loading catalogs asynchronously
- Rendering a fallback while translations load
- Invoking `onError` if translator creation fails
- Making the translator available to all child components

### Using Translations

Components can access translations via the `useTranslation` hook:

```tsx
const { t, tp, tn, tnp, locale, loading, error, setLocale } = useTranslation();

// Basic translation
t('Welcome to Polingo')

// Translation with variables
t('Hello {name}!', { name: 'Alice' })

// Plural translation
tn('You have {count} new message', 'You have {count} new messages', 3, { count: 3 })

// Translation with context
tp('menu', 'File')

// Switch locale
setLocale('es')

if (loading) {
  // Disable UI while catalogs are loading
}

if (error) {
  // Surface errors reported by the provider
}
```

### Rich Text Translations

The `<Trans>` component allows embedding React elements:

```tsx
<Trans
  message="Read the <0>documentation</0> to learn more"
  components={[<a href="..." />]}
/>
```

The `<0>`, `<1>`, etc. placeholders in the message correspond to components in the array.

## Translation Workflow

### 1. Write code using translation functions

```tsx
function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('My translatable text')}</h1>;
}
```

### 2. Extract translatable strings

```bash
pnpm extract
```

This scans your source code and generates/updates `locales/messages.pot` with all translatable strings.

### 3. Update .po files for each locale

Edit each locale's `.po` file to add translations:

```po
# locales/es/messages.po
msgid "My translatable text"
msgstr "Mi texto traducible"
```

You can use tools like [Poedit](https://poedit.net/) or [Weblate](https://weblate.org/) to edit `.po` files.

### 4. Compile to JSON

```bash
pnpm compile
```

This converts `.po` files to JSON catalogs in `public/i18n/` that the browser can fetch.

### 5. Validate (optional)

```bash
pnpm validate
```

Check for missing or fuzzy translations before deploying.

## Key Components Explained

### LanguageSwitcher

Displays accessible buttons for each available language. Buttons disable while catalogs reload, and clicking one calls `setLocale()` to switch locales.

### BasicTranslation

Demonstrates the most basic usage of `t()` for simple string translation.

### VariableTranslation

Shows how to use variable interpolation with `{varName}` placeholders. Includes an interactive input to change the variable value.

### PluralTranslation

Demonstrates `tn()` for plural-aware translations. Includes a counter to see how the plural form changes based on count.

### RichTextTranslation

Shows the `<Trans>` component for embedding React elements like links, bold text, and italics inside translations.

### ContextTranslation

Demonstrates `tp()` for context-aware translations. Shows how the same English string "File" can have different translations based on context (menu vs document).

### Features

A simple list that demonstrates batch translation of multiple strings.

## Customization

### Adding More Locales

1. Create a new `.po` file in `locales/{locale}/messages.po`
2. Copy the template from `locales/en/messages.po`
3. Translate the strings
4. Add the locale to the `locales` array in `src/App.tsx`
5. Add the locale button to `LanguageSwitcher.tsx`
6. Run `pnpm compile` to generate the JSON catalog
7. Optionally add the locale to `pnpm extract` and `pnpm compile` scripts

### Using Custom Loader Paths

You can customize where catalogs are loaded from:

```tsx
<PolingoProvider
  create={{
    locale: 'en',
    locales: ['en', 'es', 'fr'],
    loader: {
      buildUrl: (locale, domain) =>
        `https://cdn.example.com/translations/${locale}/${domain}.json`,
      requestInit: {
        credentials: 'include',
      },
    },
  }}
>
  <AppContent />
</PolingoProvider>
```

### Enabling Cache

Enable localStorage caching to avoid re-fetching catalogs:

```tsx
<PolingoProvider
  create={{
    locale: 'en',
    locales: ['en', 'es', 'fr'],
    loader: { baseUrl: '/i18n' },
    cache: true,
    cacheOptions: {
      prefix: 'my-app',
      ttlMs: 86_400_000, // 24 hours
    },
  }}
>
  <AppContent />
</PolingoProvider>
```

### Customizing the Loading Fallback

Provide any React node to `loadingFallback` to control what renders while catalogs load (where `config` is the same object you pass to `create`):

```tsx
<PolingoProvider create={config} loadingFallback={<FullScreenSpinner />}>
  <AppContent />
</PolingoProvider>
```

## Production Build

Build the app for production:

```bash
pnpm build
```

This will:
1. Compile `.po` files to JSON
2. Bundle the app with Vite

The output will be in the `dist/` directory.

Preview the production build:

```bash
pnpm preview
```

## Troubleshooting

### Translations not loading

- Make sure you ran `pnpm compile` to generate JSON catalogs
- Check that `public/i18n/{locale}/messages.json` files exist
- Check the browser console for network errors
- Verify the `baseUrl` in your provider config (`create.loader.baseUrl`) matches your public directory structure

### "Cannot read property 't' of undefined"

- Make sure your component is wrapped in `<PolingoProvider>`
- Check that the provider's `create` function is returning a valid translator

### New strings not being extracted

- Make sure you're using the correct function names: `t`, `tp`, `tn`, `tnp`, or `<Trans>`
- Check that the CLI is scanning the correct directories (see `pnpm extract` script)
- String literals must be static - the CLI cannot extract dynamic strings

## Learn More

- [Polingo Documentation](https://github.com/ragnarok22/polingo)
- [@polingo/react README](../../packages/react/README.md)
- [@polingo/web README](../../packages/web/README.md)
- [@polingo/cli README](../../packages/cli/README.md)
- [GNU gettext .po format](https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html)

## License

MIT © Reinier Hernández Avila
