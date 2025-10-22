import { describe, it, expect, beforeAll } from 'vitest';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { NodeLoader } from '../src/loader';

describe('NodeLoader', () => {
  const testDir = join(tmpdir(), 'polingo-test-' + Date.now());
  const esDir = join(testDir, 'es');
  const enDir = join(testDir, 'en');
  const frDir = join(testDir, 'fr');
  const frLCDir = join(frDir, 'LC_MESSAGES');

  beforeAll(async () => {
    // Create test directories
    await mkdir(esDir, { recursive: true });
    await mkdir(enDir, { recursive: true });
    await mkdir(frLCDir, { recursive: true });

    // Create a simple .po file for Spanish
    const esPoContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola"

msgid "Goodbye"
msgstr "Adiós"

msgctxt "menu"
msgid "File"
msgstr "Archivo"

msgid "one item"
msgid_plural "{n} items"
msgstr[0] "un artículo"
msgstr[1] "{n} artículos"
`;

    // Create a simple .po file for English
    const enPoContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"

msgid "Hello"
msgstr "Hello"

msgid "Goodbye"
msgstr "Goodbye"
`;

    await writeFile(join(esDir, 'messages.po'), esPoContent);
    await writeFile(join(enDir, 'messages.po'), enPoContent);
    await writeFile(
      join(frLCDir, 'messages.po'),
      `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: fr\\n"

msgid "Hello"
msgstr "Bonjour"
`
    );
  });

  it('should load a .po file successfully', async () => {
    const loader = new NodeLoader(testDir);
    const catalog = await loader.load('es', 'messages');

    expect(catalog).toBeDefined();
    expect(catalog.charset).toBe('utf-8');
    expect(catalog.translations).toBeDefined();
  });

  it('should parse translations correctly', async () => {
    const loader = new NodeLoader(testDir);
    const catalog = await loader.load('es', 'messages');

    // Check simple translation
    expect(catalog.translations['']['Hello']).toBeDefined();
    expect(catalog.translations['']['Hello'].msgstr).toBe('Hola');

    // Check another translation
    expect(catalog.translations['']['Goodbye']).toBeDefined();
    expect(catalog.translations['']['Goodbye'].msgstr).toBe('Adiós');
  });

  it('should parse context translations correctly', async () => {
    const loader = new NodeLoader(testDir);
    const catalog = await loader.load('es', 'messages');

    // Check translation with context
    expect(catalog.translations['menu']['File']).toBeDefined();
    expect(catalog.translations['menu']['File'].msgstr).toBe('Archivo');
  });

  it('should parse plural translations correctly', async () => {
    const loader = new NodeLoader(testDir);
    const catalog = await loader.load('es', 'messages');

    const pluralTranslation = catalog.translations['']['one item'];
    expect(pluralTranslation).toBeDefined();
    expect(pluralTranslation.msgid_plural).toBe('{n} items');
    expect(Array.isArray(pluralTranslation.msgstr)).toBe(true);
    expect((pluralTranslation.msgstr as string[]).length).toBeGreaterThan(0);

    const pluralForms = pluralTranslation.msgstr as string[];
    expect(pluralForms[0]).toBe('un artículo');
  });

  it('should throw error for non-existent domain', async () => {
    const loader = new NodeLoader(testDir);
    await expect(loader.load('es', 'missing-domain')).rejects.toThrow(/Translation file not found/);
  });

  it('should throw error for non-existent locale', async () => {
    const loader = new NodeLoader(testDir);
    await expect(loader.load('de', 'messages')).rejects.toThrow();
  });

  it('should load different locales', async () => {
    const loader = new NodeLoader(testDir);

    const esCatalog = await loader.load('es', 'messages');
    const enCatalog = await loader.load('en', 'messages');

    expect(esCatalog.translations['']['Hello'].msgstr).toBe('Hola');
    expect(enCatalog.translations['']['Hello'].msgstr).toBe('Hello');
  });

  it('should fall back to LC_MESSAGES layout when direct files are missing', async () => {
    const loader = new NodeLoader(testDir);
    const catalog = await loader.load('fr', 'messages');

    expect(catalog.translations['']['Hello'].msgstr).toBe('Bonjour');
  });
});
