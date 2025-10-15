import type { Translator } from '@polingo/core';
import type { ComputedRef, InjectionKey, ShallowRef } from 'vue';

export type InterpolationValues = Record<string, string | number>;

export interface PolingoContextValue {
  translator: ShallowRef<Translator | null>;
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

export const polingoContextKey: InjectionKey<PolingoContextValue> = Symbol('polingo-context');

export type { Translator };
