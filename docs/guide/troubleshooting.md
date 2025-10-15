---
outline: deep
---

# Troubleshooting

Use the checklist below when translations do not behave as expected.

## Catalog changes are not picked up

- Ensure `watch: true` is set when calling `createPolingo`.
- Confirm paths line up with the configured `directory` and `domain`. For example, `directory: './locales'` expects `./locales/es/messages.po`.
- Binary `.mo` catalogs take precedence over `.po`. Delete stale `.mo` files if you only updated the `.po` version.

## Lookups return the msgid

- Verify the locale was loaded with `translator.hasLocale(locale)`; if not, call `await translator.load([locale])`.
- Check that the catalog contains the exact msgid (gettext comparisons are case sensitive).
- If you use interpolated strings, ensure placeholders match exactly—`{name}` is different from `{Name}`.

## Locale detection is wrong in middleware

- Override `localeExtractor` to mirror how your app stores locales (cookies, headers, route params).
- Log the incoming locale when `debug: true` is enabled to see what the middleware receives.
- When dealing with region-specific locales (`es-ES`), normalize them before comparing against your supported list.

## Compiled JSON is empty

- Run `pnpm exec polingo compile ... --format json --pretty` to inspect the output.
- Confirm the `.po` file has translated entries—untranslated keys are skipped by default.
- If you rely on contexts (`msgctxt`), ensure your call uses the matching helper (`tp`, `tnp`).

## CLI commands fail on CI

- Run `pnpm --filter @polingo/cli build` before invoking `pnpm exec polingo` when using a bare workspace checkout.
- Use the `--cwd` flag to point the CLI at the directory that contains your catalogs when running inside containers.
- Make sure the checkout preserves executable bits (`git config core.filemode false`) so the `polingo` binary remains runnable.
