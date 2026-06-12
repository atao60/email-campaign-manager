import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import i18next from 'i18next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';

import { I18nextLanguageAdapter } from './I18nextLanguageAdapter';

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
  const TEST_DEFAULT_LANGUAGE = 'fr';

  beforeEach(() => {
    // 🚀 Inject the default language into the constructor
    adapter = new I18nextLanguageAdapter(TEST_DEFAULT_LANGUAGE);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('init()', () => {
    it('should load translation files and initialize i18next correctly', async () => {
      // Setup fake translations for both namespaces
      const mockFrCli = { hello: 'bonjour' };
      const mockEnCli = { hello: 'hello' };
      const mockFrEmail = { subject: 'sujet' };
      const mockEnEmail = { subject: 'subject' };

      // Mock the file system to return specific JSON strings based on the path
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const pathString = filePath.toString();
        if (pathString.includes(path.join('locales', 'fr', 'cli.json'))) return JSON.stringify(mockFrCli);
        if (pathString.includes(path.join('locales', 'en', 'cli.json'))) return JSON.stringify(mockEnCli);
        if (pathString.includes(path.join('locales', 'fr', 'email.json'))) return JSON.stringify(mockFrEmail);
        if (pathString.includes(path.join('locales', 'en', 'email.json'))) return JSON.stringify(mockEnEmail);
        throw new Error('File not found');
      });

      await adapter.init();

      // Ensure fs.readFile was called for both languages
      expect(fs.readFile).toHaveBeenCalledTimes(4);
      expect(fs.readFile).toHaveBeenCalledWith(path.join(cwd(), 'locales', 'fr', 'cli.json'), 'utf-8');
      expect(fs.readFile).toHaveBeenCalledWith(path.join(cwd(), 'locales', 'en', 'cli.json'), 'utf-8');

      expect(fs.readFile).toHaveBeenCalledWith(path.join(cwd(), 'locales', 'fr', 'email.json'), 'utf-8');
      expect(fs.readFile).toHaveBeenCalledWith(path.join(cwd(), 'locales', 'en', 'email.json'), 'utf-8');

      // Ensure i18next was initialized with the correct configuration and loaded resources
      expect(i18next.init).toHaveBeenCalledTimes(1);
      expect(i18next.init).toHaveBeenCalledWith({
        lng: TEST_DEFAULT_LANGUAGE,
        fallbackLng: 'en',
        ns: ['cli', 'email'],
        defaultNS: 'cli',
        resources: {
          fr: { cli: mockFrCli, email: mockFrEmail },
          en: { cli: mockEnCli, email: mockEnEmail }
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
            fr: { cli: {}, email: {} },
            en: { cli: {}, email: {} }
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
            fr: { cli: {}, email: {} },
            en: { cli: {}, email: {} }
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
