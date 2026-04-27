import { type LanguagePort } from '@domain/ports/LanguagePort';

/**
 * Standardizes and translates user-facing output for the Command Line Interface.
 *
 * * This service acts as a UI formatting layer, ensuring that all terminal messages
 * maintain consistent semantics (e.g., success checkmarks, error crosses) and
 * respect the user's localized language settings via the LanguagePort.
 *
 * * Note: This service is exclusively for UI communication. For system telemetry,
 * auditing, or debugging data, use the LoggerPort instead.
 */
export class CliOutputService {
  constructor(private readonly i18n: LanguagePort) {}

  public success(key: string, variables?: Record<string, string>): void {
    console.log(`✅ ${this.i18n.translate(key, variables)}`);
  }

  public error(key: string, variables?: Record<string, string>): void {
    console.error(`❌ ${this.i18n.translate(key, variables)}`);
  }

  public info(key: string, variables?: Record<string, string>): void {
    console.log(`ℹ️ ${this.i18n.translate(key, variables)}`);
  }

  /**
   * For dynamic data that shouldn't be translated, like printing an ID or raw table
   */
  public raw(message: string): void {
    console.log(message);
  }
}
