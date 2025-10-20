# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polingo is a modern internationalization (i18n) library for JavaScript/TypeScript that uses industry-standard `.po` and `.mo` files. It's organized as a pnpm monorepo with multiple packages targeting different environments.

**Key Architecture:**
- Environment-agnostic core (`@polingo/core`) - contains the Translator class, cache system, interpolator, and plural rules
- Platform adapters (`@polingo/node`, `@polingo/web`) - implement TranslationLoader interface for different environments
- Framework integrations (`@polingo/react`, `@polingo/vue`) - React hooks/Vue composables and context providers
- CLI tooling (`@polingo/cli`) - workflow commands for extracting, compiling, and validating translations
- Scaffolding (`create-polingo-app`) - project initialization tool with templates

## Development Commands

### Setup
```bash
# Install dependencies (always use frozen lockfile)
pnpm install --frozen-lockfile
# OR use Makefile
make install
```

### Building
```bash
# Build all packages
pnpm build
# OR
make build

# Watch mode for development
pnpm dev
```

### Testing
```bash
# Run all tests
pnpm test
# OR
make test

# Run tests with coverage
pnpm test:coverage  # for individual package
# OR
make coverage       # for all packages

# Watch mode
pnpm test:watch
```

### Linting and Type Checking
```bash
# Run linter
pnpm lint
# OR
make lint

# Fix lint issues
pnpm lint:fix

# Type checking
pnpm typecheck

# Format checking
pnpm format:check

# Format all files
pnpm format
```

### Running Individual Package Tests
```bash
# Navigate to package directory or use pnpm filter
cd packages/core && pnpm test
# OR from root
pnpm --filter @polingo/core test
```

### CLI Development
```bash
# The CLI binary is at packages/cli/dist/cli.js after build
# Build CLI first
pnpm --filter @polingo/cli build

# Extract messages from source code
node packages/cli/dist/cli.js extract src/ --out locales/messages.pot --locales locales

# Compile .po files to runtime format
node packages/cli/dist/cli.js compile locales/ --format json --out dist/i18n

# Validate translation catalogs
node packages/cli/dist/cli.js validate locales
node packages/cli/dist/cli.js validate locales --strict  # fails on fuzzy entries
```

## Architecture Details

### Core Translation Flow
1. **Loader** (implements `TranslationLoader` interface) loads `.po` or `.mo` files from disk/network
2. **Parser** converts `.po`/`.mo` to `TranslationCatalog` format (common structure across all platforms)
3. **Cache** (implements `TranslationCache` interface) stores parsed catalogs to avoid re-parsing
4. **Translator** orchestrates loading, caching, and provides translation methods (`t`, `tp`, `tn`, `tnp`)
5. **Interpolator** handles variable substitution using `{variable}` syntax
6. **Plurals** determines correct plural form index based on locale-specific rules

### TranslationCatalog Format
All loaders convert to this common format (defined in `packages/core/src/types.ts`):
```typescript
{
  charset: string;
  headers: Record<string, string>;
  translations: {
    [context: string]: {          // "" for no context
      [msgid: string]: {
        msgid: string;
        msgstr: string | string[];  // string for basic, array for plurals
        msgctxt?: string;
        msgid_plural?: string;
      }
    }
  }
}
```

### Package Responsibilities

**@polingo/core** (`packages/core/src/`):
- `translator.ts` - Main Translator class with sync translation methods after async catalog loading
- `loader.ts` - TranslationLoader interface definition
- `cache.ts` - Three cache implementations: MemoryCache (default with optional LRU), TtlCache (time-based expiration), and NoCache (for testing)
- `interpolator.ts` - Variable interpolation for `{name}` style placeholders
- `plurals.ts` - Plural form logic per locale (based on Unicode CLDR rules)
- `types.ts` - Core TypeScript interfaces
- Zero external dependencies

**@polingo/node** (`packages/node/src/`):
- `loader.ts` - NodeLoader that reads `.po`/`.mo` files from filesystem
- `parser.ts` - Parses .po/.mo files using gettext-parser
- `watcher.ts` - Optional file watching for hot-reload in development
- `middleware.ts` - Express/Fastify middleware with locale detection
- `create.ts` - Factory function `createPolingo()` that wires up loader + cache + translator

**@polingo/web** (`packages/web/src/`):
- `loader.ts` - WebLoader that fetches catalogs via HTTP (default: from `/assets/i18n`)
- `cache.ts` - LocalStorageCache that persists parsed catalogs across page reloads
  - Supports `cacheKey` option for cache invalidation when translations change
  - Recommended to disable cache in development: `cache: import.meta.env.PROD`
- `create.ts` - Factory function `createPolingo()` for browser environments

**@polingo/cli** (`packages/cli/src/`):
- `extract` - Scans source files for `t()`, `tp()`, `tn()`, `tnp()` calls and generates `.pot` template
- `compile` - Converts `.po` files to `.json` or `.mo` runtime format
- `validate` - Lints `.po` files for missing/fuzzy translations
- Self-contained with no dependency on @polingo/core (extraction logic is independent)

**@polingo/react** (`packages/react/src/`):
- `context.ts` - PolingoContext using React Context API
- `hooks.ts` - Four hooks: `usePolingo()` (full access), `useTranslation()` (translation methods), `useLocale()` (locale management), `useTranslator()` (raw instance)
- Manages loading/error states during initialization

**@polingo/vue** (`packages/vue/src/`):
- Vue 3 composables using Provide/Inject pattern
- Similar API to React integration but with Vue composition functions

### Translation Method Naming
- `t(msgid, vars?)` - Basic translation
- `tp(context, msgid, vars?)` - Translation with context (disambiguates homonyms)
- `tn(msgid, msgidPlural, count, vars?)` - Pluralization (automatically adds `count` as `n` variable)
- `tnp(context, msgid, msgidPlural, count, vars?)` - Context + pluralization

### Locale Fallback Logic
The Translator searches:
1. Current locale catalog first
2. Falls back to `fallback` locale (default: 'en') if translation not found
3. Returns original `msgid` if no translation exists

### Middleware Behavior
- `perLocale: false` (default) - Shares single Translator instance, calls `setLocale()` per request
- `perLocale: true` - Creates separate Translator instance per locale (better for concurrent requests)
- Locale detection: checks `?locale=` query param first, then parses `Accept-Language` header

### Expected Directory Structure
```
locales/
├── es/
│   └── messages.po
├── en/
│   └── messages.po
└── fr/
    └── messages.po
```

### Important Implementation Details
- Catalogs are loaded **asynchronously** at startup via `translator.load(locales)`
- All translation methods (`t`, `tp`, `tn`, `tnp`) are **synchronous** after loading
- NodeLoader prefers `.po` files when both `.po` and `.mo` exist
- Plural forms use locale-specific CLDR rules from `plurals.ts` (packages/core/src/plurals.ts:1)
  - Most languages use 2 forms (n != 1): English, Spanish, German, Italian, French, Portuguese, Dutch
  - Some use 3 forms: Russian, Polish, Romanian, Czech
  - Some have no pluralization: Chinese, Japanese, Korean, Thai, Vietnamese
- Cache keys follow format: `{locale}:{domain}` (e.g., `es:messages`)
- When using middleware with `perLocale: false`, be aware of potential race conditions in high-concurrency scenarios
- Interpolation preserves undefined variables as-is (e.g., `{missing}` stays `{missing}` if variable not provided)

## Common Workflows

### Adding a new translation method
1. Add method signature to Translator class in `packages/core/src/translator.ts`
2. Update TypeScript types in `packages/core/src/types.ts` if needed
3. Add corresponding extraction pattern (regex) to CLI in `packages/cli/src/index.ts` (look for `extractFromContent` function)
4. Write tests in `packages/core/test/translator.test.ts` or appropriate package
5. Update integration packages (`@polingo/react`, `@polingo/vue`) to expose the new method via hooks/composables

### Adding support for a new environment
1. Create new package in `packages/` directory (e.g., `@polingo/deno`)
2. Implement `TranslationLoader` interface from `@polingo/core`
3. Optionally implement `TranslationCache` interface if environment has specific storage needs
4. Provide environment-specific catalog loading logic
5. Export factory function similar to `createPolingo` in `@polingo/node`
6. Add tests using mock fixtures (see `packages/core/test/` for patterns)

### Testing translation catalogs
The CLI provides validation:
```bash
pnpm --filter @polingo/cli build
node packages/cli/dist/cli.js validate locales
node packages/cli/dist/cli.js validate locales --strict  # fails on fuzzy flags
```

### Managing cache in browser applications

The `@polingo/web` package uses `LocalStorageCache` by default to persist translations across page reloads. This improves performance but can cause issues during development when translations are updated frequently.

**Best practice for development:**
```tsx
// In your React/Vue app entry point (e.g., main.tsx)
<PolingoProvider create={{
  locale: 'en',
  locales: ['en', 'es'],
  loader: { baseUrl: '/i18n' },
  // Disable cache in dev, enable in production
  cache: import.meta.env.PROD,
}}>
  <App />
</PolingoProvider>
```

**Alternative: Cache versioning/invalidation**
If you need caching in development but want to invalidate it when translations change:
```tsx
<PolingoProvider create={{
  locale: 'en',
  locales: ['en', 'es'],
  loader: { baseUrl: '/i18n' },
  cacheOptions: {
    // Change this value whenever you update translations
    cacheKey: '2024-10-20-v1',
    // Or use your app version from environment variables:
    // cacheKey: import.meta.env.VITE_APP_VERSION,
  },
}}>
  <App />
</PolingoProvider>
```

**Manual cache clearing during development:**
If cache is enabled and translations aren't updating, clear localStorage:
```javascript
// In browser console:
localStorage.clear();
// Or clear only Polingo cache:
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('polingo:')) {
    localStorage.removeItem(key);
  }
});
```

## Build System
- Uses `tsup` for building packages (see individual `package.json` files)
- Outputs both ESM (`.js`) and CJS (`.cjs`) formats with TypeScript declarations
- Vitest 3.2.4 for testing with coverage via v8 provider
- ESLint 9.37 with flat config format (`eslint.config.js`)
- TypeScript compilation uses shared `tsconfig.json` (target: ES2020, strict mode enabled)
- All packages use ES modules (`"type": "module"` in package.json)

## Testing Patterns
- **Mock fixtures**: Use JSON fixtures for translation catalogs (see `packages/core/test/`)
- **Mock loader**: Implement simple `TranslationLoader` with hardcoded catalogs for unit tests
- **Test utilities**: Core tests demonstrate patterns that other packages follow
- **Coverage**: Run `make coverage` to generate v8 coverage reports for all packages

## Requirements
- Node.js >= 18.0.0
- pnpm >= 8.0.0 (developed with pnpm 10.x)
- Uses ES modules (`"type": "module"` in package.json)
