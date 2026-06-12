/**
 * Defines the contract for initializing the application with required or mock data during startup.
 * * ### Architectural Rationale
 * This interface decouples the application's startup sequence from environment-specific logic.
 * By relying on this contract, the main entry point (`main.ts`) can blindly execute the seeding
 * step without needing to check `process.env.NODE_ENV`.
 * * During the Dependency Injection phase, this resolves to:
 * - A concrete seeder in `development` (e.g., `DevDataSeeder`) to populate mock data.
 * - A safe Null Object in `production` (e.g., `NoOpDataSeeder`) that immediately resolves without side effects.
 */
export interface DataSeeder {
  /**
   * Executes the seeding process.
   * Implementation requirement: This method must be idempotent. It should check if data
   * already exists before writing to prevent duplicating records on subsequent restarts.
   */
  seed(): Promise<void>;
}
