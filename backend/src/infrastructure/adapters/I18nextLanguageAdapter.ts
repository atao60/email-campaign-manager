import i18next from 'i18next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import { type LanguagePort } from '@domain/ports';

export const DEFAULT_LANGUAGE = 'fr';

export class I18nextLanguageAdapter implements LanguagePort {
  public async init(): Promise<void> {
    // Helper to safely load JSON files without crashing if they don't exist yet
    const loadTranslations = async (locale: string) => {
      try {
        const filePath = path.join(cwd(), 'locales', locale, 'cli.json');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
      } catch {
        return {};
      }
    };

    const frTranslations = await loadTranslations('fr');
    const enTranslations = await loadTranslations('en');

    await i18next.init({
      lng: DEFAULT_LANGUAGE,
      fallbackLng: 'en',
      resources: {
        fr: { translation: frTranslations },
        en: { translation: enTranslations }
      },
      interpolation: {
        escapeValue: false // CLI doesn't need HTML escaping
      }
    });
  }

  public translate(key: string, variables?: Record<string, string>): string {
    return variables ? i18next.t(key, variables) : i18next.t(key);
  }
}
