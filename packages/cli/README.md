# @polingo/cli

> Command line tooling for the Polingo translation workflow. _(Work in progress)_

This package will eventually house the official CLI used to extract messages, validate catalogs, and compile runtime assets for all Polingo adapters. The implementation is still in early development; until a stable release ships, consider the contents experimental.

## Planned capabilities

- Scan source files and extract gettext-ready message IDs.
- Validate `.po` catalogs for missing translations, plural mismatches, and formatting issues.
- Compile `.po` files into `.mo` or JSON catalogs consumable by `@polingo/node` and `@polingo/web`.
- Provide project scaffolding utilities for new Polingo installations.

## Current status

- `package.json` placeholder published for internal testing.
- No distributable commands are bundled yet; invoking the binary will do nothing.
- API contract and configuration format are still being finalised.

## Contributing

Interested in helping design or implement the CLI? Please open an issue in the main repository describing your use case. We are particularly interested in feedback around:

- Framework-specific extraction patterns (React, Vue, Svelte, server templates, etc.).
- Integration with existing gettext pipelines.
- Desired output formats (JSON, `.mo`, custom bundles).

## Related packages

- [`@polingo/core`](../core) – translation runtime shared by all adapters.
- [`@polingo/node`](../node) – filesystem loader, middleware, and watcher for Node.js environments.
- [`@polingo/web`](../web) – fetch-based loader with browser-friendly caching.
- [`@polingo/react`](../react) – upcoming React bindings.

## License

MIT © Reinier Hernández Avila
