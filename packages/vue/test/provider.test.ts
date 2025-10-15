// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, type VNodeChild } from 'vue';
import type { TranslationCatalog, TranslationLoader } from '@polingo/core';
import { NoCache, Translator } from '@polingo/core';
import { PolingoProvider, Trans, useTranslation, type PolingoProviderProps } from '../src';

const HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'plural-forms': 'nplurals=2; plural=(n != 1);',
};

type CatalogEntry =
  | {
      msgid: string;
      translation: string;
      context?: string;
    }
  | {
      msgid: string;
      translation: [string, string];
      plural: string;
      context?: string;
    };

function buildCatalog(entries: CatalogEntry[]): TranslationCatalog {
  const translations: TranslationCatalog['translations'] = {};

  for (const entry of entries) {
    const contextKey = entry.context ?? '';
    if (!translations[contextKey]) {
      translations[contextKey] = {};
    }

    if (Array.isArray(entry.translation)) {
      translations[contextKey][entry.msgid] = {
        msgid: entry.msgid,
        msgid_plural: entry.plural,
        msgstr: entry.translation,
      };
    } else {
      translations[contextKey][entry.msgid] = {
        msgid: entry.msgid,
        msgstr: entry.translation,
      };
    }
  }

  return {
    charset: 'utf-8',
    headers: HEADERS,
    translations,
  };
}

const EN_CATALOG = buildCatalog([
  { msgid: 'Hello {name}', translation: 'Hello {name}' },
  {
    msgid: 'You have {n} unread message',
    plural: 'You have {n} unread messages',
    translation: ['You have {n} unread message', 'You have {n} unread messages'],
  },
  { msgid: 'Click <0>here</0>', translation: 'Click <0>here</0>' },
]);

const ES_CATALOG = buildCatalog([
  { msgid: 'Hello {name}', translation: 'Hola {name}' },
  {
    msgid: 'You have {n} unread message',
    plural: 'You have {n} unread messages',
    translation: ['Tienes {n} mensaje sin leer', 'Tienes {n} mensajes sin leer'],
  },
  { msgid: 'Click <0>here</0>', translation: 'Haz clic <0>aquí</0>' },
]);

const loader: TranslationLoader = {
  async load(locale, domain) {
    if (domain !== 'messages') {
      throw new Error(`Unknown domain ${domain}`);
    }
    if (locale === 'en') {
      return JSON.parse(JSON.stringify(EN_CATALOG)) as TranslationCatalog;
    }
    if (locale === 'es') {
      return JSON.parse(JSON.stringify(ES_CATALOG)) as TranslationCatalog;
    }
    throw new Error(`Unsupported locale ${locale}`);
  },
};

async function createTestTranslator(locale: string): Promise<Translator> {
  const translator = new Translator(loader, new NoCache(), {
    locale,
    fallback: 'en',
    domain: 'messages',
  });
  await translator.load(['en', 'es']);
  return translator;
}

async function wait(ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function mountWithProvider(
  props: Partial<PolingoProviderProps>,
  slotFactory: () => VNodeChild | VNodeChild[] = () => []
): { container: HTMLElement; unmount: () => void } {
  const Root = defineComponent({
    name: 'RootWrapper',
    setup() {
      return () =>
        h(PolingoProvider, props as PolingoProviderProps, {
          default: () => {
            const rendered = slotFactory();
            return Array.isArray(rendered) ? rendered : [rendered];
          },
        });
    },
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(Root);
  app.mount(container);

  return {
    container,
    unmount() {
      app.unmount();
      container.remove();
    },
  };
}

describe('PolingoProvider', () => {
  it('provides translation helpers to descendants', async () => {
    const translator = await createTestTranslator('en');

    const Greeting = defineComponent({
      name: 'Greeting',
      setup() {
        const { t } = useTranslation();
        return () => h('span', t('Hello {name}', { name: 'Alice' }));
      },
    });

    const mounted = mountWithProvider({ translator }, () => h(Greeting));

    await nextTick();
    expect(mounted.container.textContent).toBe('Hello Alice');
    mounted.unmount();
  });

  it('shows loading fallback while translator initializes', async () => {
    const mounted = mountWithProvider(
      {
        create: async () => {
          await wait(30);
          return await createTestTranslator('en');
        },
        loadingFallback: h('div', 'Loading translations...'),
      },
      () => h('div', 'Content ready')
    );

    await nextTick();
    expect(mounted.container.textContent).toBe('Loading translations...');

    await wait(60);
    await nextTick();

    expect(mounted.container.textContent).toBe('Content ready');
    mounted.unmount();
  });

  it('invokes onError when creation fails', async () => {
    let captured: unknown = null;

    const Status = defineComponent({
      name: 'Status',
      setup() {
        const { error } = useTranslation();
        return () => h('div', error.value ? 'Error occurred' : 'OK');
      },
    });

    const mounted = mountWithProvider(
      {
        create: async () => {
          throw new Error('Failed to create translator');
        },
        onError(error) {
          captured = error;
        },
      },
      () => h(Status)
    );

    await wait(10);
    await nextTick();

    expect(captured).toBeInstanceOf(Error);
    expect(mounted.container.textContent).toBe('Error occurred');
    mounted.unmount();
  });

  it('updates translations after locale change', async () => {
    const translator = await createTestTranslator('en');
    let capturedSetLocale: ((locale: string) => Promise<void>) | undefined;

    const MessageList = defineComponent({
      name: 'MessageList',
      setup() {
        const { tn, locale, loading, setLocale } = useTranslation();
        capturedSetLocale = setLocale;
        return () =>
          h(
            'div',
            {
              'data-locale': locale.value,
              'data-loading': loading.value ? 'yes' : 'no',
            },
            tn('You have {n} unread message', 'You have {n} unread messages', 2)
          );
      },
    });

    const mounted = mountWithProvider({ translator }, () => h(MessageList));

    await nextTick();
    expect(mounted.container.textContent).toBe('You have 2 unread messages');

    await capturedSetLocale?.('es');
    await nextTick();

    expect(mounted.container.textContent).toBe('Tienes 2 mensajes sin leer');
    const element = mounted.container.querySelector('div[data-locale]');
    expect(element?.getAttribute('data-locale')).toBe('es');
    expect(element?.getAttribute('data-loading')).toBe('no');

    mounted.unmount();
  });

  it('throws when setLocale called before translator ready', async () => {
    const thrown = ref('');

    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        const { setLocale } = useTranslation();
        setLocale('es').catch((error) => {
          thrown.value = (error as Error).message;
        });
        return () => h('div', 'Pending');
      },
    });

    const mounted = mountWithProvider(
      {
        create: async () => {
          await wait(40);
          return await createTestTranslator('en');
        },
      },
      () => h(Caller)
    );

    await wait(10);
    await nextTick();

    expect(thrown.value).toContain('Translator is not ready yet');

    mounted.unmount();
  });

  it('propagates errors when setLocale fails', async () => {
    const translator = await createTestTranslator('en');
    let onErrorCalled = false;
    let thrown: unknown = null;

    const Caller = defineComponent({
      name: 'Caller',
      setup() {
        const { setLocale } = useTranslation();
        setLocale('unsupported').catch((error) => {
          thrown = error;
        });
        return () => h('div', 'Caller');
      },
    });

    const mounted = mountWithProvider(
      {
        translator,
        onError() {
          onErrorCalled = true;
        },
      },
      () => h(Caller)
    );

    await nextTick();
    await wait(0);

    expect(onErrorCalled).toBe(true);
    expect(thrown).toBeInstanceOf(Error);
    mounted.unmount();
  });
});

describe('<Trans />', () => {
  it('renders translated rich text with components', async () => {
    const translator = await createTestTranslator('es');

    let capturedTranslation = '';

    const Debug = defineComponent({
      name: 'DebugTranslation',
      setup() {
        const { t } = useTranslation();
        capturedTranslation = t('Click <0>here</0>');
        return () => null;
      },
    });

    const Copy = defineComponent({
      name: 'Copy',
      setup() {
        return () =>
          h(Trans, {
            message: 'Click <0>here</0>',
            components: [h('a', { href: '/docs' })],
          });
      },
    });

    const mounted = mountWithProvider({ translator }, () => [h(Debug), h(Copy)]);

    await nextTick();

    expect(capturedTranslation).toBe('Haz clic <0>aquí</0>');

    const markup = mounted.container.innerHTML;
    expect(markup).toContain('Haz clic');
    expect(markup).toContain('<a');
    expect(markup).toContain('aquí');

    const anchor = mounted.container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent).toBe('aquí');
    expect(anchor?.getAttribute('href')).toBe('/docs');

    mounted.unmount();
  });

  it('supports plural translations', async () => {
    const translator = await createTestTranslator('es');

    const Copy = defineComponent({
      name: 'Copy',
      props: {
        count: {
          type: Number,
          required: true,
        },
      },
      setup(props) {
        return () =>
          h(Trans, {
            message: 'You have {n} unread message',
            plural: 'You have {n} unread messages',
            count: props.count,
          });
      },
    });

    const mounted = mountWithProvider({ translator }, () => [
      h(Copy, { count: 1 }),
      h(Copy, { count: 5 }),
    ]);

    await nextTick();

    const texts = mounted.container.textContent ?? '';
    expect(texts).toContain('Tienes 1 mensaje sin leer');
    expect(texts).toContain('Tienes 5 mensajes sin leer');
    mounted.unmount();
  });

  it('falls back to default message when translator unavailable', async () => {
    const mounted = mountWithProvider(
      {
        create: async () => {
          await wait(100);
          return await createTestTranslator('en');
        },
      },
      () =>
        h(Trans, {
          message: 'Loading...',
          fallback: 'Please wait',
        })
    );

    await nextTick();
    expect(mounted.container.textContent).toBe('Loading...');

    mounted.unmount();
  });

  it('handles component renderer functions', async () => {
    const translator = await createTestTranslator('en');

    const mounted = mountWithProvider({ translator }, () =>
      h(Trans, {
        message: 'Click <0>here</0>',
        components: [
          (children) =>
            h('button', { type: 'button' }, Array.isArray(children) ? children : [children]),
        ],
      })
    );

    await nextTick();

    const button = mounted.container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('here');

    mounted.unmount();
  });
});
