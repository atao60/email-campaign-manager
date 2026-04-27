import process from 'node:process';

import { Command } from 'commander';
import { type DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES } from '@infrastructure/di/Types';
import { type MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';
import type { LoggerPort } from '@domain/ports/LoggerPort';

export function startCli(container: DiContainer): void {
  const program = new Command();

  program
  .command('merge')
  .description('Merge multiple CSV mailing lists and remove duplicates')
  .argument('<output>', 'Output CSV file path')
  .argument('<inputs...>', 'Input CSV files')
  .option('-v, --verbose', 'Output internal telemetry')
  .action(async (output, inputs, options) => {
    const logger = container.resolve<LoggerPort>(DI_TYPES.Logger);
    const useCase = container.resolve<MergeMailingListsUseCase>(DI_TYPES.MergeMailingListsUseCase);

    try {
      if (options.verbose) {
        logger.info('Starting merge operation', { inputs, output });
      }

      await useCase.execute(inputs, output);

      // UI Output: Clean, direct communication to the user
      console.log(`✅ Successfully merged ${inputs.length} lists into ${output}`);

    } catch (error) {
      // Telemetry: Record the exact stack trace and metadata for the developers
      logger.error('Merge operation failed fatally', error);

      // UI Output: A friendly, clean error message for the user
      console.error(`❌ Error: Could not merge lists. Please check your file paths.`);
      process.exit(1);
    }
  });

  program.parseAsync(process.argv);
}
