# @polingo/cli

Command line tooling for the Polingo translation workflow.

```
pnpm dlx @polingo/cli@latest extract ./src -o locales/messages.pot
```

## Features

- `polingo extract` scans source files and produces a gettext `.pot` template containing all discovered message IDs (`t`, `tp`, `tn`, `tnp` helpers are recognised).
- `polingo compile` converts `.po` catalogs into runtime artifacts. Emit JSON catalogs (default) or binary `.mo` files ready for `@polingo/node`.
- `polingo validate` lint checks `.po` files for missing translations, empty plural forms, and fuzzy entries when `--strict` is supplied.

The CLI is implemented in TypeScript and ships both programmatic APIs and a binary entry point. See `polingo <command> --help` for the available flags.

## Usage

Extract strings into a template catalog:

```
polingo extract src --out locales/messages.pot
```

Compile localisation files:

```
polingo compile locales --out build/locales --format json
```

Validate catalogs prior to publishing:

```
polingo validate locales --strict
```

## Related packages

- [`@polingo/core`](../core) – translation runtime shared by all adapters.
- [`@polingo/node`](../node) – filesystem loader, middleware, and watcher for Node.js environments.
- [`@polingo/web`](../web) – fetch-based loader with browser-friendly caching.
- [`@polingo/react`](../react) – upcoming React bindings.

## License

MIT © Reinier Hernández Avila
