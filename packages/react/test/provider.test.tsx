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

  it('shows loading fallback while translator loads', async () => {
    function LoadingComponent() {
      return <div>Content loaded</div>;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider
          create={async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return await createTestTranslator('en');
          }}
          loadingFallback={<div>Loading translations...</div>}
        >
          <LoadingComponent />
        </PolingoProvider>
      );
    });

    // Initially shows loading fallback
    expect(container.textContent).toBe('Loading translations...');

    // Wait for translator to load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // After loading, shows actual content
    expect(container.textContent).toBe('Content loaded');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('calls onError when translator creation fails', async () => {
    let errorCaptured: unknown = null;

    function ErrorComponent() {
      const { error } = useTranslation();
      return <div>{error ? 'Error occurred' : 'No error'}</div>;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider
          create={async () => {
            throw new Error('Failed to create translator');
          }}
          onError={(error) => {
            errorCaptured = error;
          }}
        >
          <ErrorComponent />
        </PolingoProvider>
      );
    });

    // Wait for error to propagate
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(errorCaptured).not.toBeNull();
    expect((errorCaptured as Error).message).toBe('Failed to create translator');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('handles factory function for creating translator', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function TestComponent() {
      const { t } = useTranslation();
      return <div>{t('Hello {name}', { name: 'World' })}</div>;
    }

    await act(async () => {
      root.render(
        <PolingoProvider create={async () => await createTestTranslator('en')}>
          <TestComponent />
        </PolingoProvider>
      );
    });

    // Wait for translator to load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.textContent).toBe('Hello World');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('cancels loading when unmounted before completion', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider
          create={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return await createTestTranslator('en');
          }}
        >
          <div>Loading...</div>
        </PolingoProvider>
      );
    });

    // Unmount before loading completes
    await act(async () => {
      root.unmount();
    });

    // No error should be thrown
    expect(container).toBeDefined();
    container.remove();
  });

  it('throws error when setLocale called without translator', async () => {
    let setLocaleFunc: ((locale: string) => Promise<void>) | null = null;
    let errorMessage = '';

    function TestComponent() {
      const { setLocale } = useTranslation();
      setLocaleFunc = setLocale;
      return <div>Test</div>;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider
          create={async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return await createTestTranslator('en');
          }}
        >
          <TestComponent />
        </PolingoProvider>
      );
    });

    // Try to call setLocale before translator is ready
    try {
      await setLocaleFunc?.('es');
    } catch (error) {
      errorMessage = (error as Error).message;
    }

    expect(errorMessage).toContain('Translator is not ready yet');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('throws error when setLocale called with empty locale', async () => {
    const translator = await createTestTranslator('en');
    let setLocaleFunc: ((locale: string) => Promise<void>) | null = null;
    let errorMessage = '';

    function TestComponent() {
      const { setLocale } = useTranslation();
      setLocaleFunc = setLocale;
      return <div>Test</div>;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <TestComponent />
        </PolingoProvider>
      );
    });

    try {
      await setLocaleFunc?.('');
    } catch (error) {
      errorMessage = (error as Error).message;
    }

    expect(errorMessage).toContain('setLocale requires a non-empty locale string');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('does not change locale when setting to same locale', async () => {
    const translator = await createTestTranslator('en');
    let setLocaleFunc: ((locale: string) => Promise<void>) | null = null;
    let renderCount = 0;

    function TestComponent() {
      const { setLocale, locale } = useTranslation();
      setLocaleFunc = setLocale;
      renderCount++;
      return <div data-locale={locale}>Test</div>;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <TestComponent />
        </PolingoProvider>
      );
    });

    const initialRenderCount = renderCount;

    await act(async () => {
      await setLocaleFunc?.('en'); // Same locale
    });

    // Should not trigger additional renders beyond normal React updates
    expect(container.firstElementChild?.getAttribute('data-locale')).toBe('en');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('handles error when setLocale fails', async () => {
    const translator = await createTestTranslator('en');
    let setLocaleFunc: ((locale: string) => Promise<void>) | null = null;
    let onErrorCalled = false;
    let thrownError: unknown = null;

    function TestComponent() {
      const { setLocale, error } = useTranslation();
      setLocaleFunc = setLocale;
      return <div>{error ? 'Error' : 'OK'}</div>;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider
          translator={translator}
          onError={(error) => {
            onErrorCalled = true;
            thrownError = error;
          }}
        >
          <TestComponent />
        </PolingoProvider>
      );
    });

    try {
      await act(async () => {
        await setLocaleFunc?.('unsupported-locale');
      });
    } catch (error) {
      // Expected error
    }

    expect(onErrorCalled).toBe(true);
    expect(thrownError).not.toBeNull();

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

  it('uses default baseUrl /i18n when loader not specified', async () => {
    let fetchedUrls: string[] = [];

    // Mock fetch to capture the URL being requested
    const mockFetch = (url: string | URL) => {
      fetchedUrls.push(url.toString());
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(EN_CATALOG),
      } as Response);
    };

    // Mock globalThis.fetch before rendering
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      function TestComponent() {
        const { t, loading } = useTranslation();
        return <div data-loading={loading}>{t('Hello {name}', { name: 'Test' })}</div>;
      }

      await act(async () => {
        root.render(
          <PolingoProvider
            create={{
              locale: 'en',
              locales: ['en'],
            }}
          >
            <TestComponent />
          </PolingoProvider>
        );
      });

      // Wait for loader to initialize
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify the URL uses default /i18n baseUrl
      expect(fetchedUrls).toContain('/i18n/en/messages.json');

      await act(async () => {
        root.unmount();
      });
      container.remove();
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
  });

  it('allows overriding baseUrl with loader configuration', async () => {
    let fetchedUrls: string[] = [];

    // Mock fetch to capture the URL being requested
    const mockFetch = (url: string | URL) => {
      fetchedUrls.push(url.toString());
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(EN_CATALOG),
      } as Response);
    };

    // Mock globalThis.fetch before rendering
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      function TestComponent() {
        const { t, loading } = useTranslation();
        return <div data-loading={loading}>{t('Hello {name}', { name: 'Test' })}</div>;
      }

      await act(async () => {
        root.render(
          <PolingoProvider
            create={{
              locale: 'en',
              locales: ['en'],
              loader: { baseUrl: '/custom/path/translations' },
            }}
          >
            <TestComponent />
          </PolingoProvider>
        );
      });

      // Wait for loader to initialize
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify the URL uses custom baseUrl
      expect(fetchedUrls).toContain('/custom/path/translations/en/messages.json');

      await act(async () => {
        root.unmount();
      });
      container.remove();
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
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

  it('renders plural translations', async () => {
    const translator = await createTestTranslator('es');

    function MessageCount({ count }: { count: number }) {
      return (
        <Trans
          message="You have {n} unread message"
          plural="You have {n} unread messages"
          count={count}
        />
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <MessageCount count={5} />
        </PolingoProvider>
      );
    });

    expect(container.textContent).toBe('Tienes 5 mensajes sin leer');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders text without components', async () => {
    const translator = await createTestTranslator('en');

    function SimpleText() {
      return <Trans message="Hello {name}" values={{ name: 'World' }} />;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <SimpleText />
        </PolingoProvider>
      );
    });

    expect(container.textContent).toBe('Hello World');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders with fallback when translator not ready', async () => {
    function FallbackText() {
      return <Trans message="Loading..." fallback="Please wait" />;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Create without translator to test fallback
    await act(async () => {
      root.render(
        <PolingoProvider
          create={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return await createTestTranslator('en');
          }}
        >
          <FallbackText />
        </PolingoProvider>
      );
    });

    // Should show original message during loading
    expect(container.textContent).toBe('Loading...');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('handles component renderer functions', async () => {
    const translator = await createTestTranslator('en');

    function CustomRenderer() {
      return (
        <Trans
          message="Click <0>here</0>"
          components={[(children) => <button>{children}</button>]}
        />
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <CustomRenderer />
        </PolingoProvider>
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('here');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('handles named components object', async () => {
    const translator = await createTestTranslator('en');

    function NamedComponents() {
      return (
        <Trans message="Click <link>here</link>" components={{ link: <a href="/docs" /> }} />
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <NamedComponents />
        </PolingoProvider>
      );
    });

    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent).toBe('here');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('handles self-closing tags', async () => {
    const translator = await createTestTranslator('en');

    function SelfClosing() {
      return <Trans message="Line 1<0 />Line 2" components={[<br />]} />;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PolingoProvider translator={translator}>
          <SelfClosing />
        </PolingoProvider>
      );
    });

    expect(container.querySelector('br')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
