# Polingo React + Vite Example

This example demonstrates how to use Polingo in a React application with Vite. It showcases all the main features of the `@polingo/react` package including hooks, components, and translation workflows.

## Features Demonstrated

- **Basic translations** - Simple `t()` calls
- **Variable interpolation** - Using `{variable}` placeholders
- **Pluralization** - Using `tn()` for plural-aware translations
- **Rich text translations** - Using `<Trans>` component with embedded React elements
- **Context-aware translations** - Using `tp()` to disambiguate homonyms
- **Locale switching** - Dynamic language switching with `setLocale()`
- **Loading states** - Proper handling of async catalog loading
- **Error handling** - Graceful error display

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
│   │   ├── AppContent.tsx        # Main app content with routing
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

From the monorepo root:

```bash
pnpm install --frozen-lockfile
```

Or from this directory:

```bash
cd examples/react-vite
pnpm install
```

### 2. Build the Polingo packages

You need to build the packages first:

```bash
# From monorepo root
pnpm build

# Or individually
pnpm --filter @polingo/core build
pnpm --filter @polingo/web build
pnpm --filter @polingo/react build
pnpm --filter @polingo/cli build
```

### 3. Compile translations

Compile the `.po` files to JSON format:

```bash
cd examples/react-vite
pnpm compile
```

This generates JSON catalogs in `public/i18n/` that the web loader can fetch.

### 4. Run the development server

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
  create={() =>
    createPolingo({
      locale: 'en',
      locales: ['en', 'es', 'fr'],
      loader: {
        baseUrl: '/i18n',
      },
    })
  }
>
  <AppContent />
</PolingoProvider>
```

The `create` prop is a factory function that returns a `Promise<Translator>`. The provider handles:
- Loading catalogs asynchronously
- Providing loading/error states
- Making the translator available to all child components

### Using Translations

Components can access translations via the `useTranslation` hook:

```tsx
const { t, tp, tn, tnp, locale, setLocale } = useTranslation();

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

A simple component that shows buttons for each available language. Clicking a button calls `setLocale()` to switch the current language.

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
createPolingo({
  locale: 'en',
  locales: ['en', 'es', 'fr'],
  loader: {
    buildUrl: (locale, domain) =>
      `https://cdn.example.com/translations/${locale}/${domain}.json`,
    requestInit: {
      credentials: 'include',
    },
  },
})
```

### Enabling Cache

Enable localStorage caching to avoid re-fetching catalogs:

```tsx
createPolingo({
  locale: 'en',
  locales: ['en', 'es', 'fr'],
  loader: { baseUrl: '/i18n' },
  cache: true,
  cacheOptions: {
    prefix: 'my-app',
    ttlMs: 86_400_000, // 24 hours
  },
})
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
- Verify the `baseUrl` in `createPolingo()` matches your public directory structure

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
