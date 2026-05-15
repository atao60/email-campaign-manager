import fs from 'node:fs';
import path from 'node:path';

const localesRoot = path.resolve('locales');
// FUTURE retrieve list of subdir-s of ./locales
const languages = ['fr', 'en'];
const config = [
  { fileName: 'web.json', shadowDir: 'web', key: 'web' },
  { fileName: 'cli.json', shadowDir: 'cli', key: 'cli' }
];

/**
 * Shadow the i18n data files (i.e. json files):
 * - copy each of them in a specific folder,
 *   i.e. `./locales/{{language}}/{{namespace}}/{{namespace}}.json`
 * - add a top layer `{{namespace}}` if needed
 */
const migrate = () => {
  languages.forEach((language) => {
    const languagePath = path.join(localesRoot, language);

    if (!fs.existsSync(languagePath)) {
      console.warn(`[I18N] ⚠️ Language directory not found: ${languagePath}`);
      return;
    }

    config.forEach(({ fileName, shadowDir, key }) => {
      const shadowDirPath = path.join(languagePath, shadowDir);
      const originalFilePath = path.join(languagePath, fileName);
      const targetFilePath = path.join(shadowDirPath, fileName);

      // 1. Remove existing shadow directory and recreate it
      if (fs.existsSync(shadowDirPath)) {
        fs.rmSync(shadowDirPath, { recursive: true, force: true });
        console.log(`[I18N] 🗑️ Removed existing directory: ${language}/${shadowDir}`);
      }
      fs.mkdirSync(shadowDirPath, { recursive: true });
      console.log(`[I18N] 📁 Created directory: ${language}/${shadowDir}`);

      // 2. Process and copy the file if it exists at the root
      if (!fs.existsSync(originalFilePath)) {
        console.log(`[I18N] ❓ File not found at root: ${language}/${fileName} (Skipping move)`);
        return;
      }

      try {
        const rawData = fs.readFileSync(originalFilePath, 'utf8');
        const jsonData = JSON.parse(rawData);

        // Wrap content with the top-level key if not already wrapped
        const wrappedData = jsonData[key] ? jsonData : { [key]: jsonData };

        // Write to the new shadow location
        fs.writeFileSync(targetFilePath, JSON.stringify(wrappedData, null, 2), 'utf8');

        console.log(`[I18N] ✅ Shadowed and wrapped: ${language}/${fileName} -> ${language}/${shadowDir}/${fileName}`);
      } catch (error) {
        console.error(`[I18N] ❌ Error processing ${originalFilePath}:`, error);
      }
    });
  });
};

migrate();
