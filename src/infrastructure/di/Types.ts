import type { MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';
import type { SendCampaignUseCase } from '@application/usecases/SendCampaignUseCase';
import type { CsvPort } from '@domain/ports/CsvPort';
import type { EmailPort } from '@domain/ports/EmailPort';
import type { LanguagePort } from '@domain/ports/LanguagePort';
import type { LoggerPort } from '@domain/ports/LoggerPort';
import type { CliOutputService } from '@presentation/cli/services/CliOutputService';

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
  LanguageService: 'LanguageService',
  Logger: 'Logger',

  // Ports
  CsvPort: 'CsvPort',
  EmailPort: 'EmailPort',
  FailedEmailRepositoryPort: 'FailedEmailRepositoryPort',

  // Use Cases
  MergeMailingListsUseCase: 'MergeMailingListsUseCase',
  SendCampaignUseCase: 'SendCampaignUseCase'
} as const;

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
  RedisClient: 'RedisClient',

  // Internal Adapters
  DirectMailer: 'DirectMailer',

  // Background Workers
  EmailWorker: 'EmailWorker'
} as const;

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
  CliOutputService: 'CliOutputService'
} as const;

export type DependencyToken =
  | (typeof DI_TYPES)[keyof typeof DI_TYPES]
  | (typeof INFRA_TYPES)[keyof typeof INFRA_TYPES]
  | (typeof PRESENTATION_TYPES)[keyof typeof PRESENTATION_TYPES];

export interface AppDependencies {
  [DI_TYPES.LanguageService]: LanguagePort;
  [DI_TYPES.Logger]: LoggerPort;
  [DI_TYPES.CsvPort]: CsvPort;
  [DI_TYPES.EmailPort]: EmailPort;
  [DI_TYPES.MergeMailingListsUseCase]: MergeMailingListsUseCase;
  [DI_TYPES.SendCampaignUseCase]: SendCampaignUseCase;

  [PRESENTATION_TYPES.CliOutputService]: CliOutputService;
}
