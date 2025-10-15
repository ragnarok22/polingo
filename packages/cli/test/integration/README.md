# Integration Tests for @polingo/cli

This directory contains end-to-end integration tests for the Polingo CLI commands that test the complete workflow with real files and filesystem operations.

## Test Files

### cli-workflow.test.ts

Comprehensive tests for the complete CLI workflow:

**Extract Command Tests:**

- Extracting translations from TypeScript/JSX source files
- Finding `t()`, `tp()`, `tn()`, `tnp()` calls
- Generating `.pot` (template) files
- Handling nested directory structures
- Deduplicating identical translations
- Extracting context strings (`msgctxt`)
- Extracting plural forms (`msgid_plural`)
- Handling special characters in translations

**Compile Command Tests:**

- Compiling `.po` files to `.json` format
- Compiling `.po` files to `.mo` (binary) format
- Processing multiple locales
- Handling compilation errors gracefully
- Verifying output file structure and content

**Validate Command Tests:**

- Validating correct `.po` files
- Detecting missing translations (empty `msgstr`)
- Detecting fuzzy translations
- Strict mode validation (fails on warnings)
- Processing multiple locale directories

**Complete Workflow Tests:**

- End-to-end: extract → compile → validate
- Multi-locale workflow handling
- Integration between all CLI commands

**Edge Cases:**

- Empty source directories
- Missing locales directories
- Special characters in translations
- Quote and apostrophe handling
- Newline characters in strings

## Test Fixtures

Tests create temporary fixtures in `fixtures/cli-test/`:

```
fixtures/cli-test/
├── src/              # Source files with translation calls
│   ├── app.ts
│   ├── components.tsx
│   └── features/
└── locales/          # Generated translation files
    ├── messages.pot  # Template file
    ├── es/
    │   ├── messages.po
    │   └── messages.json
    └── fr/
        ├── messages.po
        └── messages.mo
```

## Running Integration Tests

```bash
# Build CLI first (required)
pnpm build

# Run CLI integration tests
pnpm test test/integration

# Run specific test file
pnpm test test/integration/cli-workflow.test.ts
```

## CLI Command Usage

The tests verify these CLI commands work correctly:

```bash
# Extract translations from source code
node dist/cli.js extract src --output locales/messages.pot

# Compile .po files to JSON
node dist/cli.js compile locales --format json

# Compile .po files to MO (binary)
node dist/cli.js compile locales --format mo

# Validate translation files
node dist/cli.js validate locales

# Validate in strict mode (fail on fuzzy/missing)
node dist/cli.js validate locales --strict
```

## Key Features Tested

- ✅ Source code parsing for translation strings
- ✅ .pot template generation
- ✅ .po file compilation to multiple formats
- ✅ Translation validation and linting
- ✅ Multi-locale support
- ✅ Error handling and reporting
- ✅ Special character handling
- ✅ Complete workflow integration

## Notes

- Tests require the CLI to be built (`pnpm build`) before running
- Each test creates and cleans up its own temporary directory
- Tests use `execSync` to run the actual CLI commands
- All tests are isolated and can run in any order
- Tests verify both command output and generated file contents
- Integration tests complement unit tests by verifying real CLI execution

## Test Coverage

The integration tests cover the complete CLI workflow from extraction to validation, ensuring that:

- Translation strings are correctly extracted from source code
- Files are properly compiled to different formats
- Validation catches common translation issues
- Multiple locales are handled correctly
- Error conditions are handled gracefully
