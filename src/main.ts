import { argv } from 'node:process';

import { configureDependencyInjection } from '@config/di.config';

import { DiContainer } from '@infrastructure/di/DiContainer';
import { startCli } from '@presentation/cli/CommandLineInterface';
import { startRestApi } from '@presentation/rest/ExpressApi';

async function bootstrap() {
  // 1. Setup IoC
  configureDependencyInjection();
  const container = DiContainer.getInstance();

  // 2. Start REST API in background
  startRestApi(container);

  // 3. Process CLI commands
  if (argv.length > 2) {
    startCli(container);
  } else {
    console.log('App running in server mode. Use CLI arguments to trigger specific commands.');
  }
}

bootstrap().catch(console.error);
