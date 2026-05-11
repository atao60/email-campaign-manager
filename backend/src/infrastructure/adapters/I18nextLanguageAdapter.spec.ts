import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import i18next from 'i18next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';

import { I18nextLanguageAdapter, DEFAULT_LANGUAGE } from './I18nextLanguageAdapter';

// 1. Mock the external dependencies
vi.mock('i18next', () => ({
  default: {
    init: vi.fn(),
    t: vi.fn()
  }
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn()
  }
}));

describe('I18nextLanguageAdapter', () => {
  let adapter: I18nextLanguageAdapter;

  beforeEach(() => {
    adapter = new I18nextLanguageAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('init()', () => {
    it('should load translation files and initialize i18next correctly', async () => {
      // Setup fake translations
      const mockFrTranslations = { hello: 'bonjour' };
      const mockEnTranslations = { hello: 'hello' };

      // Mock the file system to return specific JSON strings based on the path
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const pathString = filePath.toString();
        if (pathString.includes(path.join('locales', 'fr', 'cli.json'))) {
          return JSON.stringify(mockFrTranslations);
        }
        if (pathString.includes(path.join('locales', 'en', 'cli.json'))) {
          return JSON.stringify(mockEnTranslations);
        }
        throw new Error('File not found');
      });

      await adapter.init();

      // Ensure fs.readFile was called for both languages
      expect(fs.readFile).toHaveBeenCalledTimes(2);
      expect(fs.readFile).toHaveBeenCalledWith(path.join(cwd(), 'locales', 'fr', 'cli.json'), 'utf-8');
      expect(fs.readFile).toHaveBeenCalledWith(path.join(cwd(), 'locales', 'en', 'cli.json'), 'utf-8');

      // Ensure i18next was initialized with the correct configuration and loaded resources
      expect(i18next.init).toHaveBeenCalledTimes(1);
      expect(i18next.init).toHaveBeenCalledWith({
        lng: DEFAULT_LANGUAGE,
        fallbackLng: 'en',
        resources: {
          fr: { translation: mockFrTranslations },
          en: { translation: mockEnTranslations }
        },
        interpolation: {
          escapeValue: false
        }
      });
    });

    it('should gracefully fallback to empty objects if translation files are missing', async () => {
      // Simulate file system throwing an error (e.g., ENOENT file not found)
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await adapter.init();

      // i18next should still initialize, but with empty translation objects
      expect(i18next.init).toHaveBeenCalledTimes(1);
      expect(i18next.init).toHaveBeenCalledWith(
        expect.objectContaining({
          resources: {
            fr: { translation: {} },
            en: { translation: {} }
          }
        })
      );
    });

    it('should fallback to empty objects if translation files contain invalid JSON', async () => {
      // Simulate reading a corrupted/invalid JSON file
      vi.mocked(fs.readFile).mockResolvedValue('{ invalid_json: true, }');

      await adapter.init();

      expect(i18next.init).toHaveBeenCalledWith(
        expect.objectContaining({
          resources: {
            fr: { translation: {} },
            en: { translation: {} }
          }
        })
      );
    });
  });

  describe('translate()', () => {
    it('should call i18next.t with the key when no variables are provided', () => {
      const translationKey = 'errors.network';
      vi.mocked(i18next.t).mockReturnValue('Erreur réseau');

      const result = adapter.translate(translationKey);

      expect(i18next.t).toHaveBeenCalledTimes(1);
      expect(i18next.t).toHaveBeenCalledWith(translationKey);
      expect(result).toBe('Erreur réseau');
    });

    it('should call i18next.t with the key and variables when variables are provided', () => {
      const translationKey = 'welcome.user';
      const variables = { name: 'Alice' };
      vi.mocked(i18next.t).mockReturnValue('Bienvenue Alice');

      const result = adapter.translate(translationKey, variables);

      expect(i18next.t).toHaveBeenCalledTimes(1);
      expect(i18next.t).toHaveBeenCalledWith(translationKey, variables);
      expect(result).toBe('Bienvenue Alice');
    });
  });
});
