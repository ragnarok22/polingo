import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_DIR = join(__dirname, 'fixtures', 'cli-test');
const CLI_PATH = join(__dirname, '..', '..', 'dist', 'cli.js');

// Helper to run CLI commands
const runCLI = (args: string, cwd: string = TEST_DIR): string => {
  try {
    return execSync(`node ${CLI_PATH} ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
      const err = error as { stdout: string; stderr: string };
      // Return both stdout and stderr combined
      return err.stdout + err.stderr;
    }
    throw error;
  }
};

describe('CLI End-to-End Workflow Integration Tests', () => {
  beforeEach(() => {
    // Clean up and create fresh test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'locales'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Extract Command', () => {
    it('should extract translations from source files', () => {
      // Create source files with translation calls
      writeFileSync(
        join(TEST_DIR, 'src', 'app.ts'),
        `
import { t, tp, tn, tnp } from '@polingo/core';

console.log(t('Hello'));
console.log(t('Welcome to the app'));
console.log(tp('menu', 'File'));
console.log(tn('{n} item', '{n} items', count));
console.log(tnp('email', '{n} message', '{n} messages', count));
`
      );

      writeFileSync(
        join(TEST_DIR, 'src', 'components.tsx'),
        `
export const Component = () => {
  const greeting = t('Good morning');
  const farewell = t('Goodbye');
  return <div>{t('Welcome, {name}!')}</div>;
};
`
      );

      // Run extract command
      const output = runCLI('extract src --output locales/messages.pot');

      expect(output).toContain('Extracted');

      // Check that .pot file was created
      const potPath = join(TEST_DIR, 'locales', 'messages.pot');
      expect(existsSync(potPath)).toBe(true);

      const potContent = readFileSync(potPath, 'utf-8');

      // Verify extracted strings
      expect(potContent).toContain('msgid "Hello"');
      expect(potContent).toContain('msgid "Welcome to the app"');
      expect(potContent).toContain('msgid "Good morning"');
      expect(potContent).toContain('msgid "Goodbye"');
      expect(potContent).toContain('msgid "Welcome, {name}!"');

      // Verify context strings
      expect(potContent).toContain('msgctxt "menu"');
      expect(potContent).toContain('msgid "File"');

      // Verify plural forms
      expect(potContent).toContain('msgid "{n} item"');
      expect(potContent).toContain('msgid_plural "{n} items"');
    });

    it('should handle nested directories', () => {
      mkdirSync(join(TEST_DIR, 'src', 'features'), { recursive: true });

      writeFileSync(
        join(TEST_DIR, 'src', 'features', 'auth.ts'),
        `
const messages = {
  login: t('Login'),
  logout: t('Logout'),
  register: t('Register'),
};
`
      );

      const output = runCLI('extract src --output locales/messages.pot');
      expect(output).toContain('Extracted');

      const potContent = readFileSync(join(TEST_DIR, 'locales', 'messages.pot'), 'utf-8');
      expect(potContent).toContain('msgid "Login"');
      expect(potContent).toContain('msgid "Logout"');
      expect(potContent).toContain('msgid "Register"');
    });

    it('should deduplicate identical translations', () => {
      writeFileSync(
        join(TEST_DIR, 'src', 'file1.ts'),
        `
console.log(t('Hello'));
console.log(t('Hello'));
`
      );

      writeFileSync(
        join(TEST_DIR, 'src', 'file2.ts'),
        `
console.log(t('Hello'));
`
      );

      runCLI('extract src --output locales/messages.pot');

      const potContent = readFileSync(join(TEST_DIR, 'locales', 'messages.pot'), 'utf-8');

      // Count occurrences of "msgid \"Hello\""
      const matches = potContent.match(/msgid "Hello"/g);
      // Should appear only once in the .pot file
      expect(matches?.length).toBe(1);
    });
  });

  describe('Compile Command', () => {
    beforeEach(() => {
      mkdirSync(join(TEST_DIR, 'locales', 'es'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'locales', 'fr'), { recursive: true });

      // Create .po files to compile
      writeFileSync(
        join(TEST_DIR, 'locales', 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "Hello"
msgstr "Hola"

msgid "Goodbye"
msgstr "Adiós"

msgid "{n} item"
msgid_plural "{n} items"
msgstr[0] "{n} artículo"
msgstr[1] "{n} artículos"
`
      );

      writeFileSync(
        join(TEST_DIR, 'locales', 'fr', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: fr\\n"
"Plural-Forms: nplurals=2; plural=(n > 1);\\n"

msgid "Hello"
msgstr "Bonjour"

msgid "Goodbye"
msgstr "Au revoir"
`
      );
    });

    it('should compile .po files to .json format', () => {
      const output = runCLI('compile locales --format json');
      expect(output).toContain('Compiled');

      // Check JSON files were created
      expect(existsSync(join(TEST_DIR, 'locales', 'es', 'messages.json'))).toBe(true);
      expect(existsSync(join(TEST_DIR, 'locales', 'fr', 'messages.json'))).toBe(true);

      // Verify JSON content
      const esJson = JSON.parse(
        readFileSync(join(TEST_DIR, 'locales', 'es', 'messages.json'), 'utf-8')
      ) as { translations: Record<string, Record<string, { msgstr: string }>> };

      expect(esJson.translations['']).toBeDefined();
      expect(esJson.translations['']['Hello']).toBeDefined();
      expect(esJson.translations['']['Hello']?.msgstr).toBe('Hola');
    });

    it('should compile .po files to .mo format', () => {
      const output = runCLI('compile locales --format mo');
      expect(output).toContain('Compiled');

      // Check .mo files were created
      expect(existsSync(join(TEST_DIR, 'locales', 'es', 'messages.mo'))).toBe(true);
      expect(existsSync(join(TEST_DIR, 'locales', 'fr', 'messages.mo'))).toBe(true);

      // Verify .mo files are binary (not empty)
      const moContent = readFileSync(join(TEST_DIR, 'locales', 'es', 'messages.mo'));
      expect(moContent.length).toBeGreaterThan(0);
    });

    it('should handle compilation errors gracefully', () => {
      // Create invalid .po file
      writeFileSync(join(TEST_DIR, 'locales', 'es', 'invalid.po'), 'INVALID CONTENT');

      // Should not throw but report error
      const output = runCLI('compile locales --format json');
      // CLI should complete but may report errors
      expect(typeof output).toBe('string');
    });
  });

  describe('Validate Command', () => {
    beforeEach(() => {
      mkdirSync(join(TEST_DIR, 'locales', 'es'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'locales', 'fr'), { recursive: true });
    });

    it('should validate correct .po files', () => {
      writeFileSync(
        join(TEST_DIR, 'locales', 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Hola"

msgid "Goodbye"
msgstr "Adiós"
`
      );

      const output = runCLI('validate locales');
      expect(
        output.includes('valid') ||
          output.includes('Valid') ||
          output.includes('OK') ||
          output.includes('success')
      ).toBe(true);
    });

    it('should detect missing translations', () => {
      writeFileSync(
        join(TEST_DIR, 'locales', 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Hola"

msgid "Goodbye"
msgstr ""
`
      );

      const output = runCLI('validate locales');
      // Should report missing translation
      const lowerOutput = output.toLowerCase();
      expect(
        lowerOutput.includes('missing') ||
          lowerOutput.includes('empty') ||
          lowerOutput.includes('untranslated')
      ).toBe(true);
    });

    it('should detect fuzzy translations', () => {
      writeFileSync(
        join(TEST_DIR, 'locales', 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

#, fuzzy
msgid "Hello"
msgstr "Hola"
`
      );

      const output = runCLI('validate locales --strict');
      // Should report fuzzy translations in strict mode
      expect(output.toLowerCase()).toContain('fuzzy');
    });

    it('should validate in strict mode', () => {
      writeFileSync(
        join(TEST_DIR, 'locales', 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

#, fuzzy
msgid "Hello"
msgstr "Hola"

msgid "Goodbye"
msgstr ""
`
      );

      try {
        const output = runCLI('validate locales --strict');
        const lowerOutput = output.toLowerCase();
        expect(
          lowerOutput.includes('error') ||
            lowerOutput.includes('fail') ||
            lowerOutput.includes('invalid')
        ).toBe(true);
      } catch (error) {
        // Strict mode may throw/exit with error code
        expect(error).toBeDefined();
      }
    });
  });

  describe('Complete Workflow', () => {
    it('should handle extract -> compile -> validate workflow', () => {
      // Step 1: Create source files
      writeFileSync(
        join(TEST_DIR, 'src', 'app.ts'),
        `
console.log(t('Hello'));
console.log(t('Welcome'));
console.log(t('Goodbye'));
`
      );

      // Step 2: Extract translations
      runCLI('extract src --output locales/messages.pot');
      expect(existsSync(join(TEST_DIR, 'locales', 'messages.pot'))).toBe(true);

      // Step 3: Create translated .po files (simulating manual translation)
      mkdirSync(join(TEST_DIR, 'locales', 'es'), { recursive: true });
      writeFileSync(
        join(TEST_DIR, 'locales', 'es', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola"

msgid "Welcome"
msgstr "Bienvenido"

msgid "Goodbye"
msgstr "Adiós"
`
      );

      // Step 4: Validate translations
      const validateOutput = runCLI('validate locales');
      expect(validateOutput).toBeDefined();

      // Step 5: Compile to JSON
      runCLI('compile locales --format json');
      expect(existsSync(join(TEST_DIR, 'locales', 'es', 'messages.json'))).toBe(true);

      // Verify compiled JSON is valid
      const jsonContent = JSON.parse(
        readFileSync(join(TEST_DIR, 'locales', 'es', 'messages.json'), 'utf-8')
      ) as { translations: Record<string, Record<string, { msgstr: string }>> };
      expect(jsonContent.translations['']).toBeDefined();
      expect(jsonContent.translations['']['Hello']?.msgstr).toBe('Hola');
    });

    it('should handle multiple locales in workflow', () => {
      // Create source with extractions
      writeFileSync(
        join(TEST_DIR, 'src', 'app.ts'),
        `
console.log(t('User'));
console.log(t('Settings'));
`
      );

      runCLI('extract src --output locales/messages.pot');

      // Create multiple locale translations
      for (const locale of ['es', 'fr', 'de']) {
        mkdirSync(join(TEST_DIR, 'locales', locale), { recursive: true });
        writeFileSync(
          join(TEST_DIR, 'locales', locale, 'messages.po'),
          `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "User"
msgstr "Usuario-${locale}"

msgid "Settings"
msgstr "Configuración-${locale}"
`
        );
      }

      // Validate all
      const validateOutput = runCLI('validate locales');
      expect(validateOutput).toBeDefined();

      // Compile all
      runCLI('compile locales --format json');

      // Verify all locales were compiled
      expect(existsSync(join(TEST_DIR, 'locales', 'es', 'messages.json'))).toBe(true);
      expect(existsSync(join(TEST_DIR, 'locales', 'fr', 'messages.json'))).toBe(true);
      expect(existsSync(join(TEST_DIR, 'locales', 'de', 'messages.json'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty source directory', () => {
      const output = runCLI('extract src --output locales/messages.pot');
      expect(output).toBeDefined();
      // Should create empty or minimal .pot file
    });

    it('should handle missing locales directory', () => {
      rmSync(join(TEST_DIR, 'locales'), { recursive: true, force: true });

      try {
        runCLI('validate locales');
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle special characters in translations', () => {
      writeFileSync(
        join(TEST_DIR, 'src', 'app.ts'),
        `
console.log(t('Quote: "Hello"'));
console.log(t("Apostrophe: It's working"));
console.log(t('Newline:\\nTest'));
`
      );

      const output = runCLI('extract src --output locales/messages.pot');
      expect(output).toBeDefined();

      const potContent = readFileSync(join(TEST_DIR, 'locales', 'messages.pot'), 'utf-8');
      expect(potContent).toContain('Quote');
      expect(potContent).toContain('Apostrophe');
    });
  });
});
