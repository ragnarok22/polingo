import { createContext } from 'react';
import type { Translator } from '@polingo/core';

export type InterpolationValues = Record<string, string | number>;

export interface PolingoContextValue {
  translator: Translator | null;
  locale: string;
  loading: boolean;
  error: unknown;
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

export const PolingoContext = createContext<PolingoContextValue | undefined>(undefined);

export type { Translator };
