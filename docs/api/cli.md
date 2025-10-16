---
outline: deep
---

# @polingo/cli

Command-line tooling that automates gettext extraction, compilation, and validation. Install it as a dev dependency so teammates and CI run the same version:

```bash
pnpm add -D @polingo/cli
```

Invoke commands via `pnpm exec polingo <command> [...]`.

## Global Usage

```bash
pnpm exec polingo --help
```

Outputs available commands and flags. `--version` returns the installed package version.

## `polingo extract`

Scan source files, emit a POT template, and optionally sync per-locale `.po` catalogs.

```bash
pnpm exec polingo extract src --locales locales --languages en,es --default-locale en
```

### Options

| Flag                    | Description                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `-o, --out <file>`      | Destination for the generated POT file (default: `locales/messages.pot`).                                 |
| `--cwd <dir>`           | Working directory for resolving relative paths.                                                           |
| `--extensions <ext>`    | Comma-separated extensions to scan (default: `.ts,.tsx,.js,.jsx,.mjs,.cjs,.svelte,.vue,.astro,.md,.mdx`). |
| `--locales <dir>`       | Locale root; keeps `.po` files in sync with the template (default: `locales`).                            |
| `--languages <list>`    | Comma-separated locale codes to ensure exist (otherwise detected from the locale directory).              |
| `--default-locale`      | Locale whose catalog receives source strings automatically (handy for English-first projects).            |
| `--fuzzy`               | Enable fuzzy matching for similar strings (default: enabled).                                             |
| `--no-fuzzy`            | Disable fuzzy matching.                                                                                   |
| `--fuzzy-threshold <n>` | Similarity threshold for fuzzy matching, 0-1 (default: 0.6).                                              |
| `--dry-run`             | Print extracted entries to stdout without touching the filesystem.                                        |
| `--keep-template`       | Retain the generated POT file instead of removing it after syncing locales.                               |
| `--quiet`               | Suppress completion messages (warnings still print).                                                      |
| `-h, --help`            | Show command-specific help.                                                                               |

Extraction defaults to scanning `src`. Provide additional directories or globs as arguments.

#### Fuzzy Matching

By default, the extract command uses fuzzy matching (similar to GNU gettext's `msgmerge`) to intelligently handle changes to translatable strings:

- **Exact matches**: When a string is unchanged, references are updated and any `#, fuzzy` flag is cleared
- **Similar strings**: When source text changes slightly (e.g., "Save" → "Save changes"), the tool:
  - Finds the most similar existing translation using Levenshtein distance
  - Copies the old translation to the new entry
  - Marks it with `#, fuzzy` flag for translator review
  - Uses `--fuzzy-threshold` to control matching sensitivity (0.6 = 60% similar by default)
- **Obsolete entries**: Strings no longer in source code are marked with `#~` for reference

Use `--no-fuzzy` to disable this behavior and get empty entries for all new/changed strings.

## `polingo compile`

Convert `.po` catalogs into runtime artifacts.

```bash
pnpm exec polingo compile locales --out public/locales --format json --pretty
```

### Options

| Flag              | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| `--cwd <dir>`     | Working directory for resolving input paths.                                         |
| `-o, --out <dir>` | Destination directory for compiled catalogs (defaults to alongside each input file). |
| `-f, --format`    | Output format: `json` (default) or `mo`.                                             |
| `--pretty`        | Pretty-print JSON output (trailing newline included).                                |
| `-h, --help`      | Show command-specific help.                                                          |

If you pass a directory, the compiler walks it recursively (skipping `node_modules` and dot directories) and processes every `.po` file it finds.

## `polingo validate`

Check catalogs for missing translations, plural coverage, or fuzzy flags.

```bash
pnpm exec polingo validate locales --strict
```

### Options

| Flag          | Description                                    |
| ------------- | ---------------------------------------------- |
| `--cwd <dir>` | Working directory for resolving input paths.   |
| `--strict`    | Fail entries marked as `fuzzy` (useful in CI). |
| `-h, --help`  | Show command-specific help.                    |

Validate exits with code `1` when issues are found, making it easy to wire into CI pipelines.

## Scripting Tips

- Combine `extract`, `compile`, and `validate` in `package.json` scripts to keep relationships between commands obvious.
- Use `pnpm exec polingo compile ... --format json` inside build steps to produce browser-ready catalogs consumed by `@polingo/web`.
- Pass `--languages` to `extract` when you want to provision new locale folders automatically (for example, in monorepos with multiple apps).
