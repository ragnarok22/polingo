import { readdir, readFile, stat, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { po, mo } from 'gettext-parser';
import type { GetTextTranslations } from 'gettext-parser';
import { distance } from 'fastest-levenshtein';
import packageJson from '../package.json' with { type: 'json' };

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
  localesDir?: string;
  languages?: string[];
  defaultLocale?: string;
  keepTemplate?: boolean;
  fuzzy?: boolean;
  fuzzyThreshold?: number;
}

export interface ExtractResult {
  entries: ExtractEntry[];
  outFile: string;
  skipped: string[];
  templateRemoved: boolean;
}

interface LocaleSyncOptions {
  cwd: string;
  localesDir: string;
  potFile: string;
  languages?: string[];
  defaultLocale?: string;
  fuzzy?: boolean;
  fuzzyThreshold?: number;
}

interface LocaleSyncSummary {
  created: string[];
  updated: string[];
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

export interface InitOptions {
  environment?: 'react' | 'vue' | 'web' | 'node';
  cwd?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  localesDir?: string;
  languages?: string[];
  skipInstall?: boolean;
}

export interface InitResult {
  environment: string;
  packagesInstalled: string[];
  scriptsAdded: string[];
  localesCreated: string[];
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
      case 'init': {
        const options = parseInitArgs(rest);
        if (options.showHelp) {
          printInitHelp();
          return 0;
        }
        const result = await init(options);
        console.log(`\nPolingo initialized for ${result.environment}!`);
        if (result.packagesInstalled.length > 0) {
          console.log(`Installed packages: ${result.packagesInstalled.join(', ')}`);
        }
        if (result.scriptsAdded.length > 0) {
          console.log(`Added scripts: ${result.scriptsAdded.join(', ')}`);
        }
        if (result.localesCreated.length > 0) {
          console.log(`Created locale directories: ${result.localesCreated.join(', ')}`);
        }
        console.log('\nYou can now run:');
        console.log('  npm run i18n:extract  - Extract translation strings');
        console.log('  npm run i18n:compile  - Compile .po files');
        console.log('  npm run i18n:validate - Validate translation catalogs');
        return 0;
      }
      case 'extract': {
        const options = parseExtractArgs(rest);
        if (options.showHelp) {
          printExtractHelp();
          return 0;
        }
        const result = await extract(options);
        if (!options.quiet) {
          const removalNote = result.templateRemoved ? ' (template removed)' : '';
          console.log(
            `Extracted ${result.entries.length} messages into ${result.outFile}${removalNote}`
          );
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

interface ParsedInitArgs extends InitOptions {
  showHelp?: boolean;
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

function parseInitArgs(args: string[]): ParsedInitArgs {
  const options: ParsedInitArgs = {
    cwd: process.cwd(),
    packageManager: undefined,
    localesDir: 'locales',
    languages: ['en'],
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
      case '--env':
      case '--environment':
      case '-e': {
        const value = readNextValue(args, ++index, arg);
        if (value !== 'react' && value !== 'vue' && value !== 'web' && value !== 'node') {
          throw new Error(`Invalid environment "${value}". Use "react", "vue", "web", or "node".`);
        }
        options.environment = value;
        break;
      }
      case '--cwd':
        options.cwd = path.resolve(readNextValue(args, ++index, arg));
        break;
      case '--pm':
      case '--package-manager': {
        const value = readNextValue(args, ++index, arg);
        if (value !== 'npm' && value !== 'yarn' && value !== 'pnpm') {
          throw new Error(`Invalid package manager "${value}". Use "npm", "yarn", or "pnpm".`);
        }
        options.packageManager = value;
        break;
      }
      case '--locales':
      case '--locales-dir': {
        const value = readNextValue(args, ++index, arg);
        options.localesDir = value;
        break;
      }
      case '--languages':
      case '--langs': {
        const value = readNextValue(args, ++index, arg);
        options.languages = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      }
      case '--skip-install':
        options.skipInstall = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function parseExtractArgs(args: string[]): ParsedExtractArgs {
  const options: ParsedExtractArgs = {
    sources: [],
    outFile: path.join('locales', 'messages.pot'),
    cwd: process.cwd(),
    extensions: [...DEFAULT_EXTRACT_EXTENSIONS],
    dryRun: false,
    quiet: false,
    localesDir: 'locales',
    languages: undefined,
    defaultLocale: undefined,
    keepTemplate: false,
    fuzzy: true,
    fuzzyThreshold: 0.6,
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
      case '--output':
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
      case '--keep-template':
        options.keepTemplate = true;
        break;
      case '--locales':
      case '--locales-dir': {
        const value = readNextValue(args, ++index, arg);
        options.localesDir = value;
        break;
      }
      case '--languages':
      case '--langs': {
        const value = readNextValue(args, ++index, arg);
        options.languages = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      }
      case '--default-locale': {
        const value = readNextValue(args, ++index, arg);
        options.defaultLocale = value.trim();
        break;
      }
      case '--fuzzy':
        options.fuzzy = true;
        break;
      case '--no-fuzzy':
        options.fuzzy = false;
        break;
      case '--fuzzy-threshold': {
        const value = readNextValue(args, ++index, arg);
        const threshold = Number.parseFloat(value);
        if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
          throw new Error(`Invalid fuzzy threshold "${value}". Must be a number between 0 and 1.`);
        }
        options.fuzzyThreshold = threshold;
        break;
      }
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

export async function init(options: InitOptions): Promise<InitResult> {
  const cwd = options.cwd ?? process.cwd();

  // Detect environment if not specified
  let environment = options.environment;
  if (!environment) {
    environment = await detectEnvironment(cwd);
  }

  // Detect package manager if not specified
  let packageManager = options.packageManager;
  if (!packageManager) {
    packageManager = await detectPackageManager(cwd);
  }

  const packagesInstalled: string[] = [];
  const scriptsAdded: string[] = [];
  const localesCreated: string[] = [];

  // Install packages
  const packageToInstall = getPackageForEnvironment(environment);
  if (!options.skipInstall) {
    await installPackage(packageToInstall, packageManager, cwd);
    packagesInstalled.push(packageToInstall);

    // Install CLI as dev dependency
    await installPackage('@polingo/cli', packageManager, cwd, true);
    packagesInstalled.push('@polingo/cli');
  }

  // Update package.json with scripts
  const packageJsonPath = path.join(cwd, 'package.json');
  if (await fileExists(packageJsonPath)) {
    const packageJsonContent = await readFile(packageJsonPath, 'utf8');
    const packageJsonData = JSON.parse(packageJsonContent) as Record<string, unknown>;

    packageJsonData.scripts = packageJsonData.scripts ?? {};
    const scripts = packageJsonData.scripts as Record<string, string>;

    const scriptsToAdd = {
      'i18n:extract': 'polingo extract src --locales locales',
      'i18n:compile': 'polingo compile locales --format json',
      'i18n:validate': 'polingo validate locales',
    };

    for (const [key, value] of Object.entries(scriptsToAdd)) {
      if (!scripts[key]) {
        scripts[key] = value;
        scriptsAdded.push(key);
      }
    }

    await writeFile(packageJsonPath, JSON.stringify(packageJsonData, null, 2) + '\n', 'utf8');
  }

  // Create locales directory structure
  const localesDir = path.resolve(cwd, options.localesDir ?? 'locales');
  await mkdir(localesDir, { recursive: true });

  const languages = options.languages ?? ['en'];
  for (const lang of languages) {
    const langDir = path.join(localesDir, lang);
    await mkdir(langDir, { recursive: true });
    localesCreated.push(lang);
  }

  return {
    environment,
    packagesInstalled,
    scriptsAdded,
    localesCreated,
  };
}

async function detectEnvironment(cwd: string): Promise<'react' | 'vue' | 'web' | 'node'> {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (await fileExists(packageJsonPath)) {
    const packageJsonContent = await readFile(packageJsonPath, 'utf8');
    const packageJsonData = JSON.parse(packageJsonContent) as Record<string, unknown>;
    const dependencies = {
      ...((packageJsonData.dependencies as Record<string, string>) ?? {}),
      ...((packageJsonData.devDependencies as Record<string, string>) ?? {}),
    };

    if (dependencies['react'] || dependencies['react-dom']) {
      return 'react';
    }
    if (dependencies['vue']) {
      return 'vue';
    }
    if (dependencies['express'] || dependencies['fastify']) {
      return 'node';
    }
  }

  // Default to web if can't detect
  return 'web';
}

async function detectPackageManager(cwd: string): Promise<'npm' | 'yarn' | 'pnpm'> {
  if (await fileExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (await fileExists(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  return 'npm';
}

function getPackageForEnvironment(environment: 'react' | 'vue' | 'web' | 'node'): string {
  switch (environment) {
    case 'react':
      return '@polingo/react';
    case 'vue':
      return '@polingo/vue';
    case 'web':
      return '@polingo/web';
    case 'node':
      return '@polingo/node';
  }
}

async function installPackage(
  packageName: string,
  packageManager: 'npm' | 'yarn' | 'pnpm',
  cwd: string,
  dev = false
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const args: string[] = [];

    switch (packageManager) {
      case 'npm':
        args.push('install', packageName);
        if (dev) {
          args.push('--save-dev');
        }
        break;
      case 'yarn':
        args.push('add', packageName);
        if (dev) {
          args.push('--dev');
        }
        break;
      case 'pnpm':
        args.push('add', packageName);
        if (dev) {
          args.push('--save-dev');
        }
        break;
    }

    const depType = dev ? 'dev dependency' : 'dependency';
    console.log(`Installing ${packageName} as ${depType} with ${packageManager}...`);

    const child = spawn(packageManager, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Package installation failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

export async function extract(options: ExtractOptions): Promise<ExtractResult> {
  const cwd = options.cwd ?? process.cwd();
  const extensions = new Set(
    (options.extensions ?? DEFAULT_EXTRACT_EXTENSIONS).map(normalizeExtension)
  );

  const { files, skipped } = await collectFiles(options.sources, cwd, extensions);
  const messages = new Map<string, PendingMessage>();
  let templateRemoved = false;

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

    if (options.localesDir) {
      const summary = await syncLocaleCatalogs(entries, {
        cwd,
        localesDir: options.localesDir,
        potFile: outFile,
        languages: options.languages,
        defaultLocale: options.defaultLocale,
        fuzzy: options.fuzzy,
        fuzzyThreshold: options.fuzzyThreshold,
      });

      if (!options.quiet && summary) {
        const parts: string[] = [];
        if (summary.created.length > 0) {
          parts.push(`created ${summary.created.length} catalog(s)`);
        }
        if (summary.updated.length > 0) {
          parts.push(`updated ${summary.updated.length} catalog(s)`);
        }
        if (parts.length > 0) {
          console.log(`Synced locales (${parts.join(', ')}).`);
        }
      }

      if (!options.keepTemplate) {
        try {
          await rm(outFile);
          templateRemoved = true;
        } catch (error) {
          if (!isEnoent(error)) {
            throw error;
          }
        }
      }
    }
  }

  return { entries, outFile, skipped, templateRemoved };
}

async function syncLocaleCatalogs(
  entries: ExtractEntry[],
  options: LocaleSyncOptions
): Promise<LocaleSyncSummary | null> {
  const localesRoot = path.isAbsolute(options.localesDir)
    ? options.localesDir
    : path.resolve(options.cwd, options.localesDir);

  const languages =
    options.languages && options.languages.length > 0
      ? Array.from(new Set(options.languages))
      : await detectLocaleDirectories(localesRoot);

  if (languages.length === 0) {
    return null;
  }

  await mkdir(localesRoot, { recursive: true });

  const poFileName = derivePoFileName(options.potFile);
  const summary: LocaleSyncSummary = { created: [], updated: [] };

  for (const locale of languages) {
    if (!locale) continue;

    const localeDir = path.join(localesRoot, locale);
    await mkdir(localeDir, { recursive: true });

    const catalogPath = path.join(localeDir, poFileName);
    const exists = await fileExists(catalogPath);
    const relativePath = path.relative(options.cwd, catalogPath) || catalogPath;

    let catalog: GettextParserOutput;

    if (exists) {
      const buffer = await readFile(catalogPath);
      catalog = po.parse(buffer);
      catalog.translations ??= { '': {} };
    } else {
      catalog = createEmptyCatalog(locale);
      summary.created.push(relativePath);
    }

    const headersChanged = ensureCatalogHeaders(catalog, locale);

    let changed: boolean;
    if (options.fuzzy && exists) {
      changed = applyEntriesToCatalogWithFuzzy(
        catalog,
        entries,
        locale,
        options.defaultLocale,
        options.fuzzyThreshold ?? 0.6
      );
    } else {
      changed = applyEntriesToCatalog(catalog, entries, locale, options.defaultLocale);
    }

    if (exists && (changed || headersChanged)) {
      summary.updated.push(relativePath);
    }

    if (headersChanged || changed || !exists) {
      const compiled = po.compile(catalog);
      await writeFile(catalogPath, compiled);
    }
  }

  return summary;
}

function derivePoFileName(potFile: string): string {
  const baseName = path.basename(potFile);
  if (baseName.toLowerCase().endsWith('.pot')) {
    return `${baseName.slice(0, -4)}.po`;
  }
  if (baseName.toLowerCase().endsWith('.po')) {
    return baseName;
  }
  return `${baseName}.po`;
}

async function detectLocaleDirectories(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('.'))
      .sort();
  } catch (error) {
    if (isEnoent(error)) {
      return [];
    }
    throw error;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (isEnoent(error)) {
      return false;
    }
    throw error;
  }
}

function createEmptyCatalog(locale: string): GettextParserOutput {
  return {
    charset: 'utf-8',
    headers: {
      'Project-Id-Version': 'PACKAGE VERSION',
      'Report-Msgid-Bugs-To': '',
      'PO-Revision-Date': '',
      'Last-Translator': '',
      'Language-Team': '',
      Language: locale,
      'MIME-Version': '1.0',
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      'Plural-Forms': 'nplurals=2; plural=(n != 1);',
    },
    translations: { '': {} },
  };
}

function ensureCatalogHeaders(catalog: GettextParserOutput, locale: string): boolean {
  let changed = false;
  catalog.headers ??= {};
  const headers = catalog.headers;

  const ensure = (key: string, value: string) => {
    if (!headers[key]) {
      headers[key] = value;
      changed = true;
    }
  };

  ensure('Project-Id-Version', 'PACKAGE VERSION');
  ensure('Language', locale);
  ensure('MIME-Version', '1.0');
  ensure('Content-Type', 'text/plain; charset=UTF-8');
  ensure('Content-Transfer-Encoding', '8bit');
  ensure('Plural-Forms', 'nplurals=2; plural=(n != 1);');

  if (!catalog.charset) {
    catalog.charset = 'utf-8';
    changed = true;
  }

  return changed;
}

function applyEntriesToCatalog(
  catalog: GettextParserOutput,
  entries: ExtractEntry[],
  locale: string,
  defaultLocale?: string
): boolean {
  let changed = false;
  catalog.translations ??= { '': {} };
  const translations = catalog.translations;

  for (const entry of entries) {
    const contextKey = entry.msgctxt ?? '';

    if (!translations[contextKey]) {
      translations[contextKey] = {};
      changed = true;
    }

    const contextMessages = translations[contextKey];
    let message = contextMessages[entry.msgid];

    if (!message) {
      message = {
        msgid: entry.msgid,
        msgstr: entry.msgidPlural ? ['', ''] : [''],
      };
      if (entry.msgctxt) {
        message.msgctxt = entry.msgctxt;
      }
      if (entry.msgidPlural) {
        message.msgid_plural = entry.msgidPlural;
      }
      contextMessages[entry.msgid] = message;
      changed = true;
    } else {
      if (entry.msgctxt && !message.msgctxt) {
        message.msgctxt = entry.msgctxt;
        changed = true;
      }
      if (entry.msgidPlural && message.msgid_plural !== entry.msgidPlural) {
        message.msgid_plural = entry.msgidPlural;
        changed = true;
      }
    }

    message.msgstr = message.msgstr ?? [];
    const previousLength = message.msgstr.length;
    const expectedLength = entry.msgidPlural ? Math.max(2, previousLength) : 1;

    while (message.msgstr.length < expectedLength) {
      message.msgstr.push('');
    }

    if (!entry.msgidPlural && message.msgstr.length > 1) {
      message.msgstr = [message.msgstr[0] ?? ''];
    }

    if (message.msgstr.length !== previousLength) {
      changed = true;
    }

    const referenceText = entry.references.join('\n');
    message.comments ??= {};
    if (message.comments.reference !== referenceText) {
      message.comments.reference = referenceText;
      changed = true;
    }

    if (defaultLocale && locale === defaultLocale) {
      if (entry.msgidPlural) {
        if (!message.msgstr[0]) {
          message.msgstr[0] = entry.msgid;
          changed = true;
        }
        if (message.msgstr.length > 1 && !message.msgstr[1] && entry.msgidPlural) {
          message.msgstr[1] = entry.msgidPlural;
          changed = true;
        }
      } else if (!message.msgstr[0]) {
        message.msgstr[0] = entry.msgid;
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * Apply entries to catalog with fuzzy matching
 *
 * This function implements msgmerge-like behavior:
 * 1. Exact matches are updated with new references
 * 2. Similar strings (fuzzy matches) are marked with #, fuzzy flag
 * 3. Obsolete entries (in catalog but not in new entries) are marked with #~
 */
function applyEntriesToCatalogWithFuzzy(
  catalog: GettextParserOutput,
  entries: ExtractEntry[],
  locale: string,
  defaultLocale?: string,
  threshold = 0.6
): boolean {
  let changed = false;
  catalog.translations ??= { '': {} };
  const translations = catalog.translations;

  // Build a map of new entries for quick lookup
  const newEntriesMap = new Map<string, ExtractEntry>();
  for (const entry of entries) {
    const key = buildMessageKey(entry.msgctxt, entry.msgid, entry.msgidPlural);
    newEntriesMap.set(key, entry);
  }

  // Track which entries from the catalog have been processed
  const processedKeys = new Set<string>();

  // Process new entries
  for (const entry of entries) {
    const contextKey = entry.msgctxt ?? '';

    if (!translations[contextKey]) {
      translations[contextKey] = {};
      changed = true;
    }

    const contextMessages = translations[contextKey];
    const existingMessage = contextMessages[entry.msgid];
    const key = buildMessageKey(entry.msgctxt, entry.msgid, entry.msgidPlural);
    processedKeys.add(key);

    if (existingMessage) {
      // Exact match found - update references and clear fuzzy flag if present
      const referenceText = entry.references.join('\n');
      existingMessage.comments ??= {};

      if (existingMessage.comments.reference !== referenceText) {
        existingMessage.comments.reference = referenceText;
        changed = true;
      }

      // Clear fuzzy flag for exact matches
      if (existingMessage.comments.flag && existingMessage.comments.flag.includes('fuzzy')) {
        existingMessage.comments.flag = existingMessage.comments.flag
          .replace(/,?\s*fuzzy\s*/g, '')
          .trim();
        if (!existingMessage.comments.flag) {
          delete existingMessage.comments.flag;
        }
        changed = true;
      }

      // Update plural form if changed
      if (entry.msgidPlural && existingMessage.msgid_plural !== entry.msgidPlural) {
        existingMessage.msgid_plural = entry.msgidPlural;
        changed = true;
      }
    } else {
      // No exact match - try fuzzy matching across all contexts
      let bestMatch: { msgid: string; score: number; translation: GettextMessage } | null = null;

      for (const [searchContext, searchMessages] of Object.entries(translations)) {
        // Only search in the same context (or no context)
        if (searchContext !== contextKey) continue;

        for (const [oldMsgid, oldMessage] of Object.entries(searchMessages)) {
          if (oldMsgid === '') continue;
          if (oldMessage.comments?.flag?.includes('fuzzy')) continue; // Skip already fuzzy entries
          if (oldMessage.comments?.flag?.includes('obsolete')) continue; // Skip obsolete entries

          const similarity = calculateSimilarity(entry.msgid, oldMsgid);

          if (similarity >= threshold && (!bestMatch || similarity > bestMatch.score)) {
            bestMatch = { msgid: oldMsgid, score: similarity, translation: oldMessage };
          }
        }
      }

      if (bestMatch) {
        // Fuzzy match found - copy translation and mark as fuzzy
        const newMessage: GettextMessage = {
          msgid: entry.msgid,
          msgstr: bestMatch.translation.msgstr || [''],
          comments: {
            flag: 'fuzzy',
            reference: entry.references.join('\n'),
          },
        };

        if (entry.msgctxt) {
          newMessage.msgctxt = entry.msgctxt;
        }
        if (entry.msgidPlural) {
          newMessage.msgid_plural = entry.msgidPlural;
          // Adjust msgstr array for plurals if needed
          if (!Array.isArray(newMessage.msgstr) || newMessage.msgstr.length < 2) {
            newMessage.msgstr = bestMatch.translation.msgstr || ['', ''];
          }
        }

        contextMessages[entry.msgid] = newMessage;
        changed = true;
      } else {
        // No match - create new empty entry
        const newMessage: GettextMessage = {
          msgid: entry.msgid,
          msgstr: entry.msgidPlural ? ['', ''] : [''],
          comments: {
            reference: entry.references.join('\n'),
          },
        };

        if (entry.msgctxt) {
          newMessage.msgctxt = entry.msgctxt;
        }
        if (entry.msgidPlural) {
          newMessage.msgid_plural = entry.msgidPlural;
        }

        contextMessages[entry.msgid] = newMessage;
        changed = true;

        // Fill in default locale translations
        if (defaultLocale && locale === defaultLocale) {
          if (entry.msgidPlural) {
            newMessage.msgstr[0] = entry.msgid;
            newMessage.msgstr[1] = entry.msgidPlural;
          } else {
            newMessage.msgstr[0] = entry.msgid;
          }
        }
      }
    }
  }

  // Mark obsolete entries (entries in catalog but not in new extractions)
  for (const [_context, messages] of Object.entries(translations)) {
    for (const [msgid, message] of Object.entries(messages)) {
      if (msgid === '') continue; // Skip metadata

      const key = buildMessageKey(message.msgctxt, msgid, message.msgid_plural);

      if (!processedKeys.has(key)) {
        // This entry is obsolete - mark with #~ (previous msgid)
        message.comments ??= {};
        message.comments.flag = message.comments.flag
          ? `${message.comments.flag}, obsolete`
          : 'obsolete';
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const dist = distance(str1, str2);
  return 1 - dist / maxLength;
}

/**
 * Type definition for gettext message structure
 */
interface GettextMessage {
  msgid: string;
  msgstr: string[];
  msgid_plural?: string;
  msgctxt?: string;
  comments?: {
    reference?: string;
    flag?: string;
    translator?: string;
    extracted?: string;
    previous?: string;
  };
}

function isEnoent(error: unknown): boolean {
  return (
    Boolean(error) &&
    typeof error === 'object' &&
    'code' in (error as NodeJS.ErrnoException) &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
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

    const translations = parsed.translations;
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

  const translations = parsed.translations;

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

    // Preserve locale directory structure when outDir is specified
    // For example: locales/en/messages.po -> outDir/en/
    const inputDir = path.dirname(inputFile);
    const inputBasename = path.basename(inputDir);

    // Check if the immediate parent directory looks like a locale code (2-5 chars)
    // This handles common locale patterns: en, es, en-US, pt-BR, etc.
    if (inputBasename && /^[a-z]{2}(-[A-Z]{2})?$/i.test(inputBasename)) {
      return path.join(full, inputBasename);
    }

    return full;
  }

  return path.dirname(inputFile);
}

function printGlobalHelp(): void {
  console.log(`Usage: polingo <command> [options]

Commands:
  init      Initialize Polingo in your project (install packages and setup scripts)
  extract   Scan source files and extract message IDs into a POT catalog
  compile   Compile .po files into runtime artifacts
  validate  Lint .po files for missing translations

Run 'polingo <command> --help' for detailed usage of a command.`);
}

function printInitHelp(): void {
  console.log(`Usage: polingo init [options]

Initialize Polingo in your project by installing the appropriate package and setting up scripts.
This command will install both the environment-specific package (e.g., @polingo/react) and
@polingo/cli as a dev dependency.

Options:
  -e, --env <type>          Environment type: react, vue, web, or node (auto-detected)
      --pm <manager>        Package manager: npm, yarn, or pnpm (auto-detected)
      --cwd <dir>           Working directory for initialization
      --locales <dir>       Locale root directory (default: locales)
      --languages <list>    Comma-separated locale codes to create (default: en)
      --skip-install        Skip package installation (for testing)
  -h, --help                Show this help text

Examples:
  polingo init --env react --languages en,es,fr
  polingo init --env node --pm pnpm
  polingo init --env web --locales public/locales`);
}

function printExtractHelp(): void {
  console.log(`Usage: polingo extract [paths...] [options]

Options:
  -o, --out <file>          Output POT file (default: locales/messages.pot)
      --cwd <dir>           Working directory for relative paths
      --extensions <ext>    Comma-separated list of file extensions to scan
      --locales <dir>       Locale root; sync per-language PO files alongside POT (default: locales)
      --languages <list>    Comma-separated locale codes to ensure are present
      --default-locale      Locale code whose catalog copies source strings
      --fuzzy               Enable fuzzy matching for similar strings (default: enabled)
      --no-fuzzy            Disable fuzzy matching
      --fuzzy-threshold <n> Similarity threshold for fuzzy matching (0-1, default: 0.6)
      --dry-run             Print extracted strings without writing to disk
      --keep-template       Retain the generated POT file instead of cleaning it up
      --quiet               Suppress completion message
  -h, --help                Show this help text`);
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

type GettextParserOutput = GetTextTranslations;
