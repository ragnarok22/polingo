/// <reference lib="dom" />
// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import type { TranslationCatalog, TranslationLoader } from '@polingo/core';
import { NoCache, Translator } from '@polingo/core';
import {
  PolingoProvider,
  useLocale,
  usePolingo,
  useTranslation,
  useTranslator,
  type PolingoContextValue,
} from '../src';

const HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'plural-forms': 'nplurals=2; plural=(n != 1);',
};

function suppressVueWarnings(run: () => void): void {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    run();
  } finally {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  }
}

function buildCatalog(msgid: string, translation: string): TranslationCatalog {
  return {
    charset: 'utf-8',
    headers: HEADERS,
    translations: {
      '': {
        [msgid]: {
          msgid,
          msgstr: translation,
        },
      },
    },
  };
}

const EN_CATALOG = buildCatalog('Hello', 'Hello');

const loader: TranslationLoader = {
  load(locale, domain) {
    if (domain !== 'messages') {
      return Promise.reject(new Error(`Unknown domain ${domain}`));
    }
    if (locale === 'en') {
      return Promise.resolve(JSON.parse(JSON.stringify(EN_CATALOG)) as TranslationCatalog);
    }
    return Promise.reject(new Error(`Unsupported locale ${locale}`));
  },
};

async function createTestTranslator(locale: string): Promise<Translator> {
  const translator = new Translator(loader, new NoCache(), {
    locale,
    fallback: 'en',
    domain: 'messages',
  });
  await translator.load(['en']);
  return translator;
}

describe('usePolingo', () => {
  it('throws when used outside provider', () => {
    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        usePolingo();
        return () => null;
      },
    });

    const container = document.createElement('div');

    suppressVueWarnings(() => {
      expect(() => {
        const app = createApp(Caller);
        app.mount(container);
      }).toThrowError('usePolingo must be used within a <PolingoProvider>.');
    });

    container.remove();
  });

  it('returns context value inside provider', async () => {
    const translator = await createTestTranslator('en');
    let context: PolingoContextValue | null = null;

    const Collector = defineComponent({
      name: 'Collector',
      setup() {
        context = usePolingo();
        return () => null;
      },
    });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            PolingoProvider,
            { translator },
            {
              default: () => [h(Collector)],
            }
          );
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(Root);
    app.mount(container);

    await nextTick();

    expect(context).not.toBeNull();
    const resolvedContext = context!;
    expect(resolvedContext.translator.value).toBe(translator);
    expect(resolvedContext.locale.value).toBe('en');
    expect(resolvedContext.loading.value).toBe(false);

    app.unmount();
    container.remove();
  });
});

describe('useTranslator', () => {
  it('throws when translator unavailable', () => {
    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        useTranslator();
        return () => null;
      },
    });

    const container = document.createElement('div');

    suppressVueWarnings(() => {
      expect(() => {
        const app = createApp(Caller);
        app.mount(container);
      }).toThrowError('usePolingo must be used within a <PolingoProvider>.');
    });

    container.remove();
  });

  it('throws while translator is loading', async () => {
    const message = ref('');

    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        try {
          useTranslator();
        } catch (error) {
          message.value = (error as Error).message;
        }
        return () => null;
      },
    });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            PolingoProvider,
            {
              create: async () => {
                await new Promise((resolve) => setTimeout(resolve, 20));
                return createTestTranslator('en');
              },
            },
            {
              default: () => [h(Caller)],
            }
          );
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(Root);
    app.mount(container);

    await nextTick();
    expect(message.value).toContain('Translator is loading');

    app.unmount();
    container.remove();
  });

  it('returns translator once ready', async () => {
    const translator = await createTestTranslator('en');
    let captured: Translator | null = null;

    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        captured = useTranslator();
        return () => null;
      },
    });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            PolingoProvider,
            { translator },
            {
              default: () => [h(Caller)],
            }
          );
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(Root);
    app.mount(container);

    await nextTick();
    expect(captured).toBe(translator);

    app.unmount();
    container.remove();
  });
});

describe('useTranslation', () => {
  it('exposes helpers', async () => {
    const translator = await createTestTranslator('en');
    let result: ReturnType<typeof useTranslation> | null = null;

    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        result = useTranslation();
        return () => null;
      },
    });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            PolingoProvider,
            { translator },
            {
              default: () => [h(Caller)],
            }
          );
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(Root);
    app.mount(container);

    await nextTick();

    expect(result).not.toBeNull();
    const resolved = result!;

    expect(resolved.locale.value).toBe('en');
    expect(resolved.loading.value).toBe(false);
    expect(typeof resolved.t).toBe('function');
    expect(resolved.t('Hello')).toBe('Hello');

    app.unmount();
    container.remove();
  });
});

describe('useLocale', () => {
  it('returns locale controls', async () => {
    const translator = await createTestTranslator('en');
    let localeAccessor: {
      locale: ReturnType<typeof useLocale>['locale'];
      loading: ReturnType<typeof useLocale>['loading'];
      setLocale: ReturnType<typeof useLocale>['setLocale'];
    } | null = null;

    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        localeAccessor = useLocale();
        return () => null;
      },
    });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            PolingoProvider,
            { translator },
            {
              default: () => [h(Caller)],
            }
          );
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(Root);
    app.mount(container);

    await nextTick();

    expect(localeAccessor).not.toBeNull();
    const resolved = localeAccessor!;

    expect(resolved.locale.value).toBe('en');
    expect(resolved.loading.value).toBe(false);
    expect(typeof resolved.setLocale).toBe('function');

    app.unmount();
    container.remove();
  });
});
