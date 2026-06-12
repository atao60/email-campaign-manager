import express, { json, urlencoded, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { ValidateError } from 'tsoa'; // Optional but highly recommended for TSOA

import { type DiContainer } from '@infrastructure/di/DiContainer';
import { setContainer } from '@config/tsoa-ioc';
import { RegisterRoutes } from './generated/routes';
import { HttpError } from './errors/HttpError'; // Import your new error class

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

  // --- Global Error Handler ---
  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    // Catch our custom manually thrown HTTP Errors (like 400 Bad Request)
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return; // Use 'return;' instead of 'return res...' to satisfy TS
    }

    // Catch TSOA's automatic validation errors
    if (err instanceof ValidateError) {
      console.warn(`[Validation Error] on ${req.path}:`, err.fields);
      res.status(422).json({
        error: 'Validation Failed',
        details: err?.fields
      });
      return;
    }

    // Catch unhandled internal server errors
    if (err instanceof Error) {
      console.error(`[Fatal Error] on ${req.path}:`, err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    next();
  };

  app.use(errorHandler);

  app.listen(envConfig.port, () => {
    console.log(`REST API running on http://localhost:${envConfig.port}`);
  });
}
