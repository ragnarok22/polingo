import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageManifest {
  name?: string;
  version?: string;
  private?: boolean;
  bin?: unknown;
  files?: string[];
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface TsConfig {
  extends?: string;
  files?: string[];
  compilerOptions?: {
    paths?: Record<string, string[]>;
    moduleResolution?: string;
  };
}

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const templatesRoot = path.join(repoRoot, 'packages/create-polingo-app/templates');
const examplesRoot = path.join(repoRoot, 'examples');
const mirroredExamples = ['express', 'react-vite'];

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function readTextFile(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function listCanonicalFiles(directory: string, currentDirectory = directory): string[] {
  const entries = readdirSync(currentDirectory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(currentDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listCanonicalFiles(directory, absolutePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    files.push(path.relative(directory, absolutePath));
  }

  return files;
}

function listTrackedFiles(directory: string): string[] {
  const relativeDirectory = path.relative(repoRoot, directory);
  const output = execFileSync('git', ['ls-files', '--', relativeDirectory], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();

  if (output.length === 0) {
    return [];
  }

  return output
    .split('\n')
    .filter(Boolean)
    .map((trackedFile) => path.relative(relativeDirectory, trackedFile))
    .sort((left, right) => left.localeCompare(right));
}

function readWorkspacePackageVersions(): Map<string, string> {
  const packagesDirectory = path.join(repoRoot, 'packages');
  const workspaceDirectories = readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const versions = new Map<string, string>();

  for (const workspaceDirectory of workspaceDirectories) {
    const manifest = readJsonFile<PackageManifest>(
      path.join(packagesDirectory, workspaceDirectory, 'package.json')
    );

    if (manifest.name && manifest.version) {
      versions.set(manifest.name, manifest.version);
    }
  }

  return versions;
}

function readTopLevelPermissionsBlock(workflowContents: string): string | null {
  const lines = workflowContents.split(/\r?\n/u);
  const permissionsIndex = lines.findIndex((line) => /^permissions:\s*(.*)$/u.test(line));

  if (permissionsIndex === -1) {
    return null;
  }

  const [, inlineValue = ''] = lines[permissionsIndex].match(/^permissions:\s*(.*)$/u) ?? [];
  const blockLines = [inlineValue].filter(Boolean);

  for (let index = permissionsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.length > 0 && !line.startsWith(' ')) {
      break;
    }

    blockLines.push(line);
  }

  return blockLines.join('\n').trim();
}

function hasContentsPermission(workflowContents: string): boolean {
  const permissionsBlock = readTopLevelPermissionsBlock(workflowContents);

  if (!permissionsBlock) {
    return false;
  }

  return /(?:^|\s|[{,])contents:\s*(?:read|write)\b/u.test(permissionsBlock);
}

function readCiMatrixEntries(workflowContents: string): Array<{ node: number; os: string }> {
  return Array.from(
    workflowContents.matchAll(/-\s+node:\s+(\d+)\r?\n\s+os:\s+([^\n]+)/gu),
    ([, node, os]) => ({
      node: Number(node),
      os: os.trim(),
    })
  );
}

function readPinnedNodeVersions(workflowContents: string): number[] {
  return Array.from(workflowContents.matchAll(/node-version:\s+(\d+)/gu), ([, version]) =>
    Number(version)
  );
}

describe('repo mechanics', () => {
  it('keeps the root manifest private and non-publishable', () => {
    const manifest = readJsonFile<PackageManifest>(path.join(repoRoot, 'package.json'));

    expect(manifest.private).toBe(true);
    expect(manifest.bin).toBeUndefined();
    expect(manifest.files).toBeUndefined();
  });

  it('uses tsconfig.base.json as the single source of package alias paths', () => {
    const baseConfig = readJsonFile<TsConfig>(path.join(repoRoot, 'tsconfig.base.json'));
    const rootConfig = readJsonFile<TsConfig>(path.join(repoRoot, 'tsconfig.json'));
    const eslintConfig = readJsonFile<TsConfig>(path.join(repoRoot, 'tsconfig.eslint.json'));

    expect(baseConfig.compilerOptions?.paths).toMatchObject({
      '@polingo/core': ['packages/core/src/index.ts'],
      '@polingo/core/*': ['packages/core/src/*'],
      '@polingo/node': ['packages/node/src/index.ts'],
      '@polingo/node/*': ['packages/node/src/*'],
      '@polingo/web': ['packages/web/src/index.ts'],
      '@polingo/web/*': ['packages/web/src/*'],
      '@polingo/react': ['packages/react/src/index.ts'],
      '@polingo/react/*': ['packages/react/src/*'],
      '@polingo/vue': ['packages/vue/src/index.ts'],
      '@polingo/vue/*': ['packages/vue/src/*'],
      '@polingo/cli': ['packages/cli/src/index.ts'],
      '@polingo/cli/*': ['packages/cli/src/*'],
    });

    expect(rootConfig.extends).toBe('./tsconfig.base.json');
    expect(rootConfig.files).toEqual([]);
    expect(rootConfig.compilerOptions?.paths).toBeUndefined();
    expect(rootConfig.compilerOptions?.moduleResolution).toBeUndefined();

    expect(eslintConfig.extends).toBe('./tsconfig.base.json');
    expect(eslintConfig.compilerOptions?.paths).toBeUndefined();
    expect(eslintConfig.compilerOptions?.moduleResolution).toBeUndefined();
  });

  it('keeps mirrored examples in sync with the canonical templates', () => {
    for (const exampleName of mirroredExamples) {
      const templateDirectory = path.join(templatesRoot, exampleName);
      const exampleDirectory = path.join(examplesRoot, exampleName);

      const canonicalFiles = listCanonicalFiles(templateDirectory);
      const trackedExampleFiles = listTrackedFiles(exampleDirectory);

      expect(
        trackedExampleFiles,
        `Tracked example files for ${exampleName} must match the template exactly. Run "pnpm examples:sync" after editing templates.`
      ).toEqual(canonicalFiles);

      for (const relativePath of canonicalFiles) {
        const templatePath = path.join(templateDirectory, relativePath);
        const examplePath = path.join(exampleDirectory, relativePath);

        expect(
          existsSync(examplePath),
          `${path.relative(repoRoot, examplePath)} should exist in the mirrored example.`
        ).toBe(true);

        expect(
          readTextFile(examplePath),
          `${path.relative(repoRoot, examplePath)} must stay byte-for-byte in sync with its template.`
        ).toBe(readTextFile(templatePath));
      }
    }
  });

  it('keeps mirrored manifests on the current workspace package versions', () => {
    const workspaceVersions = readWorkspacePackageVersions();
    const dependencySections: Array<keyof PackageManifest> = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ];

    for (const exampleName of mirroredExamples) {
      for (const rootDirectory of [templatesRoot, examplesRoot]) {
        const manifestPath = path.join(rootDirectory, exampleName, 'package.json');
        const manifest = readJsonFile<PackageManifest>(manifestPath);

        for (const dependencySection of dependencySections) {
          const dependencies = manifest[dependencySection];
          if (!dependencies) {
            continue;
          }

          for (const [dependencyName, dependencyRange] of Object.entries(dependencies)) {
            if (!dependencyName.startsWith('@polingo/')) {
              continue;
            }

            const workspaceVersion = workspaceVersions.get(dependencyName);
            expect(
              workspaceVersion,
              `${dependencyName} must exist as a workspace package before it can be referenced in ${path.relative(repoRoot, manifestPath)}.`
            ).toBeDefined();
            expect(
              dependencyRange,
              `${dependencyName} in ${path.relative(repoRoot, manifestPath)} must track the current workspace release version.`
            ).toBe(`^${workspaceVersion}`);
          }
        }
      }
    }
  });

  it('requires top-level GitHub workflow permissions with a contents scope', () => {
    const workflowsDirectory = path.join(repoRoot, '.github', 'workflows');
    const workflowFiles = listFiles(workflowsDirectory).filter((workflowPath) =>
      ['.yaml', '.yml'].includes(path.extname(workflowPath))
    );

    expect(workflowFiles.length).toBeGreaterThan(0);

    for (const workflowPath of workflowFiles) {
      const workflowContents = readTextFile(workflowPath);

      expect(
        hasContentsPermission(workflowContents),
        `${path.relative(repoRoot, workflowPath)} must declare an explicit top-level permissions block that includes a contents scope.`
      ).toBe(true);
    }
  });

  it('keeps supported Node.js versions aligned across engines and workflows', () => {
    const supportedNodeVersions = [22, 24, 25];
    const nodeRuntimeTargetFiles = [
      'packages/cli/tsup.config.ts',
      'packages/create-polingo-app/tsup.config.ts',
    ];
    const rootManifest = readJsonFile<PackageManifest>(path.join(repoRoot, 'package.json'));
    const ciWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
    const workflowsDirectory = path.join(repoRoot, '.github', 'workflows');
    const ciWorkflowContents = readTextFile(ciWorkflowPath);
    const workflowFiles = listFiles(workflowsDirectory).filter((workflowPath) =>
      ['.yaml', '.yml'].includes(path.extname(workflowPath))
    );

    expect(rootManifest.engines?.node).toBe('>=22.0.0');
    expect(readCiMatrixEntries(ciWorkflowContents)).toEqual([
      { node: 22, os: 'ubuntu-latest' },
      { node: 24, os: 'ubuntu-latest' },
      { node: 24, os: 'windows-latest' },
      { node: 24, os: 'macos-latest' },
      { node: 25, os: 'ubuntu-latest' },
    ]);

    for (const workflowPath of workflowFiles) {
      const nodeVersions = readPinnedNodeVersions(readTextFile(workflowPath));

      for (const nodeVersion of nodeVersions) {
        expect(
          supportedNodeVersions,
          `${path.relative(repoRoot, workflowPath)} pins unsupported Node.js ${nodeVersion}.`
        ).toContain(nodeVersion);
      }
    }

    for (const relativePath of nodeRuntimeTargetFiles) {
      expect(
        readTextFile(path.join(repoRoot, relativePath)),
        `${relativePath} must target Node.js 22 to match the supported runtime floor.`
      ).toMatch(/target:\s*['"]node22['"]/u);
    }
  });
});
