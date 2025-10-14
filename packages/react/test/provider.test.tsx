// @vitest-environment jsdom

import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, expect, it } from 'vitest';
import type { TranslationCatalog, TranslationLoader } from '@polingo/core';
import { NoCache, Translator } from '@polingo/core';
import { PolingoProvider, Trans, useTranslation } from '../src';

beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

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
  { msgid: 'You have {n} unread message', plural: 'You have {n} unread messages', translation: ['You have {n} unread message', 'You have {n} unread messages'] },
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
    switch (locale) {
      case 'en':
        return JSON.parse(JSON.stringify(EN_CATALOG)) as TranslationCatalog;
      case 'es':
        return JSON.parse(JSON.stringify(ES_CATALOG)) as TranslationCatalog;
      default:
        throw new Error(`Unsupported locale ${locale}`);
    }
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

describe('PolingoProvider', () => {
  it('exposes translation helpers to descendant hooks', async () => {
    const translator = await createTestTranslator('en');

    function Greeting() {
      const { t } = useTranslation();
      return <span>{t('Hello {name}', { name: 'Alice' })}</span>;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <Greeting />
        </PolingoProvider>
      );
    });

    expect(container.textContent).toBe('Hello Alice');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('updates translations when locale changes', async () => {
    const translator = await createTestTranslator('en');
    let capturedSetLocale: ((locale: string) => Promise<void>) | undefined;

    function LocaleSwitcher() {
      const { tn, locale, loading, setLocale } = useTranslation();

      useEffect(() => {
        capturedSetLocale = setLocale;
      }, [setLocale]);

      return (
        <div data-locale={locale} data-loading={loading ? 'yes' : 'no'}>
          {tn('You have {n} unread message', 'You have {n} unread messages', 2)}
        </div>
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <LocaleSwitcher />
        </PolingoProvider>
      );
    });

    expect(typeof capturedSetLocale).toBe('function');
    expect(container.textContent).toBe('You have 2 unread messages');

    await act(async () => {
      await capturedSetLocale?.('es');
    });

    expect(container.textContent).toBe('Tienes 2 mensajes sin leer');
    expect(container.firstElementChild?.getAttribute('data-locale')).toBe('es');
    expect(container.firstElementChild?.getAttribute('data-loading')).toBe('no');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

describe('<Trans />', () => {
  it('renders translated rich text with component placeholders', async () => {
    const translator = await createTestTranslator('es');

    function LinkCopy() {
      return <Trans message="Click <0>here</0>" components={[<a href="/docs" />]} />;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <LinkCopy />
        </PolingoProvider>
      );
    });

    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent).toBe('aquí');
    expect(anchor?.getAttribute('href')).toBe('/docs');
    expect(container.textContent).toBe('Haz clic aquí');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
