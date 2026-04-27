import { argv } from 'node:process';

import { configureDependencyInjection } from '@config/di.config';

import { DiContainer } from '@infrastructure/di/DiContainer';
import { startCli } from '@presentation/cli/CommandLineInterface';
import { startRestApi } from '@presentation/rest/ExpressApi';
import { INFRA_TYPES } from '@infrastructure/di/Types';

async function bootstrap() {
  // Setup IoC
  configureDependencyInjection();
  const container = DiContainer.getInstance();

  // Start Background Workers (forces the lazy-loaded container to instantiate the worker)
  container.resolve(INFRA_TYPES.EmailWorker);
  console.log('Background Email Worker started.');

  // Start REST API in background
  startRestApi(container);

  // Process CLI commands
  if (argv.length > 2) {
    startCli(container);
  } else {
    console.log('App running in server mode. Use CLI arguments to trigger specific commands.');
  }
}

bootstrap().catch(console.error);
