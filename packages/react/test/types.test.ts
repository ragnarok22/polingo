import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function getExportedFunctionReturnType(sourcePath: string, exportName: string): string | undefined {
  const sourceText = readFileSync(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement)) {
      continue;
    }

    if (statement.name?.text !== exportName) {
      continue;
    }

    return statement.type?.getText(sourceFile);
  }

  return undefined;
}

describe('React declaration compatibility', () => {
  it('avoids the legacy global JSX namespace in exported component signatures', () => {
    const providerSource = resolve(__dirname, '../src/provider.tsx');
    const transSource = resolve(__dirname, '../src/trans.tsx');

    expect(getExportedFunctionReturnType(providerSource, 'PolingoProvider')).toBe('ReactElement');
    expect(getExportedFunctionReturnType(transSource, 'Trans')).toBe('ReactElement');
  });
});
