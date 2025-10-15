import { interpolate } from '@polingo/core';
import { createPolingo, type CreatePolingoOptions, type WebPolingoInstance } from '@polingo/web';
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  provide,
  shallowRef,
  watch,
  type PropType,
  type VNodeChild,
  ref,
} from 'vue';
import type { InterpolationValues, PolingoContextValue, Translator } from './context';
import { polingoContextKey } from './context';

type PolingoFactory = () => Promise<WebPolingoInstance> | WebPolingoInstance;

interface ProviderBaseProps {
  loadingFallback?: VNodeChild;
  onError?: (error: unknown) => void;
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

export const PolingoProvider = defineComponent({
  name: 'PolingoProvider',
  props: {
    translator: Object as PropType<Translator>,
    create: [Function, Object] as PropType<CreatePolingoOptions | PolingoFactory>,
    loadingFallback: null as unknown as PropType<VNodeChild>,
    onError: Function as PropType<(error: unknown) => void>,
  },
  setup(props, { slots }) {
    const providedTranslator = props.translator;
    const createInput = props.create;

    const initialLocale =
      providedTranslator?.getLocale() ??
      (isCreateOptions(createInput) ? createInput.locale : createInput ? '' : '');

    const translatorRef = shallowRef<Translator | null>(providedTranslator ?? null);
    const locale = ref(initialLocale);
    const loading = ref(!providedTranslator);
    const error = ref<unknown>(null);

    let cancelled = false;

    const cleanupPending = (): void => {
      cancelled = true;
    };

    onBeforeUnmount(cleanupPending);

    watch(
      () => props.translator,
      (nextTranslator) => {
        if (nextTranslator) {
          translatorRef.value = nextTranslator;
          locale.value = nextTranslator.getLocale();
          loading.value = false;
          error.value = null;
        } else if (!props.create) {
          translatorRef.value = null;
          locale.value = '';
          loading.value = false;
        }
      },
      { immediate: true }
    );

    watch(
      () => props.create,
      (nextCreate, _prevCreate, onCleanup) => {
        cancelled = false;
        onCleanup(() => {
          cancelled = true;
        });

        if (props.translator) {
          return;
        }

        if (!nextCreate) {
          translatorRef.value = null;
          loading.value = false;
          return;
        }

        loading.value = true;
        error.value = null;

        const factory: PolingoFactory =
          typeof nextCreate === 'function' ? nextCreate : () => createPolingo(nextCreate);

        void (async () => {
          try {
            const instance = await factory();
            if (cancelled) {
              return;
            }
            translatorRef.value = instance;
            locale.value = instance.getLocale();
            loading.value = false;
            error.value = null;
          } catch (caught) {
            if (cancelled) {
              return;
            }
            translatorRef.value = null;
            loading.value = false;
            error.value = caught;
            props.onError?.(caught);
          }
        })();
      },
      { immediate: true }
    );

    const setLocale = async (nextLocale: string): Promise<void> => {
      const activeTranslator = translatorRef.value;

      if (!activeTranslator) {
        throw new Error('[Polingo] Translator is not ready yet. Wait for loading to finish.');
      }

      if (!nextLocale || !nextLocale.trim()) {
        throw new Error('[Polingo] setLocale requires a non-empty locale string.');
      }

      if (activeTranslator.getLocale() === nextLocale) {
        locale.value = activeTranslator.getLocale();
        error.value = null;
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        await activeTranslator.setLocale(nextLocale);
        if (cancelled) {
          return;
        }
        locale.value = activeTranslator.getLocale();
        loading.value = false;
        error.value = null;
      } catch (caught) {
        if (cancelled) {
          return;
        }
        loading.value = false;
        error.value = caught;
        props.onError?.(caught);
        throw caught;
      }
    };

    const translateOrFallback = <R>(
      translator: Translator | null,
      translate: (active: Translator) => R,
      fallback: () => R
    ): R => {
      if (translator) {
        return translate(translator);
      }
      return fallback();
    };

    const safeInterpolate = (msgid: string, vars?: InterpolationValues): string =>
      interpolate(msgid, vars);

    const contextValue: PolingoContextValue = {
      translator: translatorRef,
      locale: computed(() => locale.value),
      loading: computed(() => loading.value),
      error: computed(() => error.value),
      setLocale,
      t: (msgid, vars) =>
        translateOrFallback(
          translatorRef.value,
          (active) => active.t(msgid, vars),
          () => safeInterpolate(msgid, vars)
        ),
      tp: (context, msgid, vars) =>
        translateOrFallback(
          translatorRef.value,
          (active) => active.tp(context, msgid, vars),
          () => safeInterpolate(msgid, vars)
        ),
      tn: (msgid, msgidPlural, count, vars) => {
        const resolvedVars: InterpolationValues | undefined =
          vars === undefined ? { n: count } : { ...vars, n: count };
        return translateOrFallback(
          translatorRef.value,
          (active) => active.tn(msgid, msgidPlural, count, vars),
          () => safeInterpolate(fallbackPlural(msgid, msgidPlural, count), resolvedVars)
        );
      },
      tnp: (context, msgid, msgidPlural, count, vars) => {
        const resolvedVars: InterpolationValues | undefined =
          vars === undefined ? { n: count } : { ...vars, n: count };
        return translateOrFallback(
          translatorRef.value,
          (active) => active.tnp(context, msgid, msgidPlural, count, vars),
          () => safeInterpolate(fallbackPlural(msgid, msgidPlural, count), resolvedVars)
        );
      },
    };

    provide(polingoContextKey, contextValue);

    return () => {
      if (loading.value && props.loadingFallback !== undefined) {
        return props.loadingFallback ?? null;
      }
      return slots.default?.() ?? null;
    };
  },
});

export type { PolingoContextValue } from './context';
