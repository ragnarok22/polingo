#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const templatesRoot = path.join(repoRoot, 'packages/create-polingo-app/templates');
const examplesRoot = path.join(repoRoot, 'examples');
const exampleNames = ['express', 'react-vite'];

async function main() {
  const mode = process.argv[2];

  if (mode !== 'sync' && mode !== 'check') {
    console.error('Usage: node scripts/sync-examples.mjs <sync|check>');
    process.exitCode = 1;
    return;
  }

  const mismatches = [];

  for (const exampleName of exampleNames) {
    const templateDir = path.join(templatesRoot, exampleName);
    const exampleDir = path.join(examplesRoot, exampleName);

    if (mode === 'sync') {
      await syncExample(templateDir, exampleDir);
    }

    const exampleMismatches = await checkExample(templateDir, exampleDir);
    mismatches.push(...exampleMismatches);
  }

  if (mismatches.length > 0) {
    console.error('Example mirror drift detected:\n');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    mode === 'sync'
      ? 'Examples synchronized from canonical templates.'
      : 'Examples are synchronized with canonical templates.'
  );
}

async function syncExample(templateDir, exampleDir) {
  const templateFiles = await listFiles(templateDir);
  const trackedExampleFiles = listTrackedFiles(exampleDir);
  const templateFileSet = new Set(templateFiles);

  for (const relativePath of templateFiles) {
    const sourcePath = path.join(templateDir, relativePath);
    const destinationPath = path.join(exampleDir, relativePath);
    const contents = await readFile(sourcePath);

    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, contents);
  }

  for (const relativePath of trackedExampleFiles) {
    if (templateFileSet.has(relativePath)) {
      continue;
    }

    const destinationPath = path.join(exampleDir, relativePath);
    await rm(destinationPath, { force: true });
    await pruneEmptyDirectories(path.dirname(destinationPath), exampleDir);
  }
}

async function checkExample(templateDir, exampleDir) {
  const mismatches = [];
  const templateFiles = await listFiles(templateDir);
  const templateFileSet = new Set(templateFiles);
  const trackedExampleFiles = listTrackedFiles(exampleDir);

  for (const relativePath of templateFiles) {
    const templatePath = path.join(templateDir, relativePath);
    const examplePath = path.join(exampleDir, relativePath);

    if (!(await pathExists(examplePath))) {
      mismatches.push(`${path.relative(repoRoot, examplePath)} is missing`);
      continue;
    }

    const [templateContents, exampleContents] = await Promise.all([
      readFile(templatePath, 'utf8'),
      readFile(examplePath, 'utf8'),
    ]);

    if (templateContents !== exampleContents) {
      mismatches.push(`${path.relative(repoRoot, examplePath)} differs from its template`);
    }
  }

  for (const relativePath of trackedExampleFiles) {
    if (!templateFileSet.has(relativePath)) {
      mismatches.push(
        `${path.relative(repoRoot, path.join(exampleDir, relativePath))} has no canonical template`
      );
    }
  }

  return mismatches;
}

async function listFiles(directory, currentDirectory = directory) {
  const entries = await readdir(currentDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(directory, absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    files.push(path.relative(directory, absolutePath));
  }

  return files;
}

function listTrackedFiles(directory) {
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

async function pruneEmptyDirectories(startDirectory, boundaryDirectory) {
  let currentDirectory = startDirectory;

  while (currentDirectory !== boundaryDirectory) {
    const entries = await readdir(currentDirectory);
    if (entries.length > 0) {
      return;
    }

    await rm(currentDirectory, { recursive: false, force: true });
    currentDirectory = path.dirname(currentDirectory);
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

await main();
