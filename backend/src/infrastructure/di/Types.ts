import type {
  GetCampaignDetailsUseCase,
  GetCampaignStatusUseCase,
  GetCampaignsUseCase,
  MergeMailingListsUseCase,
  SendCampaignUseCase,
  UpdateDeliveryStatusUseCase,
  MonitorExpiringConsentsUseCase,
  ResolveCampaignContactsUseCase
} from '@application/usecases';
import type {
  CsvPort,
  DataSeeder,
  EmailPort,
  LanguagePort,
  LoggerPort,
  QueueMonitorPort,
  TimeProvider
} from '@domain/ports';
import type { CampaignHistoryRepository, ContactRepository, FailedEmailRepository } from '@domain/repositories';
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
  FailedEmailRepository: 'FailedEmailRepository',
  CampaignHistoryRepository: 'CampaignHistoryRepository',
  QueueMonitorPort: 'QueueMonitorPort',
  ContactRepository: 'ContactRepository',
  TimeProvider: 'TimeProvider',
  DataSeeder: 'DataSeeder',

  // Use Cases
  MergeMailingListsUseCase: 'MergeMailingListsUseCase',
  SendCampaignUseCase: 'SendCampaignUseCase',
  GetCampaignStatusUseCase: 'GetCampaignStatusUseCase',
  GetCampaignsUseCase: 'GetCampaignsUseCase',
  GetCampaignDetailsUseCase: 'GetCampaignDetailsUseCase',
  UpdateDeliveryStatusUseCase: 'UpdateDeliveryStatusUseCase',
  ResolveCampaignContactsUseCase: 'ResolveCampaignContactsUseCase',
  MonitorExpiringConsentsUseCase: 'MonitorExpiringConsentsUseCase'
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
  [DI_TYPES.QueueMonitorPort]: QueueMonitorPort;
  [DI_TYPES.TimeProvider]: TimeProvider;
  [DI_TYPES.DataSeeder]: DataSeeder;

  [DI_TYPES.FailedEmailRepository]: FailedEmailRepository;
  [DI_TYPES.CampaignHistoryRepository]: CampaignHistoryRepository;
  [DI_TYPES.ContactRepository]: ContactRepository;

  [DI_TYPES.MergeMailingListsUseCase]: MergeMailingListsUseCase;
  [DI_TYPES.SendCampaignUseCase]: SendCampaignUseCase;
  [DI_TYPES.GetCampaignStatusUseCase]: GetCampaignStatusUseCase;
  [DI_TYPES.GetCampaignsUseCase]: GetCampaignsUseCase;
  [DI_TYPES.GetCampaignDetailsUseCase]: GetCampaignDetailsUseCase;
  [DI_TYPES.UpdateDeliveryStatusUseCase]: UpdateDeliveryStatusUseCase;
  [DI_TYPES.ResolveCampaignContactsUseCase]: ResolveCampaignContactsUseCase;
  [DI_TYPES.MonitorExpiringConsentsUseCase]: MonitorExpiringConsentsUseCase;

  [PRESENTATION_TYPES.CliOutputService]: CliOutputService;
}
