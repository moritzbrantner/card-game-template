import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

function walkFiles(root) {
  const entries = readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
      continue;
    }

    if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

const [scanRoot, ...blockedPrefixes] = process.argv.slice(2);

if (!scanRoot) {
  console.error(
    'Usage: bun ./scripts/verify-package-imports.mjs <root> <blocked-prefix> [...]',
  );
  process.exit(1);
}

const resolvedRoot = path.resolve(process.cwd(), scanRoot);
if (!statSync(resolvedRoot, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`Import verification root does not exist: ${scanRoot}`);
  process.exit(1);
}

const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const violations = [];

for (const filePath of walkFiles(resolvedRoot)) {
  const source = readFileSync(filePath, 'utf8');

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) {
      continue;
    }

    if (blockedPrefixes.some((prefix) => specifier.startsWith(prefix))) {
      violations.push(
        `${path.relative(process.cwd(), filePath)} -> ${specifier}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error('Blocked imports detected in workspace package sources:');

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  process.exit(1);
}
