/**
 * - Strips out npm/CLI garbage text:
 *   When running a command using npm run, npm automatically injects header lines into the standard output (stdout).
 * - Prepends a frontmatter block to get good SVG compatibility woth some PDF/SVG readers (like the Gnome image viewer).
 */
import { createInterface } from 'node:readline';
import { stdin, stdout, cwd } from 'node:process';

// Configuration: Supported Mermaid start tags
const DIAGRAM_KEYWORDS = ['graph', 'flowchart', 'classDiagram', 'stateDiagram', 'erDiagram'];

// Dynamically grab the project root to strip absolute paths.
// It's not a node.js normalization but a POSIX one, in order to satisfy many
// code analysis tools (including typescript-graph, Vite, and TypeScript itself)
const rootDir = cwd().replace(/\\/g, '/');

// Account for tsg stripping the leading slash
const rootDirNoSlash = rootDir.startsWith('/') ? rootDir.substring(1) : rootDir;

// Account for tsg replacing hyphens with double-slashes in Mermaid IDs
const rootDirSanitized = rootDir.replace(/-/g, '//');
const rootDirSanitizedNoSlash = rootDirNoSlash.replace(/-/g, '//');

// Order matters: Remove longest specific strings first
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

// class labels are not displayed by some reader as Gnome viewer
// even with the configuration below.
const config = `---
config:
    htmlLabels: false
    flowchart:
        htmlLabels: false
---
`;

stdout.write(config);

const rl = createInterface({
  input: stdin,
  terminal: false
});

let foundDiagram = false;

rl.on('line', (line: string) => {
  // Strip the absolute root path from the string to force relative paths
  // let cleanLine = line.replace(new RegExp(rootDir + '/', 'g'), '');
  let cleanLine = line;
  // cleanLine = cleanLine.replace(new RegExp(rootDir, 'g'), '');
  // Use split().join() instead of Regex to avoid issues with dots in folder names
  for (const prefix of pathsToRemove) {
    cleanLine = cleanLine.split(prefix).join('');
  }

  // Early exit: If we already found the diagram, just pipe the line and skip the checks
  if (foundDiagram) {
    stdout.write(cleanLine + '\n');
    return;
  }

  // Look for the start of the diagram
  const trimmed = cleanLine.trim();
  if (DIAGRAM_KEYWORDS.some((kw) => trimmed.startsWith(kw))) {
    foundDiagram = true;
    stdout.write(cleanLine + '\n');
  }
});

rl.on('error', (err) => {
  console.error('💥 Stream Error in keep-only-mermaid:', err);
});
