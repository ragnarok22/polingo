# Integration Tests for @polingo/node

This directory contains end-to-end integration tests that test the full functionality of Polingo with real `.po` files and no mocking.

## Test Files

### end-to-end.test.ts

Comprehensive tests for the complete translation flow:

- Basic translation (`t()`) with simple strings
- Variable interpolation with `{variable}` syntax
- Pluralization (`tn()`) with different counts
- Context-aware translations (`tp()`, `tnp()`)
- Dynamic locale switching with `setLocale()`
- Fallback behavior when translations are missing
- Cache enabled and disabled modes
- Multiple locale support (English, Spanish, French)
- Error handling for invalid locales and missing directories
- Plural rules validation for different locales (Spanish: n != 1, French: n > 1)

**Tests:** 12

### middleware.test.ts

Integration tests for Express/Fastify middleware with real translator instances:

- Shared translator mode (single instance, switches locale per request)
- Per-locale mode (separate translator instance per locale with caching)
- Accept-Language header parsing with quality values
- Custom locale extraction strategies (query params, headers, cookies)
- Fallback to default locale for unsupported languages
- Translation features in middleware context (basic, context, plurals, interpolation)
- Error scenarios (missing directories, invalid locales)
- Sequential request handling in shared mode
- Concurrent request handling in per-locale mode

**Tests:** 14

## Test Fixtures

Located in `fixtures/locales/`:

```
fixtures/locales/
├── en/
│   └── messages.po
├── es/
│   └── messages.po
└── fr/
    └── messages.po
```

Each `.po` file contains:

- Simple translations (Hello, Goodbye, Welcome)
- Variable interpolation examples (`{name}`, `{count}`)
- Plural forms (messages with `msgid_plural`)
- Context-aware translations (`msgctxt "menu"`, `msgctxt "verb"`)

## Running Integration Tests

```bash
# Run all integration tests
pnpm test test/integration

# Run specific test file
pnpm test test/integration/end-to-end.test.ts
pnpm test test/integration/middleware.test.ts

# Run with coverage
pnpm test:coverage
```

## Key Differences from Unit Tests

- **No mocking**: Uses real `NodeLoader`, `Translator`, and file system operations
- **Real .po files**: Tests against actual gettext files with proper syntax
- **Full integration**: Tests the complete flow from file loading to translation output
- **Realistic scenarios**: Tests real-world use cases like locale switching and middleware
- **File system**: Creates and uses actual fixture files on disk

## Test Coverage

The integration tests cover:

- ✅ Basic translation methods (t, tp, tn, tnp)
- ✅ Locale switching and fallback behavior
- ✅ Cache mechanisms (MemoryCache and NoCache)
- ✅ Middleware integration (shared and per-locale modes)
- ✅ Error handling and edge cases
- ✅ Plural form rules for multiple languages
- ✅ Variable interpolation
- ✅ Context-aware translations

## Notes

- Tests use isolated fixture directories to avoid conflicts
- All tests clean up after themselves
- Tests are designed to run in any order (no inter-test dependencies)
- Middleware tests use type-safe mock request/response objects
- Integration tests complement unit tests by verifying end-to-end functionality
