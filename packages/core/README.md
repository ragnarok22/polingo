# @polingo/core

> Core translation engine for Polingo - Pure JavaScript, environment-agnostic

The core package of Polingo provides the translation logic without any I/O operations. It works in any JavaScript environment (Node.js, browsers, React Native, etc.).

## Installation

```bash
npm install @polingo/core
# or
pnpm add @polingo/core
# or
yarn add @polingo/core
```

## Features

- 🎯 **Environment-agnostic** - Works everywhere JavaScript runs
- 🚀 **Zero dependencies** - No external packages required
- ⚡ **Fast** - Synchronous API after initial load
- 💪 **TypeScript** - Fully typed with excellent IntelliSense
- 🌐 **Standard gettext** - Compatible with .po/.mo workflows
- 🔢 **Pluralization** - Support for complex plural rules
- 🎨 **Contexts** - Disambiguation with translation contexts
- 🔄 **Interpolation** - Modern `{variable}` syntax
- 💾 **Caching** - Built-in memory cache with TTL support

## Quick Start

```typescript
import { createTranslator, MemoryCache } from '@polingo/core';

// You need to provide a loader (use @polingo/node or @polingo/web)
const loader = {
  async load(locale: string, domain: string) {
    // Your logic to load translation catalogs
    return catalog;
  },
};

// Create translator instance
const t = createTranslator(loader, new MemoryCache(), {
  locale: 'es',
  fallback: 'en',
  domain: 'messages',
  debug: false,
});

// Load catalogs (async, do this once at startup)
await t.load(['es', 'en']);

// Use translations (sync, call millions of times)
t.t('Hello, World!'); // "¡Hola, Mundo!"
t.t('Welcome, {name}!', { name: 'Juan' }); // "¡Bienvenido, Juan!"
t.tn('{n} item', '{n} items', 5, { n: 5 }); // "5 artículos"
t.tp('menu', 'File'); // "Archivo" (with context)
```

## API Reference

### `createTranslator(loader, cache, config)`

Creates a new translator instance.

**Parameters:**

- `loader` (`TranslationLoader`) - Loader implementation for your environment
- `cache` (`TranslationCache`) - Cache implementation (use `MemoryCache`, `TtlCache`, or `NoCache`)
- `config` (`PolingoConfig`) - Configuration object

**Returns:** `Translator` instance

**Example:**

```typescript
const translator = createTranslator(loader, new MemoryCache(), {
  locale: 'es',
  fallback: 'en',
  domain: 'messages',
  debug: true,
});
```

### Configuration Options

```typescript
interface PolingoConfig {
  locale: string; // Current locale (e.g., 'es', 'en-US')
  fallback?: string; // Fallback locale (default: 'en')
  domain?: string; // Translation domain (default: 'messages')
  debug?: boolean; // Enable debug logs (default: false)
}
```

### Translator Methods

#### `async load(locales: string | string[]): Promise<void>`

Loads translation catalogs. Must be called before using translations.

```typescript
await translator.load('es'); // Load single locale
await translator.load(['es', 'en', 'fr']); // Load multiple locales
```

#### `async setLocale(locale: string): Promise<void>`

Changes the current locale and loads it if not already loaded.

```typescript
await translator.setLocale('fr');
```

#### `getLocale(): string`

Returns the current locale.

```typescript
const currentLocale = translator.getLocale(); // "es"
```

#### `hasLocale(locale: string): boolean`

Checks if a locale is loaded.

```typescript
if (translator.hasLocale('fr')) {
  // French translations are available
}
```

#### `t(msgid: string, vars?: Record<string, any>): string`

Translates a simple string with optional variable interpolation.

```typescript
t('Hello'); // "Hola"
t('Hello, {name}!', { name: 'Juan' }); // "Hola, Juan!"
t('You have {count} points', { count: 100 }); // "Tienes 100 puntos"
```

#### `tp(context: string, msgid: string, vars?: Record<string, any>): string`

Translates with context for disambiguation.

```typescript
tp('verb', 'Open'); // "Abrir" (action)
tp('adjective', 'Open'); // "Abierto" (state)
```

#### `tn(msgid: string, msgidPlural: string, count: number, vars?: Record<string, any>): string`

Translates with plural forms.

```typescript
tn('{n} item', '{n} items', 1, { n: 1 }); // "1 artículo"
tn('{n} item', '{n} items', 5, { n: 5 }); // "5 artículos"
```

#### `tnp(context: string, msgid: string, msgidPlural: string, count: number, vars?: Record<string, any>): string`

Translates with both context and plural forms.

```typescript
tnp('cart', '{n} item', '{n} items', 3, { n: 3 }); // "3 artículos" (in cart context)
```

#### `clearCache(): void`

Clears all cached translations.

```typescript
translator.clearCache();
```

## Cache Implementations

### MemoryCache

Simple in-memory cache using JavaScript Map.

```typescript
import { MemoryCache } from '@polingo/core';

const cache = new MemoryCache(50); // max 50 catalogs
```

### TtlCache

Cache with time-to-live expiration.

```typescript
import { TtlCache } from '@polingo/core';

const cache = new TtlCache(3600000); // 1 hour TTL
cache.prune(); // Remove expired entries
```

### NoCache

No caching (useful for testing).

```typescript
import { NoCache } from '@polingo/core';

const cache = new NoCache();
```

### Custom Cache

Implement the `TranslationCache` interface:

```typescript
import type { TranslationCache, TranslationCatalog } from '@polingo/core';

class RedisCache implements TranslationCache {
  get(key: string): TranslationCatalog | undefined {
    // Your implementation
  }

  set(key: string, catalog: TranslationCatalog): void {
    // Your implementation
  }

  has(key: string): boolean {
    // Your implementation
  }

  clear(): void {
    // Your implementation
  }
}
```

## Translation Catalog Format

The core expects translation catalogs in this format:

```typescript
interface TranslationCatalog {
  charset: string;
  headers: Record<string, string>;
  translations: {
    [context: string]: {
      [msgid: string]: {
        msgid: string;
        msgstr: string | string[];
        msgctxt?: string;
        msgid_plural?: string;
      };
    };
  };
}
```

**Example catalog:**

```typescript
{
  charset: 'utf-8',
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Plural-Forms': 'nplurals=2; plural=(n != 1);'
  },
  translations: {
    '': {  // default context
      'Hello': {
        msgid: 'Hello',
        msgstr: 'Hola'
      },
      '{n} item': {
        msgid: '{n} item',
        msgid_plural: '{n} items',
        msgstr: ['{n} artículo', '{n} artículos']
      }
    },
    'menu': {  // menu context
      'File': {
        msgid: 'File',
        msgstr: 'Archivo',
        msgctxt: 'menu'
      }
    }
  }
}
```

## Interpolation

Polingo uses modern `{variable}` syntax for interpolation:

```typescript
t('Hello, {name}!', { name: 'Juan' });
// "Hola, Juan!"

t('You have {count} messages and {unread} unread', {
  count: 10,
  unread: 3,
});
// "Tienes 10 mensajes y 3 sin leer"
```

**Variables are:**

- Case-sensitive: `{name}` ≠ `{Name}`
- Alphanumeric: `{user_name}`, `{count123}`
- Automatically converted to strings

## Pluralization

Polingo supports complex plural rules for different languages:

### Supported Languages

- **English, Spanish, French, Italian, Portuguese**: 2 forms (singular, plural)
- **Polish**: 3 forms (one, few, many)
- **Russian, Ukrainian, Serbian**: 3 forms (one, few, many)
- **Chinese, Japanese, Korean**: 1 form (no plural)
- **Arabic**: 6 forms (zero, one, two, few, many, other)

### Example with Polish (3 forms)

```po
msgid "{n} file"
msgid_plural "{n} files"
msgstr[0] "{n} plik"      # 1 file
msgstr[1] "{n} pliki"     # 2-4 files
msgstr[2] "{n} plików"    # 5+ files
```

```typescript
tn('{n} file', '{n} files', 1, { n: 1 }); // "1 plik"
tn('{n} file', '{n} files', 3, { n: 3 }); // "3 pliki"
tn('{n} file', '{n} files', 5, { n: 5 }); // "5 plików"
```

## Context Disambiguation

Use contexts when the same word has different translations:

```po
# Without context - ambiguous
msgid "Open"
msgstr "???"

# With context - clear
msgctxt "verb"
msgid "Open"
msgstr "Abrir"

msgctxt "adjective"
msgid "Open"
msgstr "Abierto"
```

```typescript
tp('verb', 'Open'); // "Abrir"
tp('adjective', 'Open'); // "Abierto"
```

## Fallback Behavior

When a translation is not found:

1. Look in current locale
2. If not found and context specified, try without context
3. Look in fallback locale
4. Return original `msgid`
5. Log warning if `debug: true`

```typescript
const t = createTranslator(loader, cache, {
  locale: 'fr',
  fallback: 'en',
  debug: true,
});

// If "Bonjour" not found in French:
t('Bonjour'); // Tries fr → en → returns "Bonjour" + warning
```

## Debug Mode

Enable debug mode to see missing translations:

```typescript
const t = createTranslator(loader, cache, {
  locale: 'es',
  debug: true, // Enable debug logs
});

t('MissingKey');
// Console: [polingo] Missing translation: "MissingKey" [es]
```

## Performance

- **Initial load**: ~50ms for 10 locales
- **Translation (cached)**: ~0.01ms
- **Translation (uncached)**: ~0.1ms
- **Bundle size**: ~2KB gzipped

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import type {
  Translator,
  TranslationLoader,
  TranslationCache,
  TranslationCatalog,
  PolingoConfig,
} from '@polingo/core';
```

## Best Practices

### 1. Load catalogs at startup

```typescript
// ✅ Good - load once at startup
await translator.load(['es', 'en', 'fr']);

// ❌ Bad - loading on every request
app.get('/', async (req, res) => {
  await translator.load('es'); // Don't do this!
});
```

### 2. Use contexts for disambiguation

```typescript
// ✅ Good - clear context
tp('navigation', 'Home');
tp('baseball', 'Home');

// ❌ Bad - ambiguous
t('Home');
```

### 3. Always include variables in translations

```po
# ✅ Good - flexible
msgid "Welcome, {name}!"
msgstr "¡Bienvenido, {name}!"

# ❌ Bad - hardcoded
msgid "Welcome, User!"
msgstr "¡Bienvenido, Usuario!"
```

### 4. Use proper plural forms

```typescript
// ✅ Good - handles all cases
tn('{n} item', '{n} items', count, { n: count });

// ❌ Bad - wrong for many languages
t(count === 1 ? 'item' : 'items');
```

## Integration with Loaders

This package requires a loader. Available loaders:

- **[@polingo/node](../node)** - For Node.js and Electron
- **[@polingo/web](../web)** - For browsers
- **Custom** - Implement `TranslationLoader` interface

**Example with Node.js:**

```typescript
import { createTranslator, MemoryCache } from '@polingo/core';
import { NodeLoader } from '@polingo/node';

const translator = createTranslator(new NodeLoader('./locales'), new MemoryCache(), {
  locale: 'es',
});
```

## Contributing

See the main [Polingo repository](https://github.com/your-username/polingo) for contribution guidelines.

## License

MIT © [Reinier Hernández]

## Related Packages

- [@polingo/node](../node) - Node.js adapter
- [@polingo/web](../web) - Browser adapter
- [@polingo/react](../react) - React hooks and components
- [@polingo/cli](../cli) - CLI tools for extraction and compilation
