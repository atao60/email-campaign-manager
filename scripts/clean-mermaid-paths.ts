/**
 * @fileoverview Utility script to strip machine-specific absolute paths from generated Markdown files.
 *
 * When generating architectural diagrams (e.g., using `typescript-graph`), the resulting Mermaid
 * code often contains absolute system paths. This script sanitizes a target file in-place by removing
 * the Current Working Directory (CWD) base path, ensuring the output contains only clean,
 * environment-agnostic relative paths.
 *
 * It specifically handles several edge cases introduced by AST parsing tools and Mermaid:
 * 1. POSIX Normalization: Converts Windows backslashes to forward slashes.
 * 2. Leading Slash Stripping: Accounts for tools that drop the initial `/` from Unix paths.
 * 3. Hyphen Escaping: Accounts for tools replacing hyphens (`-`) with double-slashes (`//`)
 * to prevent crashing Mermaid's node ID syntax.
 *
 * @example Usage via CLI:
 * tsx scripts/clean-mermaid-paths.ts client-graph.md
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd, argv, exit } from 'node:process';

const targetFile = argv[2];

if (!targetFile) {
  console.error('❌ Please specify a file to clean (e.g., tsx clean-paths.ts client-graph.md).');
  exit(1);
}

const filePath = resolve(cwd(), targetFile);

if (!existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  exit(1);
}

const rootDir = cwd().replace(/\\/g, '/');
const rootDirNoSlash = rootDir.startsWith('/') ? rootDir.substring(1) : rootDir;
const rootDirSanitized = rootDir.replace(/-/g, '//');
const rootDirSanitizedNoSlash = rootDirNoSlash.replace(/-/g, '//');

const pathsToRemove = [
  rootDirSanitized + '/',
  rootDirSanitized,
  rootDirSanitizedNoSlash + '/',
  rootDirSanitizedNoSlash,
  rootDir + '/',
  rootDir,
  rootDirNoSlash + '/',
  rootDirNoSlash
];

let content = readFileSync(filePath, 'utf8');

for (const prefix of pathsToRemove) {
  content = content.split(prefix).join('');
}

writeFileSync(filePath, content, 'utf8');
console.log(`✨ Cleaned absolute paths from ${targetFile}`);
