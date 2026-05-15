import { init } from 'license-checker-rseidelsohn';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, cwd, exit } from 'node:process';
import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';

const DEFAULT_CONFIG_FILE_PATH = 'check-license.config.json';
const DEFAUT_LICENSE_FILES_PATH = 'licenses';
const DEFAULT_BUILD_PATH = './';
const DEFAULT_LICENCES_SUB_PATH = 'third-party-notices.html';

// --- Type Definitions ---

// Options format as used inside configuration file
interface LicenseConfig {
  production: boolean;
  workspaces?: string[]; // Added to support monorepos
  allowedLicenses: string[];
  excludedPackages?: string[];
  out?: string;
  files?: string;
  htmlOut?: string;
}

// Options format as expected by license-checker-rseidelsohn
interface CheckerOptions {
  start: string;
  production: boolean;
  // onlyAllow: string;
  // excludePackages?: string;
  out?: string;
  files?: string;
  [key: string]: any;
}

// Data format as pushed in the output stream
interface LicenseData {
  licenses?: string | string[]; // licenses is optional to handle missing data
  repository?: string;
  publisher?: string;
  email?: string;
  path?: string;
  licenseFile?: string;
}

interface CheckerResult {
  [packageName: string]: LicenseData;
}

// --- Helper: Parse Arguments ---
function getArgs() {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      config: {
        type: 'string',
        short: 'c',
        default: DEFAULT_CONFIG_FILE_PATH
      },
      summary: {
        type: 'boolean',
        short: 's',
        default: false
      }
    }
  });
  return values;
}

// --- Text Generator Helper (Replicates library output) ---
async function generateTextReport(packages: CheckerResult, outputPath: string) {
  let content = '';
  Object.entries(packages).forEach(([pkgName, data]) => {
    content += `└─ ${pkgName}\n`;
    const licenses = Array.isArray(data.licenses) ? data.licenses.join(' OR ') : data.licenses || 'UNKNOWN';
    content += `   ├─ licenses: ${licenses}\n`;
    if (data.repository) content += `   ├─ repository: ${data.repository}\n`;
    if (data.publisher) content += `   ├─ publisher: ${data.publisher}\n`;
    if (data.email) content += `   ├─ email: ${data.email}\n`;
    if (data.path) content += `   ├─ path: ${data.path}\n`;

    // Formatting: ensure the last line uses '└─' instead of '├─' for tree appearance
    if (data.licenseFile) {
      content += `   └─ licenseFile: ${data.licenseFile}\n`;
    } else {
      content = content.replace(/├─([^├]+)$/, '└─$1');
    }
  });
  await writeFile(outputPath, content, 'utf-8');
}

// --- HTML Generator Helper ---
async function generateHtmlReport(packages: CheckerResult, outputPath: string) {
  console.log(`[AUDIT] 📝 Generating HTML report at: ${outputPath}`);

  let htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Third-Party Software Notices</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
      h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
      .component { border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; padding: 10px; background: #fafafa; }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .meta { font-size: 0.9em; color: #666; }
      details { margin-top: 10px; }
      summary { cursor: pointer; font-weight: bold; color: #0066cc; outline: none; }
      pre { background: #fff; padding: 15px; overflow-x: auto; border: 1px solid #eee; font-size: 0.85em; }
      a { color: #0066cc; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>Third-Party Software Notices</h1>
    <p>This software includes the following third-party components. We thank the open source community for their contributions.</p>
  `;

  for (const [pkgName, data] of Object.entries(packages)) {
    const rawLicense = data.licenses || 'UNKNOWN';
    const licenseType = Array.isArray(rawLicense) ? rawLicense.join(' OR ') : rawLicense;
    const repoUrl = data.repository ? `<a href="${data.repository}" target="_blank">Source</a>` : '';

    // Attempt to read the license text
    let licenseText = 'License text not found in package.';
    if (data.licenseFile) {
      try {
        licenseText = await readFile(data.licenseFile, 'utf-8');
      } catch {
        // failed to read file, keep default message
      }
    }

    // Escape HTML in license text to prevent rendering issues
    const safeText = licenseText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    htmlContent += `
    <div class="component">
      <div class="header">
        <strong>${pkgName}</strong>
        <span class="meta">${licenseType} &nbsp; ${repoUrl}</span>
      </div>
      <details>
        <summary>View License Agreement</summary>
        <pre>${safeText}</pre>
      </details>
    </div>
    `;
  }

  htmlContent += `
    <footer style="margin-top: 50px; text-align: center; font-size: 0.8em; color: #999;">
      Generated by License Audit Script
    </footer>
  </body>
  </html>
  `;

  await writeFile(outputPath, htmlContent);
}

// --- Main Execution ---
async function runAudit() {
  const args = getArgs();
  const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

  // Resolve config path relative to where the command is run, or default to root
  const configPath = resolve(cwd(), args.config);

  console.log(`[AUDIT] 📄 Reading configuration from: ${configPath}`);

  let config: LicenseConfig;

  try {
    const fileContent = await readFile(configPath, 'utf-8');
    config = JSON.parse(fileContent);
  } catch (error) {
    console.error(`[AUDIT] ❌ Failed to read configuration file: ${(error as Error).message}`);
    exit(1);
  }

  // Ensure the directories for license files exists if requested
  // empty string selects the default path, see DEFAUT_LICENSE_FILES_PATH
  // to get the root path, use '.' or './'
  if (config.files != null) {
    const configFilesPath = config.files.trim() || DEFAUT_LICENSE_FILES_PATH;
    const filesDirPath = resolve(cwd(), configFilesPath);
    const normalizedFilesDirPath = normalize(filesDirPath);
    const normalizedCwd = normalize(cwd());
    if (normalizedFilesDirPath.length > normalizedCwd.length && normalizedFilesDirPath.startsWith(normalizedCwd)) {
      await rm(filesDirPath, { recursive: true, force: true });
      await mkdir(filesDirPath, { recursive: true });
    }
    console.log(`[AUDIT] 📂 License files will be copied to: ${filesDirPath}`);
  }

  if (config.htmlOut != null) {
    const configHtmlOutPath = config.htmlOut.trim() || DEFAULT_LICENCES_SUB_PATH;
    // Ensure the parent directory for the HTML file exists
    // FUTURE try to extract compilerOptions/outDir from ./tsconfig.json before using DEFAULT_BUILD_PATH
    const htmlDirPath = resolve(cwd(), DEFAULT_BUILD_PATH, configHtmlOutPath, '..');
    const normalizedHtmlDirPath = normalize(htmlDirPath);
    const normalizedCwd = normalize(cwd());
    if (normalizedHtmlDirPath.length > normalizedCwd.length && normalizedHtmlDirPath.startsWith(normalizedCwd)) {
      await rm(htmlDirPath, { recursive: true, force: true });
      await mkdir(htmlDirPath, { recursive: true });
    }
    console.log(`[AUDIT] 📂 WEB License HTML page will be copied to: ${htmlDirPath}`);
  }

  // Scan EVERYTHING (dev + prod) so the library doesn't fail on a dev-dependency
  // Explicitly set 'summary: false' in options to allow the full raw data
  // to generate a "Dual Output" (List + Summary) if requested.
  // Transform arrays into semicolon-separated strings required by the tool
  const checkerOptions: CheckerOptions = {
    start: rootDir,
    // Scan EVERYTHING (dev + prod) so the library doesn't fail on a dev-dependency
    // Dev deps will be filtered bellow with `npm ls --prod --parseable`
    // production: config.production,
    production: false,
    summary: false,
    // Allowed licenses will filtered below
    // onlyAllow: config.allowedLicenses.join(';'),
    excludePackages: config.excludedPackages?.join(';'),
    // At purpose, omit 'out' here so the library doesn't overwrite files
    // repeatedly during the workspace loop. Will be written manually later.
    // out: config.out,
    files: config.files?.trim() ? config.files : config.files != null ? DEFAUT_LICENSE_FILES_PATH : undefined
  };

  try {
    const allPackages = await new Promise<CheckerResult>((resolve, reject) => {
      init(checkerOptions, (err: Error | null, pkgs: CheckerResult) => {
        if (err) reject(err);
        else resolve(pkgs);
      });
    });

    // 2. Cross-reference with NPM to get true production paths
    if (config.production) {
      console.log(`[AUDIT] 🔬 Isolating true production dependencies across all workspaces...`);
    }
    const mergedPackages = config.production ? filterProductionPackages(rootDir, allPackages) : allPackages;

    // 3. Remove Excluded Packages (Workspaces themselves)
    if (config.excludedPackages) {
      config.excludedPackages.forEach((excluded) => {
        // Remove matching exact names or scoped versions (e.g., @campaign-manager/client@0.0.5)
        Object.keys(mergedPackages).forEach((pkgKey) => {
          if (pkgKey.startsWith(`${excluded}@`) || pkgKey === excluded) {
            delete mergedPackages[pkgKey];
          }
        });
      });
    }

    // 4. Manually Validate Allowed Licenses
    let auditFailed = false;
    console.log(`[AUDIT] 🛡️ Validating licenses against allowed list...`);

    Object.entries(mergedPackages).forEach(([pkgName, data]) => {
      const rawLicenses = data.licenses || 'UNKNOWN';
      const licenses = Array.isArray(rawLicenses) ? rawLicenses : [rawLicenses];

      // Check if at least one license string satisfies the allowed list
      const hasAllowed = licenses.some((lic) => {
        if (config.allowedLicenses.includes(lic)) return true;
        // Handle strings like "MIT OR Apache-2.0"
        if (typeof lic === 'string' && lic.includes(' OR ')) {
          const parts = lic.split(' OR ').map((p) => p.trim().replace(/[()]/g, ''));
          return parts.some((p) => config.allowedLicenses.includes(p));
        }
        return false;
      });

      if (!hasAllowed) {
        console.error(`❌ FORBIDDEN: ${pkgName} uses ${licenses.join(', ')}`);
        auditFailed = true;
      }
    });

    if (auditFailed) {
      throw new Error('One or more production dependencies contain forbidden licenses.');
    }

    // 2. Generate HTML if requested
    if (config.htmlOut != null) {
      const configHtmlOutPath = config.htmlOut.trim() || DEFAULT_LICENCES_SUB_PATH;
      const htmlPath = resolve(cwd(), DEFAULT_BUILD_PATH, configHtmlOutPath);
      await generateHtmlReport(mergedPackages, htmlPath);
    }

    // 3. Console logging detailed list only if not writing to a specific 'out' file
    //    using a format similar to --plainVertical
    if (config.out) {
      const outPath = resolve(cwd(), config.out);
      await generateTextReport(mergedPackages, outPath);
      console.log(`[AUDIT] 💾 Output written to: ${config.out}`);
    } else {
      console.log('[AUDIT] \n--- 📦 Full Dependency List ---');
      Object.entries(mergedPackages).forEach(([pkgName, data]) => {
        console.log(pkgName);

        const rawLicense = data.licenses || 'UNKNOWN';
        const licenseStr = Array.isArray(rawLicense) ? rawLicense.join(' OR ') : rawLicense;

        console.log(`  licenses: ${licenseStr}`);
        if (data.repository) console.log(`  repository: ${data.repository}`);
        if (data.publisher) console.log(`  publisher: ${data.publisher}`);
        if (data.email) console.log(`  email: ${data.email}`);
        console.log(''); // Newline separator
      });
    }

    // 4. Conditionally print the summary at the bottom
    if (args.summary) {
      console.log('[AUDIT] \n--- 📊 License Summary ---');
      const summaryCount: Record<string, number> = {};

      Object.values(mergedPackages).forEach((data) => {
        const rawLicenses = data.licenses || 'UNKNOWN';
        const licenses = Array.isArray(rawLicenses) ? `(${rawLicenses.join(' OR ')})` : rawLicenses;

        summaryCount[licenses] = (summaryCount[licenses] || 0) + 1;
      });

      // Print sorted summary
      Object.entries(summaryCount)
        .sort(([, a], [, b]) => b - a) // Sort by count descending
        .forEach(([license, count]) => console.log(`${license}: ${count}`));
      console.log('--------------------------');
    }

    console.log('[AUDIT] \n✅ License Audit Passed: All production dependencies are compliant.');
    exit(0);
  } catch (error) {
    console.error('[AUDIT] \n❌ LICENSE AUDIT FAILED');
    console.error('The following forbidden licenses were found or an error occurred:');
    console.error((error as Error).message);
    exit(1);
  }
}

// This function is multi-platform (at least Windows, MacOS, Linux)
function filterProductionPackages(rootDir: string, allPackages: CheckerResult) {
  const prodPathsRaw = execSync('npm ls --prod --parseable', { cwd: rootDir, encoding: 'utf-8' });

  // Normalize the npm paths and make them relative to the root
  const prodPaths = new Set(
    prodPathsRaw
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => relative(rootDir, normalize(p)))
  );

  const mergedPackages = Object.entries(allPackages)
    .filter(([_, data]) => !!data.path)
    .filter(([_, data]) => {
      // Normalize the license-checker paths in the exact same way as above
      const normalizedDataPath = relative(rootDir, normalize(data.path!));
      return prodPaths.has(normalizedDataPath);
    })
    .reduce((acc, [pkgName, data]) => {
      acc[pkgName] = data;
      return acc;
    }, {} as CheckerResult);

  return mergedPackages;
}

runAudit();
