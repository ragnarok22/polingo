import { readFile } from 'fs/promises';
import { join, extname } from 'path';
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
    // Build path: ./locales/es/messages.po
    const basePath = join(this.directory, locale, domain);

    // Try .po first, then .mo
    let buffer: Buffer;
    let isPo = true;

    try {
      buffer = await readFile(`${basePath}.po`);
    } catch {
      try {
        buffer = await readFile(`${basePath}.mo`);
        isPo = false;
      } catch (error) {
        throw new Error(
          `Translation file not found for locale "${locale}" and domain "${domain}" at ${basePath}.po or ${basePath}.mo`
        );
      }
    }

    // Parse with gettext-parser
    const parsed = isPo ? po.parse(buffer) : mo.parse(buffer);

    // Convert to TranslationCatalog format
    return this.convertToTranslationCatalog(parsed);
  }

  /**
   * Convert gettext-parser output to TranslationCatalog format
   */
  private convertToTranslationCatalog(parsed: any): TranslationCatalog {
    const catalog: TranslationCatalog = {
      charset: parsed.charset || 'utf-8',
      headers: parsed.headers || {},
      translations: {},
    };

    // gettext-parser structure: { translations: { context: { msgid: {...} } } }
    const translations = parsed.translations || {};

    for (const [context, messages] of Object.entries(translations)) {
      catalog.translations[context] = {};

      for (const [msgid, msgData] of Object.entries(messages as Record<string, any>)) {
        // Skip empty msgid (metadata)
        if (msgid === '') continue;

        // Determine if this is a plural form
        const isPlural = !!msgData.msgid_plural;
        const msgstr = msgData.msgstr || [];

        const translation: Translation = {
          msgid,
          // Keep as array for plurals, convert to string for singular
          msgstr: isPlural ? msgstr : msgstr[0] || '',
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
