---
outline: deep
---

# Interactive Playground

Explore Polingo in a live environment and iterate on translations without guessing. The examples below mirror the repository layout so you can adapt them to your own project.

Launch the hosted StackBlitz workspace to try Polingo in the browser: [Open interactive example](https://stackblitz.com/edit/polingo-example?file=README.md).

## Running Repository Examples

The Polingo repository includes working examples you can run locally to see all features in action.

### React + Vite Demo

This example demonstrates the complete React integration with hot-reloading, multiple locales, and all translation features.

**Quick Start:**

```bash
# Clone the repository
git clone https://github.com/ragnarok22/polingo.git
cd polingo

# Install dependencies
pnpm install --frozen-lockfile

# Run the React example
pnpm --filter polingo-react-example dev
```

Visit `http://localhost:5173` to see:

- Language switcher with instant updates
- Basic translations with `t()`
- Plural forms with `tn()`
- Context translations with `tp()`
- Rich text with the `<Trans>` component
- LocalStorage-based caching

**Development Workflow:**

1. Edit `examples/react-vite/locales/es/messages.po` to change Spanish translations
2. Save the file
3. Run `pnpm --filter polingo-react-example compile` to regenerate JSON
4. Vite automatically reloads the page with new translations

**Example Features to Explore:**

- `src/components/BasicTranslation.tsx` - Simple string translation
- `src/components/PluralTranslation.tsx` - Plural handling with counts
- `src/components/ContextTranslation.tsx` - Disambiguating with context
- `src/components/VariableTranslation.tsx` - Interpolation with variables
- `src/components/RichTextTranslation.tsx` - HTML/JSX in translations

### Express Demo

This example shows server-side translation with middleware integration and locale negotiation.

**Quick Start:**

```bash
# From repository root
pnpm install --frozen-lockfile

# Run the Express example
pnpm --filter polingo-express-example dev
```

Visit `http://localhost:3000` to test:

**Available Routes:**

```bash
# Basic translation (detects browser language)
curl http://localhost:3000/

# Force Spanish with query parameter
curl http://localhost:3000/?lang=es

# Force French with Accept-Language header
curl -H "Accept-Language: fr-FR" http://localhost:3000/

# Test plural translations
curl "http://localhost:3000/notifications?count=1&lang=es"
curl "http://localhost:3000/notifications?count=5&lang=fr"

# Test context translations (menu items)
curl http://localhost:3000/menu?lang=es
```

**Development Features:**

- Hot-reload enabled with `watch: true` - edit `.po` files and refresh browser
- Locale detection via query params or Accept-Language header
- Automatic catalog preloading for all supported locales
- Graceful fallback to English when translation missing

---

## CLI Commands Tutorial

The CLI ships with three commands that make translation workflows interactive. Here's a complete workflow from code to deployed translations.

### Complete Workflow Example

```bash
# Step 1: Create a new project (or use existing)
mkdir polingo-tutorial && cd polingo-tutorial
npm init -y
npm install @polingo/core @polingo/node
npm install --save-dev @polingo/cli typescript tsx

# Step 2: Write some translatable code
cat > src/app.ts << 'EOF'
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es', 'fr'],
  directory: './locales',
});

console.log(polingo.t('Hello, world!'));
console.log(polingo.tn('You have {count} message', 'You have {count} messages', 5));
console.log(polingo.tp('menu', 'File'));
EOF

# Step 3: Extract translatable strings
npx polingo extract src --locales locales --languages en,es,fr --default-locale en

# This creates:
# - locales/en/messages.po (with English strings)
# - locales/es/messages.po (empty translations)
# - locales/fr/messages.po (empty translations)

# Step 4: Translate the messages
# Edit locales/es/messages.po manually or with a PO editor like Poedit
cat >> locales/es/messages.po << 'EOF'

msgid "Hello, world!"
msgstr "¡Hola, mundo!"

msgid "You have {count} message"
msgid_plural "You have {count} messages"
msgstr[0] "Tienes {count} mensaje"
msgstr[1] "Tienes {count} mensajes"

msgctxt "menu"
msgid "File"
msgstr "Archivo"
EOF

# Step 5: Validate translations before deployment
npx polingo validate locales
# Output: ✓ All translations are valid

# Check for fuzzy/incomplete translations (strict mode)
npx polingo validate locales --strict
# Output: ✓ All translations are complete

# Step 6: Run the application
npx tsx src/app.ts
# Output (in English):
# Hello, world!
# You have 5 messages
# File

# Run with Spanish
LANG=es npx tsx src/app.ts
# Output (in Spanish):
# ¡Hola, mundo!
# Tienes 5 mensajes
# Archivo
```

### Extract Command Deep Dive

The `extract` command scans your source files for translation calls:

```bash
# Basic usage
polingo extract src --locales locales --languages en,es --default-locale en

# Advanced options
polingo extract src \
  --locales locales \
  --languages en,es,fr,de \
  --default-locale en \
  --keep-template \           # Keep the .pot file for translators
  --domain messages \          # Use custom domain (default: messages)
  --encoding utf-8             # File encoding (default: utf-8)
```

**What it does:**

1. Scans all files in `src/` for `t()`, `tp()`, `tn()`, `tnp()` calls
2. Generates a `.pot` template with all unique strings
3. Updates existing `.po` files or creates new ones for each language
4. Preserves existing translations and marks removed strings as obsolete
5. Copies source strings to default locale (English) automatically

**Supported patterns:**

```ts
t('Simple string');
t('Double quotes work too');
t(`Template literals ${work}`);

tp('context', 'String with context');

tn('Singular', 'Plural', count);
tn('One item', 'Multiple items', n, { name: 'Product' });

tnp('context', 'Singular with context', 'Plural with context', count);
```

### Compile Command Deep Dive

The `compile` command converts `.po` files to runtime formats:

```bash
# Compile to JSON for web (default format)
polingo compile locales --out public/i18n --format json --pretty

# Compile to MO for Node.js (smaller, faster)
polingo compile locales --out dist/i18n --format mo

# Compile specific locale
polingo compile locales/es --out public/i18n/es --format json

# Compile with specific domain
polingo compile locales --out public/i18n --domain messages --format json
```

**Output structure:**

```
public/i18n/
├── en/
│   └── messages.json
├── es/
│   └── messages.json
└── fr/
    └── messages.json
```

**JSON format (human-readable with `--pretty`):**

```json
{
  "charset": "utf-8",
  "headers": {
    "language": "es",
    "plural-forms": "nplurals=2; plural=(n != 1);"
  },
  "translations": {
    "": {
      "Hello, world!": {
        "msgid": "Hello, world!",
        "msgstr": ["¡Hola, mundo!"]
      }
    },
    "menu": {
      "File": {
        "msgid": "File",
        "msgstr": ["Archivo"],
        "msgctxt": "menu"
      }
    }
  }
}
```

### Validate Command Deep Dive

The `validate` command checks for common translation errors:

```bash
# Check for syntax errors and missing translations
polingo validate locales

# Strict mode: fail on fuzzy or incomplete entries
polingo validate locales --strict

# Validate specific locale
polingo validate locales/es
```

**What it checks:**

- ✓ Valid PO file syntax
- ✓ Complete plural forms (no missing msgstr[0], msgstr[1], etc.)
- ✓ Matching placeholders (if source has `{name}`, translation must too)
- ✓ No syntax errors in header metadata
- ✓ Consistent msgctxt usage
- ✗ Fuzzy entries (only in `--strict` mode)
- ✗ Empty translations (only in `--strict` mode)

**Example error output:**

```
❌ locales/es/messages.po
  Line 15: Missing plural form msgstr[1] for "You have {count} item"
  Line 23: Placeholder mismatch - source has {name} but translation has {nombre}
  Line 31: Fuzzy entry detected (run with --strict to fail)

Found 3 issues in 1 file
```

---

## Hot Reload in Node.js

Enable the built-in watcher to see translations update without restarting your server:

```ts
import { createPolingo } from '@polingo/node';

const polingo = await createPolingo({
  locale: 'en',
  locales: ['en', 'es', 'fr'],
  directory: './locales',
  watch: true,
  debug: true,
});

console.log(polingo.t('Welcome!'));
// Edit locales/en/messages.po and save
// The console will show: [Polingo] Reloaded catalog for locale: en
```

**How it works:**

- `watch: true` enables file system watching via `chokidar`
- Watches all `.po` and `.mo` files in the `directory`
- On file change, automatically re-parses and updates the cache
- `debug: true` logs reload events to console
- Works with any Node.js web framework (Express, Fastify, Koa, etc.)

**Combine with nodemon for full hot-reload:**

```json
{
  "scripts": {
    "dev": "nodemon --watch src --watch locales --ext ts,po src/server.ts"
  }
}
```

This setup reloads both code changes and translation updates.

---

## Integration with Build Tools

### Vite Integration

Add compilation to your Vite build pipeline:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

export default defineConfig({
  plugins: [
    {
      name: 'polingo-compile',
      buildStart() {
        console.log('Compiling translations...');
        execSync('polingo compile locales --out public/i18n --format json --pretty');
      },
    },
  ],
});
```

### Webpack Integration

```js
// webpack.config.js
const { execSync } = require('child_process');

module.exports = {
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.beforeCompile.tap('PolingoPlugin', () => {
          execSync('polingo compile locales --out public/i18n --format json');
        });
      },
    },
  ],
};
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/i18n.yml
name: Validate Translations

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm install -g @polingo/cli
      - run: polingo validate locales --strict
      - run: polingo compile locales --out public/i18n --format json
```

---

## Share on Playground Services

Need to demo Polingo outside your local machine? Create a shareable reproduction:

### StackBlitz Setup

```bash
# Create new project from template
npm create vite@latest polingo-playground -- --template react-ts
cd polingo-playground

# Install dependencies
npm install @polingo/react @polingo/web @polingo/core
npm install --save-dev @polingo/cli
```

**Minimal `src/App.tsx` for StackBlitz:**

```tsx
import { PolingoProvider, useTranslation } from '@polingo/react';

function Content() {
  const { t } = useTranslation();
  return <h1>{t('Hello from StackBlitz!')}</h1>;
}

export default function App() {
  return (
    <PolingoProvider locale="en" locales={['en']} loader={{ baseUrl: '/i18n' }}>
      <Content />
    </PolingoProvider>
  );
}
```

Add pre-compiled JSON catalogs to `public/i18n/en/messages.json`:

```json
{
  "charset": "utf-8",
  "headers": {},
  "translations": {
    "": {
      "Hello from StackBlitz!": {
        "msgid": "Hello from StackBlitz!",
        "msgstr": ["Hello from StackBlitz!"]
      }
    }
  }
}
```

Push to GitHub and open in StackBlitz: `https://stackblitz.com/github/yourname/polingo-playground`

### CodeSandbox Setup

1. Fork the official example: [Polingo React Example](https://codesandbox.io/s/polingo-react-example)
2. Edit code and translations directly in the browser
3. Share the URL with collaborators
4. Most features work identically to local development
