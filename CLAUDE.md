# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polingo is a modern internationalization (i18n) library for JavaScript/TypeScript that uses industry-standard `.po` and `.mo` files. It's organized as a pnpm monorepo with multiple packages targeting different environments.

**Key Architecture:**
- Environment-agnostic core (`@polingo/core`) - contains the Translator class, cache system, interpolator, and plural rules
- Platform adapters (`@polingo/node`, `@polingo/web`) - implement TranslationLoader interface for different environments
- Framework integrations (`@polingo/react`) - React hooks and context providers
- CLI tooling (`@polingo/cli`) - workflow commands for extracting, compiling, and validating translations

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
node packages/cli/dist/cli.js extract
node packages/cli/dist/cli.js compile
node packages/cli/dist/cli.js validate
```

## Architecture Details

### Core Translation Flow
1. **Loader** (implements `TranslationLoader` interface) loads `.po` or `.mo` files from disk/network
2. **Cache** (implements `TranslationCache` interface) stores parsed catalogs to avoid re-parsing
3. **Translator** orchestrates loading, caching, and provides translation methods (`t`, `tp`, `tn`, `tnp`)
4. **Interpolator** handles variable substitution using `{variable}` syntax
5. **Plurals** determines correct plural form index based on locale-specific rules

### Package Responsibilities

**@polingo/core** (`packages/core/src/`):
- `translator.ts` - Main Translator class with sync translation methods after async catalog loading
- `loader.ts` - TranslationLoader interface definition
- `cache.ts` - In-memory cache implementation
- `interpolator.ts` - Variable interpolation for `{name}` style placeholders
- `plurals.ts` - Plural form logic per locale (based on Unicode CLDR rules)
- `types.ts` - Core TypeScript interfaces

**@polingo/node** (`packages/node/src/`):
- `loader.ts` - NodeLoader that reads `.po`/`.mo` files from filesystem
- `parser.ts` - Parses .po/.mo files using gettext-parser
- `watcher.ts` - Optional file watching for hot-reload in development
- `middleware.ts` - Express/Fastify middleware with locale detection
- `create.ts` - Factory function `createPolingo()` that wires up loader + cache + translator

**@polingo/web** (`packages/web/src/`):
- Implements fetch-based loader with localStorage caching for browsers

**@polingo/cli** (`packages/cli/src/`):
- `extract` - Scans source files for `t()`, `tp()`, `tn()`, `tnp()` calls and generates `.pot` template
- `compile` - Converts `.po` files to `.json` or `.mo` runtime format
- `validate` - Lints `.po` files for missing/fuzzy translations

### Translation Method Naming
- `t(msgid, vars?)` - Basic translation
- `tp(context, msgid, vars?)` - Translation with context (disambiguates homonyms)
- `tn(msgid, msgidPlural, count, vars?)` - Pluralization
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
- Plural forms use locale-specific rules from `plurals.ts` (`packages/core/src/plurals.ts:1`)
- Cache keys follow format: `{locale}:{domain}` (e.g., `es:messages`)
- When using middleware with `perLocale: false`, be aware of potential race conditions in high-concurrency scenarios

## Common Workflows

### Adding a new translation method
1. Add method signature to Translator class in `packages/core/src/translator.ts`
2. Update TypeScript types in `packages/core/src/types.ts` if needed
3. Add corresponding extraction pattern to CLI in `packages/cli/src/index.ts` (around `extractFromContent` function)
4. Write tests in `packages/core/test/` or appropriate package

### Adding support for a new environment
1. Create new package in `packages/` directory
2. Implement `TranslationLoader` interface from `@polingo/core`
3. Provide environment-specific catalog loading logic
4. Export factory function similar to `createPolingo` in `@polingo/node`

### Testing translation catalogs
The CLI provides validation:
```bash
pnpm --filter @polingo/cli build
node packages/cli/dist/cli.js validate locales
node packages/cli/dist/cli.js validate locales --strict  # fails on fuzzy flags
```

## Build System
- Uses `tsup` for building packages (see individual `package.json` files)
- Outputs both ESM (`.js`) and CJS (`.cjs`) formats
- Vitest for testing with coverage via v8 provider
- ESLint flat config format (`eslint.config.js`)
- TypeScript compilation uses shared `tsconfig.json`

## Requirements
- Node.js >= 18.0.0
- pnpm >= 8.0.0 (developed with pnpm 10.x)
- Uses ES modules (`"type": "module"` in package.json)
