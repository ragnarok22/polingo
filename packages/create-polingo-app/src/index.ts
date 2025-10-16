import { cp, readdir, readFile, stat, mkdir, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  template?: string;
  destination?: string;
  force?: boolean;
  listOnly?: boolean;
  help?: boolean;
}

interface TemplateInfo {
  name: string;
  absolutePath: string;
  description?: string;
}

const IGNORE_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.DS_Store',
  '.git',
]);

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const templatesDir = await findTemplatesDirectory();
  if (!templatesDir) {
    console.error(
      'Could not locate the templates directory. Make sure you run this command from the Polingo repository or install the package from npm.'
    );
    process.exitCode = 1;
    return;
  }

  const templates = await discoverTemplates(templatesDir);
  if (templates.length === 0) {
    console.error(`No examples were found inside ${templatesDir}.`);
    process.exitCode = 1;
    return;
  }

  if (options.listOnly) {
    printTemplates(templates);
    return;
  }

  const template = await selectTemplate(templates, options.template);
  if (!template) {
    process.exitCode = 1;
    return;
  }

  const destination = await resolveDestination(template.name, options.destination);
  if (!destination) {
    process.exitCode = 1;
    return;
  }

  await ensureDestination(destination, options.force ?? false);

  await copyTemplate(template.absolutePath, destination, options.force ?? false);
  await updatePackageName(destination, path.basename(destination));

  const relativePath = path.relative(process.cwd(), destination) || '.';
  console.log('\n✅ Project created successfully.');
  console.log('Next steps:');
  console.log(`  cd ${relativePath}`);
  console.log('  pnpm install');
  console.log('  pnpm run dev');
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }

    switch (arg) {
      case '-t':
      case '--template': {
        const value = args[i + 1];
        if (value !== undefined) {
          options.template = value;
          i += 1;
        }
        break;
      }
      case '-d':
      case '--destination':
      case '--dir': {
        const value = args[i + 1];
        if (value !== undefined) {
          options.destination = value;
          i += 1;
        }
        break;
      }
      case '-f':
      case '--force': {
        options.force = true;
        break;
      }
      case '-l':
      case '--list': {
        options.listOnly = true;
        break;
      }
      case '-h':
      case '--help': {
        options.help = true;
        break;
      }
      default: {
        if (!arg.startsWith('-') && !options.destination) {
          options.destination = arg;
        }
        break;
      }
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`create-polingo-app

Usage:
  pnpm create polingo-app [options]

Options:
  -t, --template <name>       Selects a template directly.
  -d, --destination <path>    Destination folder where the project is copied.
      --dir <path>            Alias of --destination.
  -f, --force                 Allows overwriting existing files.
  -l, --list                  Prints available templates.
  -h, --help                  Shows this help message.`);
}

async function findTemplatesDirectory(): Promise<string | undefined> {
  const currentFile = fileURLToPath(import.meta.url);
  let currentDir = path.dirname(currentFile);
  const root = path.parse(currentDir).root;

  const bundledTemplates = path.resolve(currentDir, '../templates');
  if (await pathExists(bundledTemplates)) {
    return bundledTemplates;
  }

  while (currentDir !== root) {
    const candidate = path.resolve(currentDir, 'examples');
    try {
      const stats = await stat(candidate);
      if (stats.isDirectory()) {
        return candidate;
      }
    } catch {
      // Ignore ENOENT and keep searching upwards.
    }
    currentDir = path.dirname(currentDir);
  }

  return undefined;
}

async function discoverTemplates(examplesDir: string): Promise<TemplateInfo[]> {
  const entries = await readdir(examplesDir, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());

  const templates: TemplateInfo[] = [];

  for (const dir of directories) {
    const absolutePath = path.join(examplesDir, dir.name);
    const description = await readTemplateDescription(absolutePath);
    templates.push({
      name: dir.name,
      absolutePath,
      description,
    });
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

async function readTemplateDescription(templatePath: string): Promise<string | undefined> {
  const readmePath = path.join(templatePath, 'README.md');
  const packagePath = path.join(templatePath, 'package.json');

  try {
    const readmeContent = await readFile(readmePath, 'utf8');
    const firstLine = readmeContent.split('\n').find((line) => line.trim().length > 0);
    if (firstLine) {
      return firstLine.replace(/^#\s*/, '').trim();
    }
  } catch {
    // README is optional.
  }

  try {
    const packageContent = await readFile(packagePath, 'utf8');
    const pkg = JSON.parse(packageContent) as { description?: string };
    if (pkg.description) {
      return pkg.description;
    }
  } catch {
    // package.json is optional.
  }

  return undefined;
}

function printTemplates(templates: TemplateInfo[]): void {
  console.log('Available templates:\n');
  for (const template of templates) {
    const description = template.description ? ` - ${template.description}` : '';
    console.log(`  • ${template.name}${description}`);
  }
}

async function selectTemplate(
  templates: TemplateInfo[],
  preferredTemplate?: string
): Promise<TemplateInfo | undefined> {
  if (preferredTemplate) {
    const match = templates.find((template) => template.name === preferredTemplate);
    if (!match) {
      console.error(`Template "${preferredTemplate}" does not exist. Use --list to view options.`);
      return undefined;
    }
    return match;
  }

  if (!stdout.isTTY || !stdin.isTTY) {
    console.error(
      'Interactive prompts are unavailable. Provide the template with the --template flag.'
    );
    return undefined;
  }

  console.log('\nSelect a template:');
  templates.forEach((template, index) => {
    const description = template.description ? ` - ${template.description}` : '';
    console.log(`  ${index + 1}) ${template.name}${description}`);
  });

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      const answer = (await rl.question('\nTemplate number (1): ')).trim();
      if (!answer) {
        return templates[0];
      }

      const index = Number.parseInt(answer, 10);
      if (!Number.isNaN(index) && index >= 1 && index <= templates.length) {
        return templates[index - 1];
      }

      console.log(`Invalid option: "${answer}". Enter a number between 1 and ${templates.length}.`);
    }
  } finally {
    rl.close();
  }
}

async function resolveDestination(
  templateName: string,
  provided?: string
): Promise<string | undefined> {
  if (provided) {
    return path.resolve(process.cwd(), provided);
  }

  if (!stdout.isTTY || !stdin.isTTY) {
    console.error(
      'Could not prompt for the destination directory interactively. Provide the path with --destination.'
    );
    return undefined;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`\nDestination folder (${templateName}): `)).trim();
    const safeName = answer || templateName;
    return path.resolve(process.cwd(), safeName);
  } finally {
    rl.close();
  }
}

async function ensureDestination(destination: string, force: boolean): Promise<void> {
  try {
    const stats = await stat(destination);
    if (!stats.isDirectory()) {
      throw new Error(`Destination path ${destination} exists and is not a directory.`);
    }

    const existingEntries = await readdir(destination);
    if (existingEntries.length > 0 && !force) {
      throw new Error(
        `Directory ${destination} already contains files. Use --force to overwrite them or choose another folder.`
      );
    }
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      await mkdir(destination, { recursive: true });
      return;
    }

    throw error;
  }
}

async function copyTemplate(source: string, destination: string, force: boolean): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    force,
    errorOnExist: !force,
    filter: (sourcePath) => shouldCopyPath(source, sourcePath),
  });
}

function shouldCopyPath(root: string, sourcePath: string): boolean {
  if (root === sourcePath) {
    return true;
  }

  const relative = path.relative(root, sourcePath);
  if (!relative) {
    return true;
  }

  const segments = relative.split(path.sep);
  return !segments.some((segment) => IGNORE_DIRECTORIES.has(segment));
}

async function updatePackageName(destination: string, appName: string): Promise<void> {
  const packagePath = path.join(destination, 'package.json');
  try {
    await access(packagePath);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const packageContent = await readFile(packagePath, 'utf8');
  let pkg: Record<string, unknown>;

  try {
    pkg = JSON.parse(packageContent) as Record<string, unknown>;
  } catch {
    console.warn(`Could not update the name in ${packagePath}: invalid JSON.`);
    return;
  }

  if (pkg.name === appName) {
    return;
  }

  pkg.name = appName;
  const updated = `${JSON.stringify(pkg, null, 2)}\n`;
  await writeFile(packagePath, updated, 'utf8');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    const stats = await stat(candidate);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

void main().catch((error: unknown) => {
  console.error(
    '\nAn error occurred while creating the app:',
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
