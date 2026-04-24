import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function listFiles(...roots: string[]) {
  const files: string[] = [];

  function walk(currentPath: string) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      files.push(path.relative(process.cwd(), entryPath));
    }
  }

  for (const root of roots) {
    try {
      walk(path.resolve(root));
    } catch {
      // Some template variants omit directories like components/ or scripts/.
    }
  }

  return files;
}

function readImports(filePath: string) {
  const output = readFileSync(filePath, 'utf8');
  return Array.from(
    output.matchAll(/from ['"]([^'"]+)['"]/g),
    (match) => match[1],
  );
}

function resolveRelativeImport(filePath: string, importPath: string) {
  if (!importPath.startsWith('.')) {
    return null;
  }

  return path.normalize(path.join(path.dirname(filePath), importPath));
}

describe('architecture: app boundaries', () => {
  it('prevents foundation-owned files from importing app packs directly', () => {
    const files = listFiles('app', 'src', 'components', 'lib', 'scripts');
    const violations = files.flatMap((filePath) => {
      if (filePath === 'src/app-config/load-active-app.ts') {
        return [];
      }

      return readImports(filePath).flatMap((importPath) => {
        if (importPath.startsWith('@/apps/')) {
          return [`${filePath} -> ${importPath}`];
        }

        const resolvedImport = resolveRelativeImport(filePath, importPath);
        if (resolvedImport?.split(path.sep).includes('apps')) {
          return [`${filePath} -> ${importPath}`];
        }

        return [];
      });
    });

    expect(violations).toEqual([]);
  });

  it('prevents app packs from importing sibling app packs', () => {
    const files = listFiles('apps');
    const violations = files.flatMap((filePath) => {
      const currentApp = filePath.split(path.sep)[1];

      return readImports(filePath).flatMap((importPath) => {
        if (importPath.startsWith('@/apps/')) {
          const importedApp = importPath.split('/')[2];
          return importedApp && importedApp !== currentApp
            ? [`${filePath} -> ${importPath}`]
            : [];
        }

        const resolvedImport = resolveRelativeImport(filePath, importPath);
        if (!resolvedImport) {
          return [];
        }

        const normalized = resolvedImport.split(path.sep);
        const appsIndex = normalized.indexOf('apps');
        const importedApp = appsIndex >= 0 ? normalized[appsIndex + 1] : null;

        return importedApp && importedApp !== currentApp
          ? [`${filePath} -> ${importPath}`]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });
});
