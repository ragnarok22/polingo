import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { compileCatalogs } from '../src/index.js';

describe('compileCatalogs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `polingo-cli-test-compile-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should compile .po file to JSON format', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola"
`;
    await writeFile(poFile, poContent);

    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      format: 'json',
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].format).toBe('json');
    expect(result.artifacts[0].outputFile).toContain('messages.json');

    const jsonContent = await readFile(result.artifacts[0].outputFile, 'utf8');
    const catalog = JSON.parse(jsonContent) as {
      translations: Record<string, Record<string, { msgstr: string }>>;
    };
    expect(catalog.translations['']).toBeDefined();
    expect(catalog.translations['']['Hello']).toBeDefined();
    expect(catalog.translations['']['Hello'].msgstr).toBe('Hola');
  });

  it('should compile .po file to .mo format', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola"
`;
    await writeFile(poFile, poContent);

    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      format: 'mo',
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].format).toBe('mo');
    expect(result.artifacts[0].outputFile).toContain('messages.mo');

    // Verify the .mo file exists and is not empty
    const moContent = await readFile(result.artifacts[0].outputFile);
    expect(moContent.length).toBeGreaterThan(0);
  });

  it('should compile with custom output directory', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const outDir = join(tmpDir, 'output');
    const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Test"
msgstr "Prueba"
`;
    await writeFile(poFile, poContent);

    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      outDir,
      format: 'json',
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].outputFile).toContain('output');
  });

  it('should pretty-print JSON when requested', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Hola"
`;
    await writeFile(poFile, poContent);

    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      format: 'json',
      pretty: true,
    });

    const jsonContent = await readFile(result.artifacts[0].outputFile, 'utf8');
    // Pretty-printed JSON should have newlines and indentation
    expect(jsonContent).toContain('\n');
    expect(jsonContent).toMatch(/\n {2}/);
  });

  it('should handle plural forms', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "{n} item"
msgid_plural "{n} items"
msgstr[0] "{n} artículo"
msgstr[1] "{n} artículos"
`;
    await writeFile(poFile, poContent);

    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      format: 'json',
    });

    const jsonContent = await readFile(result.artifacts[0].outputFile, 'utf8');
    const catalog = JSON.parse(jsonContent) as {
      translations: Record<string, Record<string, { msgid_plural?: string; msgstr: string[] }>>;
    };
    const translation = catalog.translations['']['{n} item'];
    expect(translation).toBeDefined();
    expect(translation.msgid_plural).toBe('{n} items');
    expect(Array.isArray(translation.msgstr)).toBe(true);
    expect(translation.msgstr).toHaveLength(2);
  });

  it('should handle context in translations', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgctxt "menu"
msgid "File"
msgstr "Archivo"

msgctxt "verb"
msgid "File"
msgstr "Archivar"
`;
    await writeFile(poFile, poContent);

    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      format: 'json',
    });

    const jsonContent = await readFile(result.artifacts[0].outputFile, 'utf8');
    const catalog = JSON.parse(jsonContent) as {
      translations: Record<string, Record<string, { msgstr: string }>>;
    };
    expect(catalog.translations['menu']).toBeDefined();
    expect(catalog.translations['verb']).toBeDefined();
    expect(catalog.translations['menu']['File'].msgstr).toBe('Archivo');
    expect(catalog.translations['verb']['File'].msgstr).toBe('Archivar');
  });

  it('should compile multiple .po files', async () => {
    const esDir = join(tmpDir, 'es');
    const enDir = join(tmpDir, 'en');
    await mkdir(esDir, { recursive: true });
    await mkdir(enDir, { recursive: true });

    await writeFile(
      join(esDir, 'messages.po'),
      `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hola"
`
    );

    await writeFile(
      join(enDir, 'messages.po'),
      `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hello"
`
    );

    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      format: 'json',
    });

    expect(result.artifacts).toHaveLength(2);
  });

  it('should return empty artifacts when no .po files found', async () => {
    const result = await compileCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      format: 'json',
    });

    expect(result.artifacts).toHaveLength(0);
  });

  it('should skip non-existent paths', async () => {
    const result = await compileCatalogs({
      inputs: ['non-existent-path'],
      cwd: tmpDir,
      format: 'json',
    });

    expect(result.skipped).toContain('non-existent-path');
    expect(result.artifacts).toHaveLength(0);
  });

  it('should preserve locale directory structure when using custom outDir', async () => {
    // Setup: locales/en/messages.po and locales/es/messages.po
    const localesDir = join(tmpDir, 'locales');
    const enDir = join(localesDir, 'en');
    const esDir = join(localesDir, 'es');
    const outDir = join(tmpDir, 'public', 'i18n');

    await mkdir(enDir, { recursive: true });
    await mkdir(esDir, { recursive: true });

    await writeFile(
      join(enDir, 'messages.po'),
      `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"

msgid "hello"
msgstr "hello"

msgid "change locale"
msgstr "change locale"
`
    );

    await writeFile(
      join(esDir, 'messages.po'),
      `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "hello"
msgstr "hola"

msgid "change locale"
msgstr "cambiar idioma"
`
    );

    const result = await compileCatalogs({
      inputs: [localesDir],
      cwd: tmpDir,
      outDir,
      format: 'json',
    });

    expect(result.artifacts).toHaveLength(2);

    // Check that files are in the correct locale subdirectories
    const enOutput = result.artifacts.find((a) => a.outputFile.includes('/en/'));
    const esOutput = result.artifacts.find((a) => a.outputFile.includes('/es/'));

    expect(enOutput).toBeDefined();
    expect(esOutput).toBeDefined();
    expect(enOutput!.outputFile).toBe(join(outDir, 'en', 'messages.json'));
    expect(esOutput!.outputFile).toBe(join(outDir, 'es', 'messages.json'));

    // Verify the files actually exist with correct content
    const enContent = await readFile(enOutput!.outputFile, 'utf8');
    const esContent = await readFile(esOutput!.outputFile, 'utf8');

    const enCatalog = JSON.parse(enContent) as {
      translations: Record<string, Record<string, { msgstr: string }>>;
    };
    const esCatalog = JSON.parse(esContent) as {
      translations: Record<string, Record<string, { msgstr: string }>>;
    };

    expect(enCatalog.translations['']['hello'].msgstr).toBe('hello');
    expect(esCatalog.translations['']['hello'].msgstr).toBe('hola');
    expect(enCatalog.translations['']['change locale'].msgstr).toBe('change locale');
    expect(esCatalog.translations['']['change locale'].msgstr).toBe('cambiar idioma');
  });

  it('should handle locale codes with region variants (e.g., en-US, pt-BR)', async () => {
    const localesDir = join(tmpDir, 'locales');
    const enUSDir = join(localesDir, 'en-US');
    const ptBRDir = join(localesDir, 'pt-BR');
    const outDir = join(tmpDir, 'dist');

    await mkdir(enUSDir, { recursive: true });
    await mkdir(ptBRDir, { recursive: true });

    await writeFile(
      join(enUSDir, 'messages.po'),
      `
msgid ""
msgstr ""
"Language: en-US\\n"

msgid "color"
msgstr "color"
`
    );

    await writeFile(
      join(ptBRDir, 'messages.po'),
      `
msgid ""
msgstr ""
"Language: pt-BR\\n"

msgid "color"
msgstr "cor"
`
    );

    const result = await compileCatalogs({
      inputs: [localesDir],
      cwd: tmpDir,
      outDir,
      format: 'json',
    });

    expect(result.artifacts).toHaveLength(2);

    const enUSOutput = result.artifacts.find((a) => a.outputFile.includes('/en-US/'));
    const ptBROutput = result.artifacts.find((a) => a.outputFile.includes('/pt-BR/'));

    expect(enUSOutput).toBeDefined();
    expect(ptBROutput).toBeDefined();
    expect(enUSOutput!.outputFile).toBe(join(outDir, 'en-US', 'messages.json'));
    expect(ptBROutput!.outputFile).toBe(join(outDir, 'pt-BR', 'messages.json'));
  });

  it('should not create locale subdirectory when input file is not in a locale directory', async () => {
    // File directly in root, not in a locale subdirectory
    const poFile = join(tmpDir, 'messages.po');
    const outDir = join(tmpDir, 'output');

    await writeFile(
      poFile,
      `
msgid ""
msgstr ""

msgid "test"
msgstr "prueba"
`
    );

    const result = await compileCatalogs({
      inputs: [poFile],
      cwd: tmpDir,
      outDir,
      format: 'json',
    });

    expect(result.artifacts).toHaveLength(1);
    // Should be directly in outDir, not in a subdirectory
    expect(result.artifacts[0].outputFile).toBe(join(outDir, 'messages.json'));
  });
});
