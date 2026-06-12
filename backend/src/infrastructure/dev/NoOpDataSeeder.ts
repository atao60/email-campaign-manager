import type { DataSeeder } from '@domain/ports/DataSeeder';

/**
 * Null Object Pattern: Safely does absolutely nothing in production.
 */
export class NoOpDataSeeder implements DataSeeder {
  public async seed(): Promise<void> {
    // Intentional no-op
  }
}
