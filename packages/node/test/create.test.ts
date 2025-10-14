import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PolingoInstance } from '../src/create';

interface TranslatorStub extends Record<string, unknown> {
  load: ReturnType<typeof vi.fn>;
  clearCache: ReturnType<typeof vi.fn>;
  stopWatching?: () => Promise<void>;
}

const translatorInstances: TranslatorStub[] = [];
const translatorArgs: Array<{
  loader: unknown;
  cache: unknown;
  config: Record<string, unknown>;
}> = [];

const TranslatorMock = vi
  .fn(function (
    this: TranslatorStub,
    loader: unknown,
    cache: unknown,
    config: Record<string, unknown>
  ) {
    this.load = vi.fn().mockResolvedValue(undefined);
    this.clearCache = vi.fn();
    translatorInstances.push(this);
    translatorArgs.push({ loader, cache, config });
  })
  .mockName('Translator');

const memoryCacheInstances: unknown[] = [];
const MemoryCacheMock = vi
  .fn(function (this: unknown) {
    memoryCacheInstances.push(this);
  })
  .mockName('MemoryCache');

const noCacheInstances: unknown[] = [];
const NoCacheMock = vi
  .fn(function (this: unknown) {
    noCacheInstances.push(this);
  })
  .mockName('NoCache');

const NodeLoaderMock = vi
  .fn(function (this: Record<string, unknown>, directory: string) {
    this.directory = directory;
  })
  .mockName('NodeLoader');

const watcherStartMock = vi.fn();
const watcherStopMock = vi.fn().mockResolvedValue(undefined);
const TranslationWatcherMock = vi
  .fn(function (this: Record<string, unknown>) {
    this.start = watcherStartMock;
    this.stop = watcherStopMock;
  })
  .mockName('TranslationWatcher');

vi.mock('@polingo/core', () => ({
  Translator: TranslatorMock,
  MemoryCache: MemoryCacheMock,
  NoCache: NoCacheMock,
}));

vi.mock('../src/loader', () => ({
  NodeLoader: NodeLoaderMock,
}));

vi.mock('../src/watcher', () => ({
  TranslationWatcher: TranslationWatcherMock,
}));

const { createPolingo } = await import('../src/create');

describe('createPolingo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    translatorInstances.length = 0;
    translatorArgs.length = 0;
    memoryCacheInstances.length = 0;
    noCacheInstances.length = 0;
  });

  it('creates a translator with defaults and preloads locales', async () => {
    const instance = (await createPolingo({
      locale: 'es',
      locales: ['es', 'en'],
      directory: '/tmp/test-locales',
    })) as PolingoInstance;

    expect(NodeLoaderMock).toHaveBeenCalledTimes(1);
    expect(NodeLoaderMock).toHaveBeenCalledWith('/tmp/test-locales');

    expect(MemoryCacheMock).toHaveBeenCalledTimes(1);
    expect(NoCacheMock).not.toHaveBeenCalled();

    expect(TranslatorMock).toHaveBeenCalledTimes(1);

    const [callArgs] = translatorArgs;
    expect(callArgs.config).toMatchObject({
      locale: 'es',
      fallback: 'en',
      domain: 'messages',
      debug: false,
    });
    expect(callArgs.loader).toBeInstanceOf(NodeLoaderMock);
    expect(callArgs.cache).toBeInstanceOf(MemoryCacheMock);

    const [translator] = translatorInstances;
    expect(translator.load).toHaveBeenCalledWith(['es', 'en']);
    expect(instance).toBe(translator);
    expect(instance.stopWatching).toBeUndefined();
  });

  it('disables caching when cache option is false', async () => {
    await createPolingo({
      locale: 'en',
      locales: ['en'],
      directory: '/tmp/no-cache',
      cache: false,
    });

    expect(MemoryCacheMock).not.toHaveBeenCalled();
    expect(NoCacheMock).toHaveBeenCalledTimes(1);

    const [callArgs] = translatorArgs;
    expect(callArgs.cache).toBeInstanceOf(NoCacheMock);
  });

  it('wires up file watching when watch option is true', async () => {
    const instance = (await createPolingo({
      locale: 'fr',
      locales: ['fr', 'en'],
      directory: '/tmp/watch',
      domain: 'custom',
      watch: true,
      debug: true,
    })) as PolingoInstance;

    expect(TranslationWatcherMock).toHaveBeenCalledTimes(1);

    const [translator] = translatorInstances;
    expect(TranslationWatcherMock).toHaveBeenCalledWith(
      translator,
      '/tmp/watch',
      ['fr', 'en'],
      'custom',
      true
    );

    expect(watcherStartMock).toHaveBeenCalledTimes(1);

    expect(typeof instance.stopWatching).toBe('function');
    await instance.stopWatching?.();
    expect(watcherStopMock).toHaveBeenCalledTimes(1);
  });
});
