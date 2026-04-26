import { Command } from 'commander';
import { type DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES } from '@infrastructure/di/Types';
import { type MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';

export function startCli(container: DiContainer): void {
  const program = new Command();

  program
    .command('merge')
    .description('Merge multiple CSV mailing lists and remove duplicates')
    .argument('<output>', 'Output CSV file path')
    .argument('<inputs...>', 'Input CSV files')
    .action(async (output, inputs) => {
      const useCase = container.resolve<MergeMailingListsUseCase>(DI_TYPES.MergeMailingListsUseCase);
      await useCase.execute(inputs, output);
      console.log(`Successfully merged lists into ${output}`);
    });

  program.parseAsync(process.argv);
}
