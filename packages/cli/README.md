# @polingo/cli

Command line tooling for the Polingo translation workflow.

The `@polingo/cli` package provides command-line tools to extract translatable strings from source code, compile `.po` files to runtime formats, and validate translation catalogs.

## Installation

```bash
npm install -D @polingo/cli
# or
pnpm add -D @polingo/cli
# or
yarn add -D @polingo/cli
```

Or use directly with `npx`/`pnpm dlx`:

```bash
pnpm dlx @polingo/cli@latest extract ./src -o locales/messages.pot
```

## Features

- **Extract**: Scans source files for translatable strings and generates `.pot` template files
  - Recognizes `t()`, `tp()`, `tn()`, `tnp()` function calls
  - Detects `<Trans>` component usage in React/JSX files
  - Preserves context and plural forms
- **Compile**: Converts `.po` files to runtime-ready formats
  - JSON format for `@polingo/web` (browser usage)
  - Binary `.mo` format for `@polingo/node` (server usage)
- **Validate**: Lints `.po` files for quality issues
  - Detects missing translations
  - Identifies fuzzy entries (partially translated)
  - Checks for empty plural forms
  - Strict mode for CI/CD pipelines

## Commands

### Extract

Scan source code and extract translatable strings to a `.pot` template file.

```bash
polingo extract <source> [options]
```

**Arguments:**

- `<source>` - Path to source directory or file to scan

**Options:**

- `-o, --out <path>` - Output path for the `.pot` template file (default: `locales/messages.pot`)
- `-e, --extensions <exts>` - File extensions to scan, comma-separated (default: `.ts,.tsx,.js,.jsx`)

**Examples:**

```bash
# Extract from src directory to default location
polingo extract src

# Extract to custom output path
polingo extract src -o translations/template.pot

# Extract from multiple extensions
polingo extract src -e .ts,.tsx,.vue

# Extract from specific file
polingo extract src/components/App.tsx -o locales/messages.pot
```

**What gets extracted:**

```typescript
// Basic translations
t('Hello World')                              // → msgid "Hello World"
t('Hello {name}', { name: 'Alice' })          // → msgid "Hello {name}"

// Context-aware translations
tp('menu', 'File')                            // → msgctxt "menu", msgid "File"

// Plural translations
tn('{n} item', '{n} items', count)            // → msgid "{n} item", msgid_plural "{n} items"

// Context + plural
tnp('cart', '{n} item', '{n} items', count)   // → msgctxt "cart", msgid "{n} item", msgid_plural "{n} items"

// React Trans component
<Trans message="Click <0>here</0>" />         // → msgid "Click <0>here</0>"
```

### Compile

Convert `.po` translation files to runtime formats (JSON or binary `.mo`).

```bash
polingo compile <source> [options]
```

**Arguments:**

- `<source>` - Path to directory containing locale folders with `.po` files

**Options:**

- `-o, --out <path>` - Output directory for compiled catalogs (default: `dist/locales`)
- `-f, --format <format>` - Output format: `json` or `mo` (default: `json`)

**Examples:**

```bash
# Compile to JSON (for @polingo/web)
polingo compile locales -o public/i18n --format json

# Compile to .mo files (for @polingo/node)
polingo compile locales -o dist/locales --format mo

# Compile with default settings
polingo compile locales
```

**Expected directory structure:**

```
locales/
├── en/
│   └── messages.po
├── es/
│   └── messages.po
└── fr/
    └── messages.po
```

**Output structure (JSON):**

```
public/i18n/
├── en/
│   └── messages.json
├── es/
│   └── messages.json
└── fr/
    └── messages.json
```

### Validate

Lint and validate `.po` translation files for completeness and quality.

```bash
polingo validate <source> [options]
```

**Arguments:**

- `<source>` - Path to directory containing locale folders with `.po` files

**Options:**

- `--strict` - Fail validation if any issues are found (useful for CI/CD)

**Examples:**

```bash
# Basic validation with warnings
polingo validate locales

# Strict validation (exit code 1 if issues found)
polingo validate locales --strict

# Validate specific locale
polingo validate locales/es
```

**What gets validated:**

- Missing translations (empty `msgstr`)
- Fuzzy entries (marked with `#, fuzzy` comment)
- Invalid plural forms
- Malformed `.po` file syntax

## Workflow Integration

### NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "i18n:extract": "polingo extract src -o locales/messages.pot",
    "i18n:compile": "polingo compile locales -o public/i18n --format json",
    "i18n:validate": "polingo validate locales --strict",
    "prebuild": "npm run i18n:extract && npm run i18n:compile && npm run i18n:validate",
    "build": "vite build"
  }
}
```

### Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Validate Translations
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm polingo validate locales --strict
```

## Programmatic API

You can also use the CLI programmatically:

```typescript
import { extract, compile, validate } from '@polingo/cli';

// Extract strings
await extract({
  source: './src',
  out: './locales/messages.pot',
  extensions: ['.ts', '.tsx'],
});

// Compile catalogs
await compile({
  source: './locales',
  out: './public/i18n',
  format: 'json',
});

// Validate catalogs
const result = await validate({
  source: './locales',
  strict: true,
});

if (!result.valid) {
  console.error('Validation failed:', result.errors);
  process.exit(1);
}
```

## Related packages

- [`@polingo/core`](../core) – translation runtime shared by all adapters.
- [`@polingo/node`](../node) – filesystem loader, middleware, and watcher for Node.js environments.
- [`@polingo/web`](../web) – fetch-based loader with browser-friendly caching.
- [`@polingo/react`](../react) – React hooks, context provider, and Trans component.

## License

MIT © Reinier Hernández Avila
