import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { extract } from '../src/index.js';

describe('extract', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `polingo-cli-test-extract-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should extract t() calls', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const greeting = t('Hello');
      const farewell = t("Goodbye");
      const question = t(\`How are you?\`);
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].msgid).toBe('Goodbye');
    expect(result.entries[1].msgid).toBe('Hello');
    expect(result.entries[2].msgid).toBe('How are you?');
  });

  it('should extract tp() calls with context', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const menuFile = tp('menu', 'File');
      const verbFile = tp('verb', 'File');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries.find((e) => e.msgctxt === 'menu')).toBeDefined();
    expect(result.entries.find((e) => e.msgctxt === 'verb')).toBeDefined();
  });

  it('should extract tn() calls with plural', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const items = tn('{n} item', '{n} items', count);
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('{n} item');
    expect(result.entries[0].msgidPlural).toBe('{n} items');
  });

  it('should extract tnp() calls with context and plural', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const files = tnp('files', '{n} file', '{n} files', count);
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('{n} file');
    expect(result.entries[0].msgidPlural).toBe('{n} files');
    expect(result.entries[0].msgctxt).toBe('files');
  });

  it('should merge duplicate messages from different files', async () => {
    const file1 = join(tmpDir, 'file1.ts');
    const file2 = join(tmpDir, 'file2.ts');

    await writeFile(file1, `const msg = t('Hello');`);
    await writeFile(file2, `const msg = t('Hello');`);

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('Hello');
    expect(result.entries[0].references).toHaveLength(2);
  });

  it('should write POT file when not in dry-run mode', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(testFile, `const msg = t('Hello');`);

    const potFile = join(tmpDir, 'output.pot');
    const result = await extract({
      sources: [tmpDir],
      outFile: potFile,
      cwd: tmpDir,
      dryRun: false,
    });

    expect(result.outFile).toBe(potFile);

    const content = await readFile(potFile, 'utf8');
    expect(content).toContain('msgid "Hello"');
    expect(content).toContain('msgstr ""');
  });

  it('should respect file extensions filter', async () => {
    await writeFile(join(tmpDir, 'test.ts'), `t('TypeScript');`);
    await writeFile(join(tmpDir, 'test.md'), `t('Markdown');`);

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      extensions: ['.ts'],
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('TypeScript');
  });

  it('should include file references in output', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const line2 = t('First');
      const line3 = t('Second');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries[0].references[0]).toMatch(/test\.ts:\d+/);
    expect(result.entries[1].references[0]).toMatch(/test\.ts:\d+/);
  });

  it('should handle escape sequences in strings', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(testFile, String.raw`const msg = t('Hello\nWorld');`);

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('Hello\nWorld');
  });

  it('should skip non-existent paths', async () => {
    const result = await extract({
      sources: ['non-existent-path'],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.skipped).toContain('non-existent-path');
    expect(result.entries).toHaveLength(0);
  });

  it('should sort entries alphabetically', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      t('Zebra');
      t('Apple');
      t('Banana');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries[0].msgid).toBe('Apple');
    expect(result.entries[1].msgid).toBe('Banana');
    expect(result.entries[2].msgid).toBe('Zebra');
  });
});
