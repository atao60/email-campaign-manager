import express, { json, urlencoded } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { env } from 'node:process';

import { type DiContainer } from '@infrastructure/di/DiContainer';

import { setContainer } from '@infrastructure/di/tsoa-ioc';
import { RegisterRoutes } from './generated/routes';

// Load variables from .env file
dotenv.config();

// Use passed PORT or as default 8080
const port = env.PORT ?? 8080;

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
  // Put this right before your routes are registered!
  app.use((req, res, next) => {
    if (!req.originalUrl.includes('/api/status')) {
      console.log(`📡 [INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
    }
    next(); // Pass control to the next middleware/router
  });

  // Let tsoa handle all the routing logic
  RegisterRoutes(app);

  app.listen(port, () => {
    console.log(`REST API running on http://localhost:${port}`);
  });
}
