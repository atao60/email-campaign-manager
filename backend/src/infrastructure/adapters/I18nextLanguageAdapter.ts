import i18next from 'i18next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import { type LanguagePort } from '@domain/ports';

export const DEFAULT_LANGUAGE = 'fr';

export class I18nextLanguageAdapter implements LanguagePort {
  constructor(private readonly defaultLanguage: string) {}

  public async init(): Promise<void> {
    // Helper to safely load JSON files without crashing if they don't exist yet
    const loadTranslations = async (locale: string, namespace: string) => {
      try {
        const filePath = path.join(cwd(), 'locales', locale, `${namespace}.json`);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
      } catch {
        return {};
      }
    };

    // Load both the CLI and Email translation files
    const frCli = await loadTranslations('fr', 'cli');
    const enCli = await loadTranslations('en', 'cli');

    const frEmail = await loadTranslations('fr', 'email');
    const enEmail = await loadTranslations('en', 'email');

    await i18next.init({
      lng: DEFAULT_LANGUAGE,
      fallbackLng: 'en',

      // Register your namespaces
      ns: ['cli', 'email'],

      // Set the default namespace to 'cli' so your existing code doesn't break
      defaultNS: 'cli',
      resources: {
        fr: {
          cli: frCli,
          email: frEmail
        },
        en: {
          cli: enCli,
          email: enEmail
        }
      },
      interpolation: {
        escapeValue: false // Backend services and CLI don't need HTML escaping
      }
    });
  }

  public translate(key: string, variables?: Record<string, string>): string {
    return variables ? i18next.t(key, variables) : i18next.t(key);
  }
}
