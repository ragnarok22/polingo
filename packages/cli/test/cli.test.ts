import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { runCli } from '../src/index.js';

describe('runCli', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `polingo-cli-test-cli-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('help and version', () => {
    it('should show help when no command provided', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli([]);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
      consoleLogSpy.mockRestore();
    });

    it('should show help with --help flag', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['--help']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
      consoleLogSpy.mockRestore();
    });

    it('should show help with -h flag', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['-h']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
      consoleLogSpy.mockRestore();
    });

    it('should show version with --version flag', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['--version']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
      consoleLogSpy.mockRestore();
    });

    it('should show version with -v flag', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['-v']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
      consoleLogSpy.mockRestore();
    });
  });

  describe('extract command', () => {
    it('should run extract command successfully', async () => {
      const testFile = join(tmpDir, 'test.ts');
      await writeFile(testFile, `const msg = t('Hello');`);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli([
        'extract',
        tmpDir,
        '--out',
        join(tmpDir, 'messages.pot'),
        '--cwd',
        tmpDir,
      ]);

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Extracted'));
      consoleLogSpy.mockRestore();
    });

    it('should show extract help with --help', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['extract', '--help']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('extract'));
      consoleLogSpy.mockRestore();
    });

    it('should use default source directory', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const exitCode = await runCli([
        'extract',
        '--out',
        join(tmpDir, 'messages.pot'),
        '--cwd',
        tmpDir,
      ]);

      expect(exitCode).toBe(0);
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle --quiet flag', async () => {
      const testFile = join(tmpDir, 'test.ts');
      await writeFile(testFile, `const msg = t('Hello');`);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli([
        'extract',
        tmpDir,
        '--out',
        join(tmpDir, 'messages.pot'),
        '--cwd',
        tmpDir,
        '--quiet',
      ]);

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('should handle --dry-run flag', async () => {
      const testFile = join(tmpDir, 'test.ts');
      await writeFile(testFile, `const msg = t('Hello');`);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli([
        'extract',
        tmpDir,
        '--out',
        join(tmpDir, 'messages.pot'),
        '--cwd',
        tmpDir,
        '--dry-run',
      ]);

      expect(exitCode).toBe(0);
      consoleLogSpy.mockRestore();
    });
  });

  describe('compile command', () => {
    it('should run compile command successfully', async () => {
      const poFile = join(tmpDir, 'messages.po');
      await writeFile(
        poFile,
        `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hola"
`
      );

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['compile', tmpDir, '--cwd', tmpDir, '--format', 'json']);

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Compiled'));
      consoleLogSpy.mockRestore();
    });

    it('should show compile help with --help', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['compile', '--help']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('compile'));
      consoleLogSpy.mockRestore();
    });

    it('should handle missing catalogs', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const exitCode = await runCli(['compile', tmpDir, '--cwd', tmpDir]);

      expect(exitCode).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No translation catalogs')
      );
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle --format flag', async () => {
      const poFile = join(tmpDir, 'messages.po');
      await writeFile(
        poFile,
        `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hola"
`
      );

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['compile', tmpDir, '--cwd', tmpDir, '--format', 'mo']);

      expect(exitCode).toBe(0);
      consoleLogSpy.mockRestore();
    });

    it('should handle --pretty flag', async () => {
      const poFile = join(tmpDir, 'messages.po');
      await writeFile(
        poFile,
        `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hola"
`
      );

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli([
        'compile',
        tmpDir,
        '--cwd',
        tmpDir,
        '--format',
        'json',
        '--pretty',
      ]);

      expect(exitCode).toBe(0);
      consoleLogSpy.mockRestore();
    });
  });

  describe('validate command', () => {
    it('should run validate command successfully', async () => {
      const poFile = join(tmpDir, 'messages.po');
      await writeFile(
        poFile,
        `
msgid ""
msgstr ""

msgid "Hello"
msgstr "Hola"
`
      );

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['validate', tmpDir, '--cwd', tmpDir]);

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('passed validation'));
      consoleLogSpy.mockRestore();
    });

    it('should show validate help with --help', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['validate', '--help']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('validate'));
      consoleLogSpy.mockRestore();
    });

    it('should fail on validation errors', async () => {
      const poFile = join(tmpDir, 'messages.po');
      await writeFile(
        poFile,
        `
msgid ""
msgstr ""

msgid "Hello"
msgstr ""
`
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitCode = await runCli(['validate', tmpDir, '--cwd', tmpDir]);

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
      consoleErrorSpy.mockRestore();
    });

    it('should handle --strict flag', async () => {
      const poFile = join(tmpDir, 'messages.po');
      await writeFile(
        poFile,
        `
msgid ""
msgstr ""

#, fuzzy
msgid "Hello"
msgstr "Hola"
`
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitCode = await runCli(['validate', tmpDir, '--cwd', tmpDir, '--strict']);

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Fuzzy flag'));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('init command', () => {
    it('should run init command successfully with skipInstall', async () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      await writeFile(join(tmpDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli([
        'init',
        '--env',
        'web',
        '--cwd',
        tmpDir,
        '--languages',
        'en,es',
        '--skip-install',
      ]);

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Polingo initialized'));
      consoleLogSpy.mockRestore();
    });

    it('should show init help with --help', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitCode = await runCli(['init', '--help']);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('init'));
      consoleLogSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should show error for unknown command', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const exitCode = await runCli(['unknown-command']);

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Missing required flag value
      const exitCode = await runCli(['extract', '--out']);

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
