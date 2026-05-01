import { argv, exit } from 'node:process';
import { error, log } from 'node:console';

import { configureDependencyInjection } from '@config/di.config';

import { DiContainer } from '@infrastructure/di/DiContainer';
import { startCli } from '@presentation/cli/CommandLineInterface';
import { startRestServer } from '@presentation/rest/RestServer';
import { INFRA_TYPES } from '@infrastructure/di/Types';

async function bootstrap() {
  configureDependencyInjection();
  const container = DiContainer.getInstance();

  const isCliMode = argv.length > 2;

  if (isCliMode) {
    // === CLI MODE ===
    // We only run the CLI. We await it so Node knows when it's done.
    await startCli(container);
    // Exit cleanly once Commander is finished, dropping any active connections (like Redis)
    exit(0);
  } else {
    // === SERVER MODE ===
    log('Starting application in Server Mode...');

    // Start Background Workers (forces the lazy-loaded container to instantiate the worker)
    container.resolve(INFRA_TYPES.EmailWorker);
    log('Background Email Worker started.');

    // Start REST API in background
    startRestServer(container);

    log('App running in server mode. Use CLI arguments to trigger specific commands.');
  }
}

bootstrap().catch((err) => {
  error('Fatal bootstrap error:', err);
  exit(1);
});
