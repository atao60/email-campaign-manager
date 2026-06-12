import { argv, exit } from 'node:process';
import { error, log } from 'node:console';
import { schedule } from 'node-cron';

import { configureDependencyInjection } from '@config/di.config';

import { DiContainer } from '@infrastructure/di/DiContainer';
import { startCli } from '@presentation/cli/CommandLineInterface';
import { startRestServer } from '@presentation/rest/RestServer';
import { DI_TYPES, INFRA_TYPES } from '@infrastructure/di/Types';
import { createCronSchedule } from '@infrastructure/cron/CronFactory';

import { envConfig } from '@config/env';

/**
 * ==========================================
 * Application Entry Point (Bootstrap)
 * ==========================================
 *
 * @rule
 * Boots up the Dependency Injection container and directs traffic: it either runs a
 * short-lived CLI command and exits, or it spins up the long-running Express server
 * and background workers.
 *
 * @why (CLI vs. Server Mode Isolation)
 * It is critical to strictly separate the initialization logic of the Server
 * from the CLI to prevent process hanging and resource leaks. Background workers,
 * active queue listeners, and automated schedule monitors must NEVER be
 * instantiated when executing a CLI command.
 * Regarding the GDPR Consent Monitor (`node-cron`):
 * 1. **Event Loop Hanging:** `node-cron` creates active timeouts in the Node.js
 * event loop. If registered during a CLI command (e.g., `npm run cli merge`),
 * the command would successfully finish its task but the terminal would hang
 * indefinitely, waiting for the cron job to fire.
 * 2. **Ephemeral Context:** CLI commands are designed to be short-lived. They
 * execute and die immediately. Registering a scheduled background task in a
 * process that only lives for 2 seconds is structurally useless.
 *
 * @how
 * - Evaluates `process.argv` to determine the execution intent.
 * - **CLI Mode:** Awaits a single `commander` action and explicitly calls
 * `process.exit(0)` to gracefully tear down the process and free terminal control.
 * - **Server Mode:** Bootstraps all long-lived application layers: the Express
 * REST API, the Redis BullMQ worker, and the persistent nightly GDPR monitor.
 */
async function bootstrap() {
  configureDependencyInjection();
  const container = DiContainer.getInstance();

  const seeder = container.resolve(DI_TYPES.DataSeeder);
  await seeder.seed();

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

    // Initialize i18n BEFORE anything else
    const languageService = container.resolve(DI_TYPES.LanguageService);
    await languageService.init();
    log(`Language service initialized (Default: ${envConfig.app.defaultLanguage.toUpperCase()}).`);

    // Start Background Workers (forces the lazy-loaded container to instantiate the worker)
    container.resolve(INFRA_TYPES.EmailWorker);
    log('Background Email Worker started.');

    // Start GDPR Compliance Monitor (Cron Job)
    const gdprMonitor = container.resolve(DI_TYPES.MonitorExpiringConsentsUseCase);
    const logger = container.resolve(DI_TYPES.Logger);

    // Schedule the GDPR checking job to run
    const scheduleExpression = createCronSchedule(envConfig.gdpr.checkingTimeOfDay, envConfig.gdpr.checkingPeriodicity);
    schedule(scheduleExpression, async () => {
      logger.info('⏰ [Cron] Triggering nightly GDPR Monitor...');
      try {
        await gdprMonitor.execute();
      } catch (err) {
        logger.error('[Cron] GDPR Monitor failed during execution:', err);
      }
    });
    log(
      `Background GDPR Cron Job registered (${envConfig.gdpr.checkingTimeOfDay} ${envConfig.gdpr.checkingPeriodicity}).`
    );

    // Start REST API in background
    startRestServer(container);

    log('App running in server mode. Use CLI arguments to trigger specific commands.');
  }
}

bootstrap().catch((err) => {
  error('Fatal bootstrap error:', err);
  exit(1);
});
