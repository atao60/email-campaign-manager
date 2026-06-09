import { argv, exit } from 'node:process';
import { Command } from 'commander';

import { type DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES, PRESENTATION_TYPES } from '@infrastructure/di/Types';

export async function startCli(container: DiContainer): Promise<void> {
  const program = new Command();

  const i18n = container.resolve(DI_TYPES.LanguageService);
  const logger = container.resolve(DI_TYPES.Logger);
  const outputService = container.resolve(PRESENTATION_TYPES.CliOutputService);

  await i18n.init();

  const t = i18n.translate;

  program
    .command('merge')
    .description(t('cli:commands.merge.description'))
    .argument('<output>', t('cli:commands.merge.argOutput'))
    .argument('<inputs...>', t('cli:commands.merge.argInputs'))
    .option('-e, --exclude <files...>', t('cli:commands.merge.optionExclude', { defaultValue: 'Files to exclude' }), [])
    .option('-v, --verbose', 'Output internal telemetry')
    .action(async (output, inputs, options) => {
      const useCase = container.resolve(DI_TYPES.MergeMailingListsUseCase);

      try {
        const exclusions = options.exclude;

        if (options.verbose) {
          logger.info('Starting merge operation', { inputs, exclusions, output });
        }

        await useCase.execute(inputs, exclusions, output);

        // UI Output: Clean, semantic, and localized output for direct communication to the user
        outputService.success('cli:commands.merge.success', { count: inputs.length, output });
      } catch (error) {
        // Telemetry: Record the exact stack trace and metadata for the developers
        logger.error('Merge operation failed fatally', error);

        // Semantic, localized error UI Output: A friendly, clean error message for the user
        outputService.error('cli:commands.merge.error');
        exit(1);
      }
    });

  program
    .command('send-campaign')
    .description('Read contacts from a CSV and send them a campaign email')
    .argument('<csvFile>', 'Path to the CSV contacts list')
    .option('-l, --label <label>', 'Optional label to designate the campaign')
    .action(async (csvFile, options) => {
      const useCase = container.resolve(DI_TYPES.SendCampaignUseCase);

      const subject = 'Welcome to our new platform!';
      const html = '<h1>Hello {{firstName}},</h1><p>We are thrilled to have you.</p>';

      try {
        const count = await useCase.execute(csvFile, subject, {
          html,
          ...(options.label && { label: options.label })
        });

        outputService.success('cli:commands.sendCampaign.success', { count: count.toString(), file: csvFile });

        // Brief timeout to ensure BullMQ flushes the jobs to Redis before Node exits
        setTimeout(() => exit(0), 1000);
      } catch (error) {
        logger.error('Failed to queue campaign', error);
        outputService.error('cli:commands.sendCampaign.error');
        exit(1);
      }
    });

  program
    .command('campaign-status')
    .description('View real-time background processing metrics')
    .action(async () => {
      const useCase = container.resolve(DI_TYPES.GetCampaignStatusUseCase);

      try {
        const status = await useCase.execute();

        outputService.info('cli:commands.status.header');
        outputService.raw(t('cli:commands.status.waiting', { total: status.waiting.toString() }));
        outputService.raw(t('cli:commands.status.active', { total: status.active.toString() }));
        outputService.raw(t('cli:commands.status.completed', { total: status.completed.toString() }));
        outputService.raw(t('cli:commands.status.failed', { total: status.failed.toString() }));
        outputService.raw(t('cli:commands.status.separator'));
        outputService.raw(t('cli:commands.status.hardFailures', { total: status.hardFailures.toString() }));

        exit(0);
      } catch (error) {
        logger.error('Failed to retrieve status', error);
        outputService.error('cli:commands.status.error');
        exit(1);
      }
    });

  await program.parseAsync(argv);
}
