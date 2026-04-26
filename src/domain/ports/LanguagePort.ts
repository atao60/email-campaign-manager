export interface LanguagePort {
  /**
   * Initializes the language service and loads the translation resources.
   */
  init(): Promise<void>;

  /**
   * Translates a given key into the currently configured language.
   * * @param key The translation key (e.g., 'cli.errors.fileNotFound')
   * @param variables Optional dynamic variables to interpolate into the translation string
   * @returns The translated string
   */
  translate(key: string, variables?: Record<string, string>): string;
}
