import express, { json, urlencoded } from 'express';
import cors from 'cors';

import { type DiContainer } from '@infrastructure/di/DiContainer';
import { setContainer } from '@config/tsoa-ioc';
import { RegisterRoutes } from './generated/routes';

import { envConfig } from '@config/env';

export function startRestServer(container: DiContainer): void {
  const app = express();

  // Initialize the IoC bridge so tsoa can find your dependencies
  setContainer(container);

  // Enable CORS so the Vite dev server (port 5173) can talk to the Express server
  app.use(cors());
  app.use(json());
  // we never know...
  app.use(urlencoded({ extended: true }));

  // 🛑 TESTS
  // Put this right before the app routes are registered!
  app.use((req, res, next) => {
    if (!req.originalUrl.includes('/api/status')) {
      console.log(`📡 [INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
    }
    next(); // Pass control to the next middleware/router
  });

  // Let tsoa handle all the routing logic
  RegisterRoutes(app);

  app.listen(envConfig.port, () => {
    console.log(`REST API running on http://localhost:${envConfig.port}`);
  });
}
