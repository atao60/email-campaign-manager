import Redis from 'ioredis';

import { DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES, INFRA_TYPES, PRESENTATION_TYPES } from '@infrastructure/di/Types';

import type { EmailPort } from '@domain/ports';
import { EmailWorker } from '@infrastructure/workers/EmailWorker';

// Adapters
import { ConsoleLogger } from '@infrastructure/services/ConsoleLogger'; // Assuming a basic logger
import { I18nextLanguageAdapter } from '@infrastructure/adapters/I18nextLanguageAdapter';
import { NodemailerAdapter } from '@infrastructure/adapters/NodemailerAdapter';
import { CsvAdapter } from '@infrastructure/adapters/CsvAdapter';
import { RedisEmailQueueAdapter } from '@infrastructure/adapters/RedisEmailQueueAdapter';
import { JsonFailedEmailRepositoryAdapter } from '@infrastructure/adapters/repositories/JsonFailedEmailRepositoryAdapter';
import { BullMqMonitorAdapter } from '@infrastructure/adapters/BullMqMonitorAdapter';
// import { InMemoryCampaignHistoryRepositoryAdapter } from '@infrastructure/adapters/repositories/InMemoryCampaignHistoryRepositoryAdapter';
import { FileSystemCampaignHistoryRepositoryAdapter } from '@infrastructure/adapters/repositories/FileSystemCampaignHistoryRepositoryAdapter';

// Presentation & Use Cases
import {
  MergeMailingListsUseCase,
  SendCampaignUseCase,
  GetCampaignsUseCase,
  GetCampaignDetailsUseCase,
  GetCampaignStatusUseCase,
  UpdateDeliveryStatusUseCase
} from '@application/usecases';

import { CliOutputService } from '@presentation/cli/services/CliOutputService';

interface InfraDependencies {
  [INFRA_TYPES.RedisClient]: Redis;
  [INFRA_TYPES.DirectMailer]: EmailPort;
  [INFRA_TYPES.EmailWorker]: EmailWorker;
}

function resolveInfra<K extends keyof InfraDependencies>(c: DiContainer, key: K): InfraDependencies[K] {
  return c.resolve(key);
}

export function configureDependencyInjection(): void {
  const container = DiContainer.getInstance();

  // 1. Core Services & Connections
  container.registerSingleton(DI_TYPES.Logger, () => new ConsoleLogger());
  container.registerSingleton(DI_TYPES.LanguageService, () => new I18nextLanguageAdapter());
  container.registerSingleton(INFRA_TYPES.RedisClient, () => new Redis({ maxRetriesPerRequest: null }));

  // 2. Adapters
  container.registerSingleton(DI_TYPES.CsvPort, () => new CsvAdapter());

  container.registerSingleton(DI_TYPES.FailedEmailRepository, () => new JsonFailedEmailRepositoryAdapter());

  // FUTURE in memory as dev mod and in files as staging mode?
  container.registerSingleton(
    DI_TYPES.CampaignHistoryRepository,
    () => new FileSystemCampaignHistoryRepositoryAdapter()
  );

  // The physical mailer is no longer the public EmailPort, it's an internal dependency
  container.registerSingleton(INFRA_TYPES.DirectMailer, (c) => new NodemailerAdapter(c.resolve(DI_TYPES.Logger)));

  // The application's EmailPort is now strictly the Redis Queue
  container.registerSingleton(
    DI_TYPES.EmailPort,
    (c) => new RedisEmailQueueAdapter(resolveInfra(c, INFRA_TYPES.RedisClient))
  );

  container.registerSingleton(
    DI_TYPES.QueueMonitorPort,
    (c) => new BullMqMonitorAdapter(resolveInfra(c, INFRA_TYPES.RedisClient))
  );

  // 3. Background Workers
  container.registerSingleton(
    INFRA_TYPES.EmailWorker,
    (c) =>
      new EmailWorker(
        resolveInfra(c, INFRA_TYPES.RedisClient),
        resolveInfra(c, INFRA_TYPES.DirectMailer),
        c.resolve(DI_TYPES.FailedEmailRepository),
        c.resolve(DI_TYPES.Logger)
      )
  );

  // 4. Use Cases
  container.registerSingleton(
    DI_TYPES.MergeMailingListsUseCase,
    (c) => new MergeMailingListsUseCase(c.resolve(DI_TYPES.CsvPort))
  );

  container.registerSingleton(
    DI_TYPES.SendCampaignUseCase,
    (c) =>
      new SendCampaignUseCase(
        c.resolve(DI_TYPES.CsvPort),
        c.resolve(DI_TYPES.EmailPort),
        c.resolve(DI_TYPES.Logger),
        c.resolve(DI_TYPES.CampaignHistoryRepository)
      )
  );

  container.registerSingleton(
    DI_TYPES.GetCampaignsUseCase,
    (c) => new GetCampaignsUseCase(c.resolve(DI_TYPES.CampaignHistoryRepository))
  );

  container.registerSingleton(
    DI_TYPES.GetCampaignDetailsUseCase,
    (c) => new GetCampaignDetailsUseCase(c.resolve(DI_TYPES.CampaignHistoryRepository))
  );

  container.registerSingleton(
    DI_TYPES.GetCampaignStatusUseCase,
    (c) => new GetCampaignStatusUseCase(c.resolve(DI_TYPES.QueueMonitorPort), c.resolve(DI_TYPES.FailedEmailRepository))
  );

  container.registerSingleton(
    DI_TYPES.UpdateDeliveryStatusUseCase,
    (c) => new UpdateDeliveryStatusUseCase(c.resolve(DI_TYPES.CampaignHistoryRepository))
  );

  // 5. Presentation
  container.registerSingleton(
    PRESENTATION_TYPES.CliOutputService,
    (c) => new CliOutputService(c.resolve(DI_TYPES.LanguageService))
  );
}
