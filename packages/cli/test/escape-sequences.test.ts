import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { extract } from '../src/index.js';

describe('escape sequences in source code extraction', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `polingo-cli-test-escape-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should handle hexadecimal escape sequences in source strings', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const greeting = t('\\x48\\x65\\x6C\\x6C\\x6F');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // \\x48\\x65\\x6C\\x6C\\x6F should decode to "Hello"
    expect(result.entries[0].msgid).toBe('Hello');
  });

  it('should handle unicode escape sequences in source strings', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const greeting = t('\\u0048\\u0065\\u006C\\u006C\\u006F');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // \\u0048\\u0065\\u006C\\u006C\\u006F should decode to "Hello"
    expect(result.entries[0].msgid).toBe('Hello');
  });

  it('should handle invalid hex escape sequences', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('\\xZZ\\x1G');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // Invalid hex sequences are kept with the backslash
    expect(result.entries[0].msgid).toBe('\\xZZ\\x1G');
  });

  it('should handle incomplete hex escape sequences', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('\\x4');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // Incomplete hex (only 1 digit instead of 2) is kept with the backslash
    expect(result.entries[0].msgid).toBe('\\x4');
  });

  it('should handle invalid unicode escape sequences', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('\\uZZZZ\\u00GG');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // Invalid unicode sequences are kept with the backslash
    expect(result.entries[0].msgid).toBe('\\uZZZZ\\u00GG');
  });

  it('should handle incomplete unicode escape sequences', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('\\u004');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // Incomplete unicode (only 3 digits instead of 4) is kept with the backslash
    expect(result.entries[0].msgid).toBe('\\u004');
  });

  it('should handle null character escape', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('Before\\0After');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('Before\0After');
  });

  it('should handle backslash escape', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('Path\\\\to\\\\file');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('Path\\to\\file');
  });

  it('should handle mixed escape sequences', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('\\x48\\u0065\\x6C\\u006C\\x6F\\n\\t\\0');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // Should decode all: hex (H, l, o), unicode (e, l), newline, tab, null
    expect(result.entries[0].msgid).toBe('Hello\n\t\0');
  });

  it('should handle basic quote usage without escaping', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `const text1 = t('Single quotes here');\n` +
        `const text2 = t("Double quotes here");\n` +
        'const text3 = t(`Backticks here`);\n'
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(3);
    // Entries are sorted alphabetically
    expect(result.entries[0].msgid).toBe('Backticks here');
    expect(result.entries[1].msgid).toBe('Double quotes here');
    expect(result.entries[2].msgid).toBe('Single quotes here');
  });

  it('should handle unknown escape sequences', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('\\a\\b\\c\\d');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    // Unknown escape sequences should default to the character itself
    expect(result.entries[0].msgid).toBe('abcd');
  });

  it('should handle newline escapes', async () => {
    const testFile = join(tmpDir, 'test.ts');
    await writeFile(
      testFile,
      `
      const text = t('Line 1\\nLine 2\\rLine 3\\tTabbed');
    `
    );

    const result = await extract({
      sources: [tmpDir],
      outFile: 'messages.pot',
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].msgid).toBe('Line 1\nLine 2\rLine 3\tTabbed');
  });
});
