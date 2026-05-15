import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd, argv, exit } from 'node:process';

const targetFile = argv[2];

if (!targetFile) {
  console.error('❌ Please specify a file to clean (e.g. tsx clean-paths.ts client-graph.md).');
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
