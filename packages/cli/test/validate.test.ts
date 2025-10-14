import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { validateCatalogs } from '../src/index.js';

describe('validateCatalogs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `polingo-cli-test-validate-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should pass validation for complete catalog', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Hola"

msgid "Goodbye"
msgstr "Adiós"
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
    });

    expect(result.issues).toHaveLength(0);
  });

  it('should detect missing translations', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hola"

msgid "Goodbye"
msgstr ""
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].msgid).toBe('Goodbye');
    expect(result.issues[0].message).toContain('Missing translation');
  });

  it('should detect missing plural translations', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""

msgid "{n} item"
msgid_plural "{n} items"
msgstr[0] "{n} artículo"
msgstr[1] ""
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].msgid).toBe('{n} item');
    expect(result.issues[0].message).toContain('Missing plural translation');
  });

  it('should validate multiple files', async () => {
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
msgstr ""
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

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].file).toContain('es');
  });

  it('should detect fuzzy flags in strict mode', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""

#, fuzzy
msgid "Hello"
msgstr "Hola"
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      strict: true,
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toContain('Fuzzy flag');
  });

  it('should ignore fuzzy flags when not in strict mode', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""

#, fuzzy
msgid "Hello"
msgstr "Hola"
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      strict: false,
    });

    expect(result.issues).toHaveLength(0);
  });

  it('should include context in issue report', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""

msgctxt "menu"
msgid "File"
msgstr ""
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].context).toBe('menu');
    expect(result.issues[0].msgid).toBe('File');
  });

  it('should handle default context', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""

msgid "Hello"
msgstr ""
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].context).toBe('default');
  });

  it('should validate catalogs with no issues', async () => {
    const poFile = join(tmpDir, 'messages.po');
    const poContent = `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hola"

msgid "{n} item"
msgid_plural "{n} items"
msgstr[0] "{n} artículo"
msgstr[1] "{n} artículos"

msgctxt "menu"
msgid "File"
msgstr "Archivo"
`;
    await writeFile(poFile, poContent);

    const result = await validateCatalogs({
      inputs: [tmpDir],
      cwd: tmpDir,
      strict: true,
    });

    expect(result.issues).toHaveLength(0);
  });

  it('should skip non-existent paths', async () => {
    const result = await validateCatalogs({
      inputs: ['non-existent-path'],
      cwd: tmpDir,
    });

    expect(result.issues).toHaveLength(0);
  });
});
