import { inject, type ComputedRef } from 'vue';
import type { InterpolationValues, PolingoContextValue, Translator } from './context';
import { polingoContextKey } from './context';

export interface UseTranslationResult {
  locale: ComputedRef<string>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<unknown>;
  setLocale: (locale: string) => Promise<void>;
  t: (msgid: string, vars?: InterpolationValues) => string;
  tp: (context: string, msgid: string, vars?: InterpolationValues) => string;
  tn: (msgid: string, msgidPlural: string, count: number, vars?: InterpolationValues) => string;
  tnp: (
    context: string,
    msgid: string,
    msgidPlural: string,
    count: number,
    vars?: InterpolationValues
  ) => string;
}

export function usePolingo(): PolingoContextValue {
  const context = inject(polingoContextKey);
  if (!context) {
    throw new Error('usePolingo must be used within a <PolingoProvider>.');
  }
  return context;
}

export function useTranslator(): Translator {
  const { translator, loading } = usePolingo();
  const current = translator.value;

  if (!current) {
    throw new Error(
      loading.value
        ? 'Translator is loading. Wait for the provider to finish initialization before calling useTranslator.'
        : 'Translator is not available. Provide one via <PolingoProvider>.'
    );
  }

  return current;
}

export function useTranslation(): UseTranslationResult {
  const context = usePolingo();

  return {
    locale: context.locale,
    loading: context.loading,
    error: context.error,
    setLocale: context.setLocale,
    t: context.t,
    tp: context.tp,
    tn: context.tn,
    tnp: context.tnp,
  };
}

export function useLocale(): {
  locale: ComputedRef<string>;
  loading: ComputedRef<boolean>;
  setLocale: (locale: string) => Promise<void>;
} {
  const { locale, loading, setLocale } = usePolingo();
  return { locale, loading, setLocale };
}
