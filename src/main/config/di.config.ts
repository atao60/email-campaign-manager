import Redis from 'ioredis';

import { DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES, INFRA_TYPES } from '@infrastructure/di/Types';

// Adapters
import { ConsoleLogger } from '@infrastructure/services/ConsoleLogger'; // Assuming a basic logger
import { I18nextLanguageAdapter } from '@infrastructure/adapters/I18nextLanguageAdapter';
import { NodemailerAdapter } from '@infrastructure/adapters/NodemailerAdapter';
import { CsvAdapter } from '@infrastructure/adapters/CsvAdapter';
import { RedisEmailQueueAdapter } from '@infrastructure/adapters/RedisEmailQueueAdapter';
import { EmailWorker } from '@infrastructure/workers/EmailWorker';

// Use Cases
import { MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';

export function configureDependencyInjection(): void {
  const container = DiContainer.getInstance();

  // 1. Core Services & Connections
  container.registerSingleton(DI_TYPES.Logger, () => new ConsoleLogger());
  container.registerSingleton(DI_TYPES.LanguageService, () => new I18nextLanguageAdapter());
  container.registerSingleton(INFRA_TYPES.RedisClient, () => new Redis({ maxRetriesPerRequest: null }));

  // 2. Adapters
  container.registerSingleton(DI_TYPES.CsvPort, () => new CsvAdapter());

  // The physical mailer is no longer the public EmailPort, it's an internal dependency
  container.registerSingleton(INFRA_TYPES.DirectMailer, (c) =>
    new NodemailerAdapter(c.resolve(DI_TYPES.Logger))
  );

  // The application's EmailPort is now strictly the Redis Queue
  container.registerSingleton(DI_TYPES.EmailPort, (c) =>
    new RedisEmailQueueAdapter(c.resolve(INFRA_TYPES.RedisClient))
  );

  // 3. Background Workers
  container.registerSingleton(INFRA_TYPES.EmailWorker, (c) =>
    new EmailWorker(
      c.resolve(INFRA_TYPES.RedisClient),
      c.resolve(INFRA_TYPES.DirectMailer), // Inject Nodemailer into the worker
      c.resolve(DI_TYPES.Logger)
    )
  );

  // 4. Use Cases
  container.registerSingleton(DI_TYPES.MergeMailingListsUseCase, (c) =>
    new MergeMailingListsUseCase(c.resolve(DI_TYPES.CsvPort))
  );
}
