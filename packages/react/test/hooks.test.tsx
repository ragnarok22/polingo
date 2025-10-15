// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, expect, it } from 'vitest';
import type { TranslationCatalog, TranslationLoader } from '@polingo/core';
import { NoCache, Translator } from '@polingo/core';
import { PolingoProvider, usePolingo, useTranslator, useTranslation, useLocale } from '../src';

beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'plural-forms': 'nplurals=2; plural=(n != 1);',
};

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
  async load(locale, domain) {
    if (domain !== 'messages') {
      throw new Error(`Unknown domain ${domain}`);
    }
    if (locale === 'en') {
      return JSON.parse(JSON.stringify(EN_CATALOG)) as TranslationCatalog;
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
  await translator.load(['en']);
  return translator;
}

describe('usePolingo', () => {
  it('throws error when used outside provider', () => {
    function TestComponent() {
      try {
        usePolingo();
        return <div>Should not reach here</div>;
      } catch (error) {
        return <div>{(error as Error).message}</div>;
      }
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<TestComponent />);
    });

    expect(container.textContent).toContain('usePolingo must be used within a <PolingoProvider>');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('returns context value when used within provider', async () => {
    const translator = await createTestTranslator('en');
    let contextValue: ReturnType<typeof usePolingo> | null = null;

    function TestComponent() {
      contextValue = usePolingo();
      return <div>OK</div>;
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

    expect(contextValue).not.toBeNull();
    expect(contextValue?.translator).toBe(translator);
    expect(contextValue?.locale).toBe('en');
    expect(contextValue?.loading).toBe(false);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

describe('useTranslator', () => {
  it('throws error when translator is not available', () => {
    function TestComponent() {
      try {
        useTranslator();
        return <div>Should not reach here</div>;
      } catch (error) {
        return <div>{(error as Error).message}</div>;
      }
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<TestComponent />);
    });

    expect(container.textContent).toContain('usePolingo must be used within a <PolingoProvider>');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('throws error when translator is still loading', async () => {
    let errorMessage = '';

    function TestComponent() {
      try {
        useTranslator();
        return <div>OK</div>;
      } catch (error) {
        errorMessage = (error as Error).message;
        return <div>{errorMessage}</div>;
      }
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

    expect(errorMessage).toContain('Translator is loading');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('returns translator when available', async () => {
    const translator = await createTestTranslator('en');
    let capturedTranslator: Translator | null = null;

    function TestComponent() {
      capturedTranslator = useTranslator();
      return <div>OK</div>;
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

    expect(capturedTranslator).toBe(translator);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

describe('useTranslation', () => {
  it('returns all translation methods', async () => {
    const translator = await createTestTranslator('en');
    let result: ReturnType<typeof useTranslation> | null = null;

    function TestComponent() {
      result = useTranslation();
      return <div>OK</div>;
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

    expect(result).not.toBeNull();
    expect(typeof result?.t).toBe('function');
    expect(typeof result?.tp).toBe('function');
    expect(typeof result?.tn).toBe('function');
    expect(typeof result?.tnp).toBe('function');
    expect(typeof result?.setLocale).toBe('function');
    expect(result?.locale).toBe('en');
    expect(result?.loading).toBe(false);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('provides working translation methods', async () => {
    const translator = await createTestTranslator('en');
    let translation = '';

    function TestComponent() {
      const { t } = useTranslation();
      translation = t('Hello');
      return <div>{translation}</div>;
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

    expect(translation).toBe('Hello');
    expect(container.textContent).toBe('Hello');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

describe('useLocale', () => {
  it('returns locale information', async () => {
    const translator = await createTestTranslator('en');
    let localeInfo: ReturnType<typeof useLocale> | null = null;

    function TestComponent() {
      localeInfo = useLocale();
      return <div>OK</div>;
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

    expect(localeInfo).not.toBeNull();
    expect(localeInfo?.locale).toBe('en');
    expect(localeInfo?.loading).toBe(false);
    expect(typeof localeInfo?.setLocale).toBe('function');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
