import express from 'express';
import cors from 'cors';
import process from 'node:process';

import { type DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES } from '@infrastructure/di/Types';
import type { MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';
import { type GetCampaignStatusUseCase } from '@application/usecases/GetCampaignStatusUseCase';

export function startRestApi(container: DiContainer): void {
  const app = express();

  // Enable CORS so the Vite dev server (port 5173) can talk to Express (port 3000)
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
  });

  app.get('/api/status', async (req, res) => {
    const useCase = container.resolve<GetCampaignStatusUseCase>(DI_TYPES.GetCampaignStatusUseCase);
    try {
      const status = await useCase.execute();
      res.json(status);
    } catch (error) {
      console.error(`Failed to fetch status: ${error}`);
      res.status(500).json({ error: `Failed to fetch status` });
    }
  });

  // The implemented POST route
  app.post('/campaigns/merge', async (req, res) => {
    console.log('POST /campaigns/merge');
    try {
      const { inputs, output } = req.body;

      // Basic validation
      if (!inputs || !Array.isArray(inputs) || !output) {
        return res.status(400).json({
          error: 'Invalid payload. Requires "inputs" array and "output" string.'
        });
      }

      // Resolve the use case from the container
      const useCase = container.resolve<MergeMailingListsUseCase>(DI_TYPES.MergeMailingListsUseCase);

      // Execute business logic
      await useCase.execute(inputs, output);

      res.status(200).json({
        message: `Successfully merged lists into ${output}`
      });
    } catch (error) {
      console.error('Merge error:', error);
      res.status(500).json({ error: 'Internal Server Error during merge.' });
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`REST API running on http://localhost:${port}`);
  });
}
