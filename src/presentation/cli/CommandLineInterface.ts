import process from 'node:process';

import { Command } from 'commander';
import { type DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES, PRESENTATION_TYPES } from '@infrastructure/di/Types';
import { type MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';
import { type LanguagePort } from '@domain/ports/LanguagePort';
import { type LoggerPort } from '@domain/ports/LoggerPort';
import { type CliOutputService } from '@presentation/cli/services/CliOutputService';

export async function startCli(container: DiContainer): Promise<void> {
  const program = new Command();

  const i18n = container.resolve<LanguagePort>(DI_TYPES.LanguageService);
  const logger = container.resolve<LoggerPort>(DI_TYPES.Logger);
  const outputService = container.resolve<CliOutputService>(PRESENTATION_TYPES.CliOutputService);

  await i18n.init();

  program
    .command('merge')
    .description(i18n.translate('cli.commands.merge.description'))
    .argument('<output>', i18n.translate('cli.commands.merge.argOutput'))
    .argument('<inputs...>', i18n.translate('cli.commands.merge.argInputs'))
    .option('-v, --verbose', 'Output internal telemetry')
    .action(async (output, inputs, options) => {
      const useCase = container.resolve<MergeMailingListsUseCase>(DI_TYPES.MergeMailingListsUseCase);

      try {
        if (options.verbose) {
          logger.info('Starting merge operation', { inputs, output });
        }

        await useCase.execute(inputs, output);

        // UI Output: Clean, semantic, and localized output for direct communication to the user
        outputService.success('cli.commands.merge.success', { count: inputs.length, output });

      } catch (error) {
        // Telemetry: Record the exact stack trace and metadata for the developers
        logger.error('Merge operation failed fatally', error);

        // Semantic, localized error UI Output: A friendly, clean error message for the user
        outputService.error('cli.commands.merge.error');
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}
