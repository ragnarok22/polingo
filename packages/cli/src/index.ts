import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { po, mo } from 'gettext-parser';
import packageJson from '../package.json' assert { type: 'json' };

const DEFAULT_EXTRACT_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.svelte',
  '.vue',
  '.astro',
  '.md',
  '.mdx',
];

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/**
 * Shared structure for messages discovered during extraction
 */
interface PendingMessage {
  msgid: string;
  msgctxt?: string;
  msgidPlural?: string;
  references: Set<string>;
}

export interface ExtractEntry {
  msgid: string;
  msgctxt?: string;
  msgidPlural?: string;
  references: string[];
}

export interface ExtractOptions {
  sources: string[];
  outFile: string;
  cwd?: string;
  extensions?: string[];
  dryRun?: boolean;
  quiet?: boolean;
}

export interface ExtractResult {
  entries: ExtractEntry[];
  outFile: string;
  skipped: string[];
}

export interface CompileOptions {
  inputs: string[];
  outDir?: string;
  format?: 'json' | 'mo';
  cwd?: string;
  pretty?: boolean;
}

export interface CompileArtifact {
  inputFile: string;
  outputFile: string;
  format: 'json' | 'mo';
}

export interface CompileResult {
  artifacts: CompileArtifact[];
  skipped: string[];
}

export interface ValidateOptions {
  inputs: string[];
  cwd?: string;
  strict?: boolean;
}

export interface ValidationIssue {
  file: string;
  context: string;
  msgid: string;
  message: string;
}

export interface ValidateResult {
  issues: ValidationIssue[];
}

/**
 * Main entry point wired by the executable shim
 */
export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    printGlobalHelp();
    return 0;
  }

  if (command === '--version' || command === '-v') {
    const version = (packageJson as { version?: string }).version ?? '0.0.0';
    console.log(version);
    return 0;
  }

  try {
    switch (command) {
      case 'extract': {
        const options = parseExtractArgs(rest);
        if (options.showHelp) {
          printExtractHelp();
          return 0;
        }
        const result = await extract(options);
        if (!options.quiet) {
          console.log(`Extracted ${result.entries.length} messages into ${result.outFile}`);
          if (result.skipped.length > 0) {
            console.warn(`Skipped ${result.skipped.length} path(s): ${result.skipped.join(', ')}`);
          }
        }
        return 0;
      }
      case 'compile': {
        const options = parseCompileArgs(rest);
        if (options.showHelp) {
          printCompileHelp();
          return 0;
        }
        const result = await compileCatalogs(options);
        if (result.artifacts.length === 0) {
          console.warn('No translation catalogs matched the provided inputs.');
        } else {
          for (const artifact of result.artifacts) {
            console.log(`Compiled ${artifact.inputFile} -> ${artifact.outputFile}`);
          }
        }
        if (result.skipped.length > 0) {
          console.warn(`Skipped ${result.skipped.length} path(s): ${result.skipped.join(', ')}`);
        }
        return result.artifacts.length === 0 ? 1 : 0;
      }
      case 'validate': {
        const options = parseValidateArgs(rest);
        if (options.showHelp) {
          printValidateHelp();
          return 0;
        }
        const result = await validateCatalogs(options);
        if (result.issues.length === 0) {
          console.log('All catalogs passed validation.');
          return 0;
        }

        for (const issue of result.issues) {
          console.error(`${issue.file}: ${issue.context} "${issue.msgid}" -> ${issue.message}`);
        }
        console.error(`Validation failed with ${result.issues.length} issue(s).`);
        return 1;
      }
      default:
        console.error(`Unknown command: ${command}`);
        printGlobalHelp();
        return 1;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    return 1;
  }
}

interface ParsedExtractArgs extends ExtractOptions {
  showHelp?: boolean;
}

interface ParsedCompileArgs extends CompileOptions {
  showHelp?: boolean;
}

interface ParsedValidateArgs extends ValidateOptions {
  showHelp?: boolean;
}

function parseExtractArgs(args: string[]): ParsedExtractArgs {
  const options: ParsedExtractArgs = {
    sources: [],
    outFile: 'messages.pot',
    cwd: process.cwd(),
    extensions: [...DEFAULT_EXTRACT_EXTENSIONS],
    dryRun: false,
    quiet: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }
    switch (arg) {
      case '--help':
      case '-h':
        return { ...options, showHelp: true };
      case '--out':
      case '-o':
        options.outFile = readNextValue(args, ++index, arg);
        break;
      case '--cwd':
        options.cwd = path.resolve(readNextValue(args, ++index, arg));
        break;
      case '--ext':
      case '--extensions': {
        const value = readNextValue(args, ++index, arg);
        options.extensions = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map(normalizeExtension);
        break;
      }
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      default:
        options.sources.push(arg);
    }
  }

  if (options.sources.length === 0) {
    options.sources.push('src');
  }

  return options;
}

function parseCompileArgs(args: string[]): ParsedCompileArgs {
  const options: ParsedCompileArgs = {
    inputs: [],
    cwd: process.cwd(),
    outDir: undefined,
    format: 'json',
    pretty: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }
    switch (arg) {
      case '--help':
      case '-h':
        return { ...options, showHelp: true };
      case '--cwd':
        options.cwd = path.resolve(readNextValue(args, ++index, arg));
        break;
      case '--out':
      case '-o':
        options.outDir = readNextValue(args, ++index, arg);
        break;
      case '--format':
      case '-f': {
        const value = readNextValue(args, ++index, arg);
        if (value !== 'json' && value !== 'mo') {
          throw new Error(`Unsupported format "${value}". Use "json" or "mo".`);
        }
        options.format = value;
        break;
      }
      case '--pretty':
        options.pretty = true;
        break;
      default:
        options.inputs.push(arg);
    }
  }

  if (options.inputs.length === 0) {
    options.inputs.push('locales');
  }

  return options;
}

function parseValidateArgs(args: string[]): ParsedValidateArgs {
  const options: ParsedValidateArgs = {
    inputs: [],
    cwd: process.cwd(),
    strict: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }
    switch (arg) {
      case '--help':
      case '-h':
        return { ...options, showHelp: true };
      case '--cwd':
        options.cwd = path.resolve(readNextValue(args, ++index, arg));
        break;
      case '--strict':
        options.strict = true;
        break;
      default:
        options.inputs.push(arg);
    }
  }

  if (options.inputs.length === 0) {
    options.inputs.push('locales');
  }

  return options;
}

function readNextValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

export async function extract(options: ExtractOptions): Promise<ExtractResult> {
  const cwd = options.cwd ?? process.cwd();
  const extensions = new Set(
    (options.extensions ?? DEFAULT_EXTRACT_EXTENSIONS).map(normalizeExtension)
  );

  const { files, skipped } = await collectFiles(options.sources, cwd, extensions);
  const messages = new Map<string, PendingMessage>();

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const relativePath = path.relative(cwd, file) || path.basename(file);
    const entries = extractFromContent(content, relativePath);

    for (const entry of entries) {
      const key = buildMessageKey(entry.msgctxt, entry.msgid, entry.msgidPlural);
      const existing = messages.get(key);

      if (existing) {
        for (const reference of entry.references) {
          existing.references.add(reference);
        }
      } else {
        messages.set(key, {
          msgid: entry.msgid,
          msgctxt: entry.msgctxt,
          msgidPlural: entry.msgidPlural,
          references: new Set(entry.references),
        });
      }
    }
  }

  const entries: ExtractEntry[] = Array.from(messages.values())
    .map((entry) => ({
      msgid: entry.msgid,
      msgctxt: entry.msgctxt,
      msgidPlural: entry.msgidPlural,
      references: Array.from(entry.references).sort(),
    }))
    .sort((a, b) => {
      const contextA = a.msgctxt ?? '';
      const contextB = b.msgctxt ?? '';
      if (contextA !== contextB) {
        return contextA.localeCompare(contextB);
      }
      return a.msgid.localeCompare(b.msgid);
    });

  const outFile = path.resolve(cwd, options.outFile);

  if (!options.dryRun) {
    await mkdir(path.dirname(outFile), { recursive: true });
    const potContent = renderPot(entries);
    await writeFile(outFile, potContent, 'utf8');
  }

  return { entries, outFile, skipped };
}

export async function compileCatalogs(options: CompileOptions): Promise<CompileResult> {
  const cwd = options.cwd ?? process.cwd();
  const format = options.format ?? 'json';
  const { files, skipped } = await collectFiles(
    options.inputs,
    cwd,
    new Set(['.po']),
    format === 'mo'
  );

  if (files.length === 0) {
    return { artifacts: [], skipped };
  }

  const artifacts: CompileArtifact[] = [];

  for (const file of files) {
    const buffer = await readFile(file);
    const parsed = po.parse(buffer);

    const relativePath = path.relative(cwd, file) || path.basename(file);
    const baseName = path.basename(relativePath, path.extname(relativePath));
    const targetDirectory = resolveOutputDirectory(options.outDir, file, cwd);

    await mkdir(targetDirectory, { recursive: true });

    if (format === 'json') {
      const catalog = convertToTranslationCatalog(parsed);
      const outputPath = path.join(targetDirectory, `${baseName}.json`);
      const payload = options.pretty
        ? JSON.stringify(catalog, null, 2) + '\n'
        : JSON.stringify(catalog);
      await writeFile(outputPath, payload, 'utf8');
      artifacts.push({
        inputFile: path.resolve(file),
        outputFile: outputPath,
        format: 'json',
      });
    } else {
      const outputPath = path.join(targetDirectory, `${baseName}.mo`);
      const compiled = mo.compile(parsed);
      await writeFile(outputPath, compiled);
      artifacts.push({
        inputFile: path.resolve(file),
        outputFile: outputPath,
        format: 'mo',
      });
    }
  }

  return { artifacts, skipped };
}

export async function validateCatalogs(options: ValidateOptions): Promise<ValidateResult> {
  const cwd = options.cwd ?? process.cwd();
  const { files, skipped } = await collectFiles(options.inputs, cwd, new Set(['.po']));

  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} path(s): ${skipped.join(', ')}`);
  }

  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const buffer = await readFile(file);
    const parsed = po.parse(buffer);
    const relativePath = path.relative(cwd, file) || path.basename(file);

    const translations = parsed.translations ?? {};
    for (const [context, messages] of Object.entries(translations)) {
      for (const [msgid, entry] of Object.entries(messages)) {
        if (!msgid) continue;
        const contextLabel = context || 'default';
        const msgstr = entry.msgstr || [];

        if (entry.msgid_plural) {
          const pluralMissing = msgstr.some((value) => !value || !value.trim());
          if (pluralMissing) {
            issues.push({
              file: relativePath,
              context: contextLabel,
              msgid: entry.msgid,
              message: 'Missing plural translation',
            });
          }
          continue;
        }

        if (!msgstr[0] || !msgstr[0].trim()) {
          issues.push({
            file: relativePath,
            context: contextLabel,
            msgid: entry.msgid,
            message: 'Missing translation',
          });
        }

        if (options.strict && entry.comments?.flag?.includes('fuzzy')) {
          issues.push({
            file: relativePath,
            context: contextLabel,
            msgid: entry.msgid,
            message: 'Fuzzy flag present under --strict mode',
          });
        }
      }
    }
  }

  return { issues };
}

async function collectFiles(
  inputs: string[],
  cwd: string,
  extensions: Set<string>,
  includeMo = false
): Promise<{ files: string[]; skipped: string[] }> {
  const files: string[] = [];
  const skipped: string[] = [];

  for (const input of inputs) {
    const hasWildcard = input.includes('*');
    if (hasWildcard) {
      skipped.push(input);
      continue;
    }

    const fullPath = path.resolve(cwd, input);

    try {
      const fileStat = await stat(fullPath);
      if (fileStat.isDirectory()) {
        await walkDirectory(fullPath, extensions, files, includeMo);
      } else if (fileStat.isFile()) {
        const extension = normalizeExtension(path.extname(fullPath));
        if (extensions.has(extension) || (includeMo && extension === '.mo')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        skipped.push(input);
      } else {
        throw error;
      }
    }
  }

  return { files, skipped };
}

async function walkDirectory(
  directory: string,
  extensions: Set<string>,
  accumulator: string[],
  includeMo: boolean
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await walkDirectory(path.join(directory, entry.name), extensions, accumulator, includeMo);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = normalizeExtension(path.extname(entry.name));
    if (extensions.has(extension) || (includeMo && extension === '.mo')) {
      accumulator.push(path.join(directory, entry.name));
    }
  }
}

function normalizeExtension(extension: string): string {
  return extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
}

interface RawExtraction {
  msgid: string;
  msgctxt?: string;
  msgidPlural?: string;
  references: string[];
}

function extractFromContent(source: string, relativePath: string): RawExtraction[] {
  const matches: RawExtraction[] = [];

  const record = (msgid: string, line: number, context?: string, msgidPlural?: string) => {
    matches.push({
      msgid,
      msgctxt: context,
      msgidPlural,
      references: [`${relativePath}:${line}`],
    });
  };

  const tnpPattern =
    /\btnp\s*\(\s*(['"`])([\s\S]+?)\1\s*,\s*(['"`])([\s\S]+?)\3\s*,\s*(['"`])([\s\S]+?)\5/g;
  const tnPattern = /\btn\s*\(\s*(['"`])([\s\S]+?)\1\s*,\s*(['"`])([\s\S]+?)\3/g;
  const tpPattern = /\btp\s*\(\s*(['"`])([\s\S]+?)\1\s*,\s*(['"`])([\s\S]+?)\3/g;
  const tPattern = /\bt\s*\(\s*(['"`])([\s\S]+?)\1/g;

  matchPattern(source, tnpPattern, (match, index) => {
    const contextRaw = match[2];
    const singularRaw = match[4];
    const pluralRaw = match[6];
    if (!contextRaw || !singularRaw || !pluralRaw) {
      return;
    }
    const context = unescapeLiteral(contextRaw);
    const singular = unescapeLiteral(singularRaw);
    const plural = unescapeLiteral(pluralRaw);
    record(singular, computeLine(source, index), context, plural);
  });

  matchPattern(source, tnPattern, (match, index) => {
    const singularRaw = match[2];
    const pluralRaw = match[4];
    if (!singularRaw || !pluralRaw) {
      return;
    }
    const singular = unescapeLiteral(singularRaw);
    const plural = unescapeLiteral(pluralRaw);
    record(singular, computeLine(source, index), undefined, plural);
  });

  matchPattern(source, tpPattern, (match, index) => {
    const contextRaw = match[2];
    const singularRaw = match[4];
    if (!contextRaw || !singularRaw) {
      return;
    }
    const context = unescapeLiteral(contextRaw);
    const singular = unescapeLiteral(singularRaw);
    record(singular, computeLine(source, index), context);
  });

  matchPattern(source, tPattern, (match, index) => {
    const singularRaw = match[2];
    if (!singularRaw) {
      return;
    }
    const singular = unescapeLiteral(singularRaw);
    record(singular, computeLine(source, index));
  });

  return matches;
}

function matchPattern(
  source: string,
  pattern: RegExp,
  onMatch: (match: RegExpExecArray, index: number) => void
): void {
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    onMatch(match, match.index);
  }
}

function computeLine(source: string, index: number): number {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (source.charCodeAt(position) === 10) {
      line += 1;
    }
  }
  return line;
}

function buildMessageKey(context: string | undefined, msgid: string, plural?: string): string {
  return `${context ?? ''}::${msgid}::${plural ?? ''}`;
}

function renderPot(entries: ExtractEntry[]): string {
  const lines: string[] = [];

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').replace(/\..+/, '');

  lines.push('msgid ""');
  lines.push('msgstr ""');
  lines.push(`"Project-Id-Version: PACKAGE VERSION\\n"`);
  lines.push(`"POT-Creation-Date: ${timestamp}\\n"`);
  lines.push(`"Language: \\n"`);
  lines.push(`"MIME-Version: 1.0\\n"`);
  lines.push(`"Content-Type: text/plain; charset=UTF-8\\n"`);
  lines.push(`"Content-Transfer-Encoding: 8bit\\n"`);
  lines.push('');

  for (const entry of entries) {
    if (entry.references.length > 0) {
      lines.push(`#: ${entry.references.join(' ')}`);
    }
    if (entry.msgctxt) {
      lines.push(`msgctxt ${formatPoString(entry.msgctxt)}`);
    }
    lines.push(`msgid ${formatPoString(entry.msgid)}`);

    if (entry.msgidPlural) {
      lines.push(`msgid_plural ${formatPoString(entry.msgidPlural)}`);
      lines.push(`msgstr[0] ""`);
      lines.push(`msgstr[1] ""`);
    } else {
      lines.push(`msgstr ""`);
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function formatPoString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

function unescapeLiteral(value: string): string {
  let result = '';

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char !== '\\') {
      result += char;
      continue;
    }

    const next = value[++index];
    if (next === undefined) {
      result += '\\';
      break;
    }

    switch (next) {
      case 'n':
        result += '\n';
        break;
      case 'r':
        result += '\r';
        break;
      case 't':
        result += '\t';
        break;
      case '"':
        result += '"';
        break;
      case "'":
        result += "'";
        break;
      case '`':
        result += '`';
        break;
      case '\\':
        result += '\\';
        break;
      case '0':
        result += '\0';
        break;
      case 'x': {
        const hex = value.slice(index + 1, index + 3);
        if (hex.length === 2 && /^[0-9a-fA-F]+$/.test(hex)) {
          result += String.fromCharCode(Number.parseInt(hex, 16));
          index += 2;
        } else {
          result += `\\${next}`;
        }
        break;
      }
      case 'u': {
        const unicode = value.slice(index + 1, index + 5);
        if (unicode.length === 4 && /^[0-9a-fA-F]+$/.test(unicode)) {
          result += String.fromCharCode(Number.parseInt(unicode, 16));
          index += 4;
        } else {
          result += `\\${next}`;
        }
        break;
      }
      default:
        result += next;
    }
  }

  return result;
}

function convertToTranslationCatalog(parsed: GettextParserOutput): TranslationCatalog {
  const catalog: TranslationCatalog = {
    charset: parsed.charset || 'utf-8',
    headers: parsed.headers || {},
    translations: {},
  };

  const translations = parsed.translations || {};

  for (const [context, messages] of Object.entries(translations)) {
    catalog.translations[context] = {};
    for (const [msgid, message] of Object.entries(messages)) {
      if (!msgid) continue;

      const isPlural = Boolean(message.msgid_plural);
      const msgstr = message.msgstr || [];

      const translation: Translation = {
        msgid,
        msgstr: isPlural ? msgstr : (msgstr[0] ?? ''),
      };

      if (message.msgctxt) {
        translation.msgctxt = message.msgctxt;
      }
      if (message.msgid_plural) {
        translation.msgid_plural = message.msgid_plural;
      }

      catalog.translations[context][msgid] = translation;
    }
  }

  return catalog;
}

function resolveOutputDirectory(
  outDir: string | undefined,
  inputFile: string,
  cwd: string
): string {
  if (outDir) {
    const full = path.isAbsolute(outDir) ? outDir : path.resolve(cwd, outDir);
    return full;
  }

  return path.dirname(inputFile);
}

function printGlobalHelp(): void {
  console.log(`Usage: polingo <command> [options]

Commands:
  extract   Scan source files and extract message IDs into a POT catalog
  compile   Compile .po files into runtime artifacts
  validate  Lint .po files for missing translations

Run 'polingo <command> --help' for detailed usage of a command.`);
}

function printExtractHelp(): void {
  console.log(`Usage: polingo extract [paths...] [options]

Options:
  -o, --out <file>        Output POT file (default: messages.pot)
      --cwd <dir>         Working directory for relative paths
      --extensions <ext>  Comma-separated list of file extensions to scan
      --dry-run           Print extracted strings without writing to disk
      --quiet             Suppress completion message
  -h, --help              Show this help text`);
}

function printCompileHelp(): void {
  console.log(`Usage: polingo compile [paths...] [options]

Options:
  -f, --format <type>   Output format: json (default) or mo
  -o, --out <dir>       Destination directory. Defaults to alongside each file
      --pretty          Pretty-print JSON output
      --cwd <dir>       Working directory for relative paths
  -h, --help            Show this help text`);
}

function printValidateHelp(): void {
  console.log(`Usage: polingo validate [paths...] [options]

Options:
      --strict        Fail catalogs marked as fuzzy
      --cwd <dir>     Working directory for relative paths
  -h, --help          Show this help text`);
}

interface Translation {
  msgid: string;
  msgstr: string | string[];
  msgctxt?: string;
  msgid_plural?: string;
}

interface TranslationCatalog {
  charset: string;
  headers: Record<string, string>;
  translations: Record<string, Record<string, Translation>>;
}

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
  comments?: Record<string, unknown>;
}
