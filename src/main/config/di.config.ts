
import { DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES } from '@infrastructure/di/Types';

// Adapters
import { ConsoleLogger } from '@infrastructure/services/ConsoleLogger'; // Assuming a basic logger
import { I18nextLanguageAdapter } from '@infrastructure/adapters/I18nextLanguageAdapter';
import { NodemailerAdapter } from '@infrastructure/adapters/NodemailerAdapter';
import { CsvAdapter } from '@infrastructure/adapters/CsvAdapter'; // Assuming a basic CSV wrapper

// Use Cases
import { MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';

export function configureDependencyInjection(): void {
  const container = DiContainer.getInstance();

  // 1. Register Core Services
  container.registerSingleton(DI_TYPES.Logger, () => new ConsoleLogger());
  container.registerSingleton(DI_TYPES.LanguageService, () => new I18nextLanguageAdapter());

  // 2. Register Infrastructure Adapters (Ports Implementation)
  container.registerSingleton(DI_TYPES.CsvPort, () => new CsvAdapter());
  
  // Notice how the factory receives the container 'c' to resolve the Logger dependency injected into Nodemailer
  container.registerSingleton(DI_TYPES.EmailPort, (c) => 
    new NodemailerAdapter(c.resolve(DI_TYPES.Logger))
  );

  // 3. Register Application Use Cases
  container.registerSingleton(DI_TYPES.MergeMailingListsUseCase, (c) => 
    new MergeMailingListsUseCase(c.resolve(DI_TYPES.CsvPort))
  );
}
