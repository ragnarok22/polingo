#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { access, cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const packagesRoot = path.join(repoRoot, 'packages');
const examplesRoot = path.join(repoRoot, 'examples');
const exampleNames = ['express', 'react-vite'];
const dependencySections = ['dependencies', 'devDependencies'];
const ignoredCopyEntries = new Set(['node_modules', '.turbo', 'coverage', 'test-report.junit.xml']);
const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

/**
 * @typedef {{
 *   name?: string;
 *   files?: string[];
 *   dependencies?: Record<string, string>;
 *   devDependencies?: Record<string, string>;
 * }} PackageManifest
 */

/**
 * Rewrite top-level example manifests so they install local workspace packages.
 *
 * @param {PackageManifest} manifest
 * @param {string} rootPath
 * @returns {PackageManifest}
 */
export function rewritePolingoDependenciesForLocalSmoke(manifest, rootPath) {
  return rewritePolingoDependencies(manifest, (dependencyName) =>
    path.join(rootPath, 'packages', getWorkspaceDirectoryName(dependencyName))
  );
}

async function main() {
  const stagingRoot = await mkdtemp(path.join(tmpdir(), 'polingo-examples-smoke-'));

  try {
    console.log(`Staging example smoke builds in ${stagingRoot}`);

    const stagedPackagesRoot = path.join(stagingRoot, 'packages');
    const stagedExamplesRoot = path.join(stagingRoot, 'examples');
    const stagedPackageNames = new Set();

    await mkdir(stagedPackagesRoot, { recursive: true });
    await mkdir(stagedExamplesRoot, { recursive: true });

    for (const exampleName of exampleNames) {
      const stagedExampleDirectory = await stageExampleForSmokeBuild(
        exampleName,
        stagedExamplesRoot,
        stagedPackagesRoot,
        stagedPackageNames
      );

      console.log(`Installing ${exampleName}`);
      runPnpm(['install', '--lockfile=false', '--prefer-offline'], stagedExampleDirectory);

      console.log(`Building ${exampleName}`);
      runPnpm(['build'], stagedExampleDirectory);
    }

    console.log('Example smoke builds completed.');
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

/**
 * @param {string} exampleName
 * @param {string} stagedExamplesRoot
 * @param {string} stagedPackagesRoot
 * @param {Set<string>} stagedPackageNames
 * @returns {Promise<string>}
 */
async function stageExampleForSmokeBuild(
  exampleName,
  stagedExamplesRoot,
  stagedPackagesRoot,
  stagedPackageNames
) {
  const sourceDirectory = path.join(examplesRoot, exampleName);
  const destinationDirectory = path.join(stagedExamplesRoot, exampleName);

  await copyDirectory(sourceDirectory, destinationDirectory, new Set(['dist', ...ignoredCopyEntries]));

  const manifestPath = path.join(destinationDirectory, 'package.json');
  const manifest = await readJsonFile(manifestPath);
  const localDependencies = collectPolingoDependencies(manifest);

  for (const dependencyName of localDependencies) {
    await stageWorkspacePackage(dependencyName, stagedPackagesRoot, stagedPackageNames);
  }

  const rewrittenManifest = rewritePolingoDependencies(manifest, (dependencyName) =>
    path.join(stagedPackagesRoot, getWorkspaceDirectoryName(dependencyName))
  );

  await writeJsonFile(manifestPath, rewrittenManifest);

  return destinationDirectory;
}

/**
 * @param {string} packageName
 * @param {string} stagedPackagesRoot
 * @param {Set<string>} stagedPackageNames
 * @returns {Promise<void>}
 */
async function stageWorkspacePackage(packageName, stagedPackagesRoot, stagedPackageNames) {
  if (stagedPackageNames.has(packageName)) {
    return;
  }

  stagedPackageNames.add(packageName);

  const workspaceDirectoryName = getWorkspaceDirectoryName(packageName);
  const sourceDirectory = path.join(packagesRoot, workspaceDirectoryName);
  const sourceManifestPath = path.join(sourceDirectory, 'package.json');
  const sourceManifest = await readJsonFile(sourceManifestPath);

  await ensureBuiltArtifacts(sourceDirectory, sourceManifest);

  for (const dependencyName of collectPolingoDependencies(sourceManifest)) {
    await stageWorkspacePackage(dependencyName, stagedPackagesRoot, stagedPackageNames);
  }

  const destinationDirectory = path.join(stagedPackagesRoot, workspaceDirectoryName);

  await copyDirectory(sourceDirectory, destinationDirectory, ignoredCopyEntries);

  const rewrittenManifest = rewritePolingoDependencies(sourceManifest, (dependencyName) =>
    path.join(stagedPackagesRoot, getWorkspaceDirectoryName(dependencyName))
  );

  await writeJsonFile(path.join(destinationDirectory, 'package.json'), rewrittenManifest);
}

/**
 * @param {PackageManifest} manifest
 * @returns {string[]}
 */
function collectPolingoDependencies(manifest) {
  const dependencies = new Set();

  for (const section of dependencySections) {
    for (const dependencyName of Object.keys(manifest[section] ?? {})) {
      if (dependencyName.startsWith('@polingo/')) {
        dependencies.add(dependencyName);
      }
    }
  }

  return [...dependencies].sort((left, right) => left.localeCompare(right));
}

/**
 * @param {PackageManifest} manifest
 * @param {(dependencyName: string) => string} resolveDependencyPath
 * @returns {PackageManifest}
 */
function rewritePolingoDependencies(manifest, resolveDependencyPath) {
  const rewrittenManifest = { ...manifest };

  for (const section of dependencySections) {
    const dependencies = manifest[section];

    if (!dependencies) {
      continue;
    }

    rewrittenManifest[section] = { ...dependencies };

    for (const dependencyName of Object.keys(rewrittenManifest[section])) {
      if (!dependencyName.startsWith('@polingo/')) {
        continue;
      }

      rewrittenManifest[section][dependencyName] = `file:${resolveDependencyPath(dependencyName)}`;
    }
  }

  return rewrittenManifest;
}

/**
 * @param {string} packageName
 * @returns {string}
 */
function getWorkspaceDirectoryName(packageName) {
  if (!packageName.startsWith('@polingo/')) {
    throw new Error(`Expected an @polingo workspace package, received "${packageName}".`);
  }

  return packageName.slice('@polingo/'.length);
}

/**
 * @param {string} sourceDirectory
 * @param {PackageManifest} manifest
 * @returns {Promise<void>}
 */
async function ensureBuiltArtifacts(sourceDirectory, manifest) {
  if (!manifest.files?.includes('dist')) {
    return;
  }

  const distDirectory = path.join(sourceDirectory, 'dist');

  try {
    await access(distDirectory);
  } catch {
    throw new Error(
      `Missing built artifacts for ${manifest.name ?? sourceDirectory} at ${path.relative(
        repoRoot,
        distDirectory
      )}. Run "pnpm build" before "pnpm examples:smoke".`
    );
  }
}

/**
 * @param {string} sourceDirectory
 * @param {string} destinationDirectory
 * @param {Set<string>} ignoredEntries
 * @returns {Promise<void>}
 */
async function copyDirectory(sourceDirectory, destinationDirectory, ignoredEntries) {
  await cp(sourceDirectory, destinationDirectory, {
    recursive: true,
    filter(sourcePath) {
      return !ignoredEntries.has(path.basename(sourcePath));
    },
  });
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {void}
 */
function runPnpm(args, cwd) {
  execFileSync(pnpmExecutable, args, {
    cwd,
    stdio: 'inherit',
  });
}

/**
 * @template T
 * @param {string} filePath
 * @returns {Promise<T>}
 */
async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

/**
 * @param {string} filePath
 * @param {unknown} value
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
