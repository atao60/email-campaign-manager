import i18next from 'i18next';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { type LanguagePort } from '@domain/ports/LanguagePort';

export class I18nextLanguageAdapter implements LanguagePort {
  public async init(): Promise<void> {
    const frTranslations = JSON.parse(
      await readFile(join(cwd(), 'locales', 'fr', 'translation.json'), 'utf-8')
    );

    await i18next.init({
      lng: 'fr',
      fallbackLng: 'en',
      resources: {
        fr: { translation: frTranslations },
      },
    });
  }

  public translate(key: string, variables?: Record<string, string>): string {
    return variables ? i18next.t(key, variables) : i18next.t(key);
  }
}
