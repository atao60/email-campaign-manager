/**
 * DI_TYPES: The Public API
 * Used by Domain, Application, and Presentation layers.
 * These represent the core Ports and Use Cases.
 *
 * Notes. Represents the components that are allowed to be resolved and injected across layer boundaries.
 *        It contains your Domain Ports (interfaces) and Application Use Cases.
 */
export const DI_TYPES = {
  // Services
  LanguageService: Symbol.for('LanguageService'),
  Logger: Symbol.for('Logger'),

  // Ports
  CsvPort: Symbol.for('CsvPort'),
  EmailPort: Symbol.for('EmailPort'),

  // Use Cases
  MergeMailingListsUseCase: Symbol.for('MergeMailingListsUseCase')
};

/**
 * INFRA_TYPES: The Private Implementation Details
 * STRICTLY FOR INTERNAL INFRASTRUCTURE USE ONLY.
 * Never inject these into Domain or Application layers.
 *
 * Note. Represents internal dependencies that exist only to make the infrastructure layer work.
 *       The rest of the application should never know they exist.
 */
export const INFRA_TYPES = {
  // Databases & Caches
  RedisClient: Symbol.for('RedisClient'),

  // Internal Adapters
  DirectMailer: Symbol.for('DirectMailer'),

  // Background Workers
  EmailWorker: Symbol.for('EmailWorker')
};

/**
 * PRESENTATION_TYPES: The Driving Layer Dependencies
 * STRICTLY FOR USE IN THE PRESENTATION LAYER (CLI, REST APIs).
 *
 * * These symbols represent services, controllers, or utilities that handle
 * user interfaces and delivery mechanisms. They orchestrate user input and
 * format output, but contain no core business logic.
 *
 * * ARCHITECTURAL RULE: Never inject these symbols into Application Use Cases
 * or Domain entities. The core application must remain completely agnostic
 * of its presentation mechanism.
 */
export const PRESENTATION_TYPES = {
  CliOutputService: Symbol.for('CliOutputService')
};
