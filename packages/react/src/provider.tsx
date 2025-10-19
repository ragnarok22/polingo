import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { interpolate } from '@polingo/core';
import { createPolingo, type CreatePolingoOptions, type WebPolingoInstance } from '@polingo/web';
import type { InterpolationValues, PolingoContextValue, Translator } from './context';
import { PolingoContext } from './context';

type PolingoFactory = () => Promise<WebPolingoInstance> | WebPolingoInstance;

interface ProviderBaseProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  onError?: (error: unknown) => void;
}

interface ProviderState {
  translator: Translator | null;
  locale: string;
  loading: boolean;
  error: unknown;
}

type ProvidedTranslatorProps = ProviderBaseProps & {
  translator: Translator;
  create?: never;
};

type CreateTranslatorProps = ProviderBaseProps & {
  translator?: never;
  create: CreatePolingoOptions | PolingoFactory;
};

export type PolingoProviderProps = ProvidedTranslatorProps | CreateTranslatorProps;

function isCreateOptions(
  value: CreatePolingoOptions | PolingoFactory | undefined
): value is CreatePolingoOptions {
  return typeof value === 'object' && value !== null;
}

function fallbackPlural(msgid: string, msgidPlural: string, count: number): string {
  return Math.abs(count) === 1 ? msgid : msgidPlural;
}

export function PolingoProvider(props: PolingoProviderProps): JSX.Element {
  const { children, loadingFallback, onError } = props;
  const providedTranslator = 'translator' in props ? props.translator : undefined;
  const createInput = 'create' in props ? props.create : undefined;

  const initialLocale =
    providedTranslator?.getLocale() ??
    (isCreateOptions(createInput) ? createInput.locale : createInput ? '' : '');

  const [state, setState] = useState<ProviderState>(() => ({
    translator: providedTranslator ?? null,
    locale: initialLocale,
    loading: !providedTranslator,
    error: null,
  }));

  const translatorRef = useRef<Translator | null>(providedTranslator ?? null);

  useEffect(() => {
    if (providedTranslator) {
      translatorRef.current = providedTranslator;
      setState({
        translator: providedTranslator,
        locale: providedTranslator.getLocale(),
        loading: false,
        error: null,
      });
      return;
    }

    if (!createInput) {
      return;
    }

    let cancelled = false;

    setState((prev) => ({
      ...prev,
      translator: translatorRef.current,
      loading: true,
      error: null,
    }));

    const factory: PolingoFactory =
      typeof createInput === 'function'
        ? createInput
        : () => createPolingo(createInput);

    void (async () => {
      try {
        const instance = await factory();
        if (cancelled) {
          return;
        }
        translatorRef.current = instance;
        setState({
          translator: instance,
          locale: instance.getLocale(),
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        translatorRef.current = null;
        setState((prev) => ({
          ...prev,
          translator: null,
          loading: false,
          error,
        }));
        onError?.(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [providedTranslator, createInput, onError]);

  const setLocale = useCallback(
    async (nextLocale: string): Promise<void> => {
      const translator = translatorRef.current;

      if (!translator) {
        throw new Error('[Polingo] Translator is not ready yet. Wait for loading to finish.');
      }

      if (!nextLocale || !nextLocale.trim()) {
        throw new Error('[Polingo] setLocale requires a non-empty locale string.');
      }

      if (translator.getLocale() === nextLocale) {
        setState((prev) => ({
          ...prev,
          locale: translator.getLocale(),
          error: null,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        await translator.setLocale(nextLocale);
        setState((prev) => ({
          ...prev,
          locale: translator.getLocale(),
          loading: false,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error,
        }));
        onError?.(error);
        throw error;
      }
    },
    [onError]
  );

  const translateOrFallback = useCallback(
    <R,>(
      translator: Translator | null,
      translate: (active: Translator) => R,
      fallback: () => R
    ): R => {
      if (translator) {
        return translate(translator);
      }
      return fallback();
    },
    []
  );

  const contextValue = useMemo<PolingoContextValue>(() => {
    const translator = translatorRef.current;

    const safeInterpolate = (msgid: string, vars?: InterpolationValues): string =>
      interpolate(msgid, vars);

    return {
      translator,
      locale: state.locale,
      loading: state.loading,
      error: state.error,
      setLocale,
      t: (msgid, vars) =>
        translateOrFallback(
          translator,
          (active) => active.t(msgid, vars),
          () => safeInterpolate(msgid, vars)
        ),
      tp: (context, msgid, vars) =>
        translateOrFallback(
          translator,
          (active) => active.tp(context, msgid, vars),
          () => safeInterpolate(msgid, vars)
        ),
      tn: (msgid, msgidPlural, count, vars) => {
        const resolvedVars: InterpolationValues | undefined =
          vars === undefined ? { n: count } : { ...vars, n: count };
        return translateOrFallback(
          translator,
          (active) => active.tn(msgid, msgidPlural, count, vars),
          () => safeInterpolate(fallbackPlural(msgid, msgidPlural, count), resolvedVars)
        );
      },
      tnp: (context, msgid, msgidPlural, count, vars) => {
        const resolvedVars: InterpolationValues | undefined =
          vars === undefined ? { n: count } : { ...vars, n: count };
        return translateOrFallback(
          translator,
          (active) => active.tnp(context, msgid, msgidPlural, count, vars),
          () => safeInterpolate(fallbackPlural(msgid, msgidPlural, count), resolvedVars)
        );
      },
    };
  }, [setLocale, state.error, state.locale, state.loading, translateOrFallback]);

  const content = state.loading && loadingFallback ? loadingFallback : children;

  return <PolingoContext.Provider value={contextValue}>{content}</PolingoContext.Provider>;
}
