import { lstat, readFile } from 'fs/promises';
import { relative, resolve, sep } from 'path';
import { po, mo } from 'gettext-parser';
import type { TranslationLoader, TranslationCatalog, Translation } from '@polingo/core';

/**
 * Node.js file system loader for .po and .mo files
 *
 * Loads translation files from the filesystem and converts them to TranslationCatalog format
 */
export class NodeLoader implements TranslationLoader {
  constructor(private directory: string) {}

  /**
   * Load a translation catalog from the filesystem
   *
   * @param locale - Locale code (e.g., 'es', 'en')
   * @param domain - Domain name (e.g., 'messages')
   * @returns Parsed translation catalog
   *
   * @example
   * ```typescript
   * const loader = new NodeLoader('./locales');
   * const catalog = await loader.load('es', 'messages');
   * // Loads from: ./locales/es/messages.po (or .mo)
   * ```
   */
  async load(locale: string, domain: string): Promise<TranslationCatalog> {
    const baseDirectory = resolve(this.directory);
    const sanitizedLocale = sanitizePathSegment(locale, 'locale');
    const sanitizedDomain = sanitizePathSegment(domain, 'domain');
    const catalogBasePath = resolve(baseDirectory, sanitizedLocale, sanitizedDomain);
    assertWithinDirectory(baseDirectory, catalogBasePath);

    // Try .po first, then .mo
    const poPath = `${catalogBasePath}.po`;
    const moPath = `${catalogBasePath}.mo`;

    const poBuffer = await readSafeFile(poPath, baseDirectory);
    if (poBuffer) {
      const parsed = po.parse(poBuffer);
      return this.convertToTranslationCatalog(parsed);
    }

    const moBuffer = await readSafeFile(moPath, baseDirectory);
    if (moBuffer) {
      const parsed = mo.parse(moBuffer);
      return this.convertToTranslationCatalog(parsed);
    }

    throw new Error(
      `Translation file not found for locale "${locale}" and domain "${domain}"`
    );
  }

  /**
   * Convert gettext-parser output to TranslationCatalog format
   */
  private convertToTranslationCatalog(parsed: GettextParserOutput): TranslationCatalog {
    const catalog: TranslationCatalog = {
      charset: parsed.charset || 'utf-8',
      headers: parsed.headers || {},
      translations: {},
    };

    // gettext-parser structure: { translations: { context: { msgid: {...} } } }
    const translations = parsed.translations || {};

    for (const [context, messages] of Object.entries(translations)) {
      catalog.translations[context] = {};

      for (const [msgid, msgData] of Object.entries(messages)) {
        // Skip empty msgid (metadata)
        if (msgid === '') continue;

        // Determine if this is a plural form
        const isPlural = !!msgData.msgid_plural;
        const msgstr = msgData.msgstr || [];

        const translation: Translation = {
          msgid,
          // Keep as array for plurals, convert to string for singular
          msgstr: isPlural ? msgstr : (msgstr[0] ?? ''),
        };

        // Add optional fields
        if (msgData.msgctxt) {
          translation.msgctxt = msgData.msgctxt;
        }
        if (msgData.msgid_plural) {
          translation.msgid_plural = msgData.msgid_plural;
        }

        catalog.translations[context][msgid] = translation;
      }
    }

    return catalog;
  }
}

/**
 * Type definitions for gettext-parser output
 */
interface GettextMessage {
  msgid: string;
  msgstr: string[];
  msgid_plural?: string;
  msgctxt?: string;
}

interface GettextParserOutput {
  charset?: string;
  headers?: Record<string, string>;
  translations?: Record<string, Record<string, GettextMessage>>;
}

function sanitizePathSegment(value: string, segmentName: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${segmentName} value.`);
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new Error(
      `Unsupported characters in ${segmentName} "${value}". Only letters, numbers, ".", "_", and "-" are allowed.`
    );
  }

  if (trimmed.includes('..')) {
    throw new Error(
      `Invalid ${segmentName} "${value}". Parent directory traversal is not allowed.`
    );
  }

  return trimmed;
}

function assertWithinDirectory(baseDir: string, targetPath: string): void {
  const relativePath = relative(baseDir, targetPath);
  if (!relativePath || relativePath.startsWith('..') || relativePath.includes(`..${sep}`)) {
    throw new Error('Resolved catalog path escapes the configured directory.');
  }
}

async function readSafeFile(filePath: string, baseDir: string): Promise<Buffer | null> {
  const resolvedPath = resolve(filePath);
  assertWithinDirectory(baseDir, resolvedPath);

  try {
    const fileStat = await lstat(resolvedPath);
    // Reject symlinks first, then verify it's a regular file
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
      return null;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  return readFile(resolvedPath);
}
