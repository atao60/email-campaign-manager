import fs from 'node:fs';
import path from 'node:path';
import { merge } from 'lodash-es';

const UTF8_ENCODING = 'utf8';
const localesRoot = path.resolve('locales');
// FUTURE retrieve list of subdir-s of ./locales
const languages = ['fr', 'en'];
const mappings = [
  { shadowDir: 'web', fileName: 'web.json', key: 'web' },
  { shadowDir: 'cli', fileName: 'cli.json', key: 'cli' }
];

const NBSP_PATTERN = /\u00A0/g;
const NBSP_UNICODE = '\\u00A0';

/**
 * Restore i18n files:
 * - copy files from specific folders to `./locales/{{language}}/`
 * - replace nbsp by its unicode
 */
const restore = () => {
  languages.forEach((language) => {
    const languagePath = path.join(localesRoot, language);
    mappings.forEach(({ shadowDir, fileName, key }) => {
      const shadowDirPath = path.join(languagePath, shadowDir);
      const shadowPath = path.join(shadowDirPath, fileName);
      const originalPath = path.join(languagePath, fileName);

      if (!fs.existsSync(shadowPath)) {
        return;
      }

      const shadowData = JSON.parse(fs.readFileSync(shadowPath, UTF8_ENCODING));
      const extractedValues = { ...shadowData };
      delete extractedValues[key];

      let existingRootValues = {};
      if (fs.existsSync(originalPath)) {
        try {
          const existingRootData = JSON.parse(fs.readFileSync(originalPath, UTF8_ENCODING));
          existingRootValues = existingRootData[key] || existingRootData;
        } catch {
          console.warn(`[I18N] ⚠️ Could not parse existing ${fileName}, starting fresh.`);
        }
      }

      // Existing root data always takes priority over shadow data (extracted from code)
      // as the value of an extracted data entry is either an empty string or the key itself.
      const contentToSave = merge({}, extractedValues, existingRootValues);

      // Show the Non-Breaking Space as Unicode code point
      const output = replaceNbspWithUnicodeCodePoint(JSON.stringify(contentToSave, null, 2));

      fs.writeFileSync(originalPath, output, UTF8_ENCODING);
      console.log(`[I18N] ✨ Published and escaped: ${language}/${fileName}`);

      fs.rmSync(shadowDirPath, { recursive: true, force: true });
      console.log(`[I18N] 🗑️ Removed shadow directory: ${language}/${shadowDir}`);
    });
  });
};

function replaceNbspWithUnicodeCodePoint(s: string) {
  return s.replace(NBSP_PATTERN, NBSP_UNICODE);
}

restore();
