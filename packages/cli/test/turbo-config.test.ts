import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageManifest {
  name?: string;
  scripts?: Record<string, string>;
}

interface TurboConfig {
  tasks?: {
    typecheck?: {
      outputs?: string[];
    };
  };
}

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

describe('turbo typecheck configuration', () => {
  it('does not declare outputs for no-emit workspace typecheck tasks', () => {
    const packagesDir = path.join(repoRoot, 'packages');
    const workspaceDirs = readdirSync(packagesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const noEmitTypecheckPackages = workspaceDirs
      .map((workspaceDir) => {
        const manifestPath = path.join(packagesDir, workspaceDir, 'package.json');
        const manifest = readJsonFile<PackageManifest>(manifestPath);
        return {
          name: manifest.name ?? workspaceDir,
          typecheckScript: manifest.scripts?.typecheck,
        };
      })
      .filter(
        (workspace): workspace is { name: string; typecheckScript: string } =>
          typeof workspace.typecheckScript === 'string' &&
          /\btsc\b/.test(workspace.typecheckScript) &&
          /--noEmit\b/.test(workspace.typecheckScript)
      )
      .map((workspace) => workspace.name)
      .sort();

    expect(noEmitTypecheckPackages).not.toHaveLength(0);

    const turboConfig = readJsonFile<TurboConfig>(path.join(repoRoot, 'turbo.json'));

    expect(
      turboConfig.tasks?.typecheck?.outputs,
      `Turbo should not declare typecheck outputs while these workspaces use tsc --noEmit: ${noEmitTypecheckPackages.join(', ')}`
    ).toEqual([]);
  });
});
