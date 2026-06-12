import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { ValidateError } from 'tsoa';

import { startRestServer } from './RestServer';
import { setContainer } from '@config/tsoa-ioc';
import { RegisterRoutes } from './generated/routes';
import { HttpError } from './errors/HttpError';
import type { DiContainer } from '@infrastructure/di/DiContainer';

// --- 1. Define Mocks ---

// Create a mock Express application
const mockApp = {
  use: vi.fn(),
  listen: vi.fn((port, callback) => {
    // Automatically trigger the callback so we can test the console.log
    if (callback) callback();
  })
};

// Mock the express module
vi.mock('express', () => ({
  default: vi.fn(() => mockApp),
  json: vi.fn(() => 'mock-json-middleware'),
  urlencoded: vi.fn(() => 'mock-urlencoded-middleware')
}));

vi.mock('cors', () => ({
  default: vi.fn(() => 'mock-cors-middleware')
}));

vi.mock('@config/tsoa-ioc', () => ({
  setContainer: vi.fn()
}));

vi.mock('./generated/routes', () => ({
  RegisterRoutes: vi.fn()
}));

// Mock the environment config module
vi.mock('@config/env', () => ({
  envConfig: {
    port: 3000
  }
}));

describe('RestServer', () => {
  const mockContainer = {} as DiContainer;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console.log to prevent test output clutter and allow assertion
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should wire up Express middleware, DI, and routes correctly', () => {
    // Act
    startRestServer(mockContainer);

    // Assert: TSOA IoC Bridge setup
    expect(setContainer).toHaveBeenCalledWith(mockContainer);

    // Assert: Express instantiation
    expect(express).toHaveBeenCalled();

    // Assert: Middleware registrations (CORS, JSON, URL-encoded)
    expect(cors).toHaveBeenCalled();
    expect(json).toHaveBeenCalled();
    expect(urlencoded).toHaveBeenCalledWith({ extended: true });

    // Verify they were actually passed to app.use()
    expect(mockApp.use).toHaveBeenCalledWith('mock-cors-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('mock-json-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('mock-urlencoded-middleware');

    // Assert: Route generation
    expect(RegisterRoutes).toHaveBeenCalledWith(mockApp);

    // Assert: Server started with the port from envConfig
    expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    // Verify the console.log inside the listen callback fired correctly
    expect(console.log).toHaveBeenCalledWith('REST API running on http://localhost:3000');
  });

  describe('Custom Logging Middleware', () => {
    it('should log incoming requests EXCEPT for /api/status', () => {
      startRestServer(mockContainer);

      // Find the custom middleware function passed to app.use()
      // It will be the only argument passed to app.use that is a function
      const middlewareCalls = mockApp.use.mock.calls.flat();
      const customMiddleware = middlewareCalls.find((arg) => typeof arg === 'function' && arg.length === 3);

      expect(customMiddleware).toBeDefined();

      const mockNext = vi.fn();
      let mockReq = { method: 'GET', originalUrl: '/campaigns/123' };
      const mockRes = {};

      // Act: Simulate a request to a normal endpoint
      customMiddleware!(mockReq, mockRes, mockNext);

      // Assert: It logs the normal endpoint and calls next()
      expect(console.log).toHaveBeenCalledWith('📡 [INCOMING REQUEST] GET /campaigns/123');
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset logs for the next assertion
      vi.mocked(console.log).mockClear();

      // Act: Simulate a request to the status endpoint (polling)
      mockReq = { method: 'GET', originalUrl: '/api/status' };
      customMiddleware!(mockReq, mockRes, mockNext);

      // Assert: It skips logging for /api/status but still calls next()
      expect(console.log).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('Global Error Handler', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errorHandler: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockReq: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockRes: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockNext: any;

    beforeEach(() => {
      startRestServer(mockContainer);

      // Express identifies error handlers by their 4 arguments: (err, req, res, next)
      const middlewareCalls = mockApp.use.mock.calls.flat();
      errorHandler = middlewareCalls.find((arg) => typeof arg === 'function' && arg.length === 4);

      mockReq = { path: '/api/users' };
      mockRes = {
        // Mock res.status to return 'this' (res) so res.status().json() chaining works
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      mockNext = vi.fn();
    });

    it('should extract and register the error handler middleware', () => {
      expect(errorHandler).toBeDefined();
    });

    it('should format and return HttpError correctly', () => {
      const httpError = new HttpError(404, 'User not found');

      errorHandler(httpError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled(); // Stops propagation
    });

    it('should format and return TSOA ValidateError correctly', () => {
      const validationFields = { email: { message: 'Invalid email format' } };
      const validateError = new ValidateError(validationFields, 'Validation failed');

      errorHandler(validateError, mockReq, mockRes, mockNext);

      expect(console.warn).toHaveBeenCalledWith('[Validation Error] on /api/users:', validationFields);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation Failed',
        details: validationFields
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch generic unhandled Errors and return a 500 status', () => {
      const genericError = new Error('Database connection lost');

      errorHandler(genericError, mockReq, mockRes, mockNext);

      expect(console.error).toHaveBeenCalledWith('[Fatal Error] on /api/users:', genericError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() if the thrown object is not an Error instance', () => {
      const stringError = 'Just a raw string thrown';

      errorHandler(stringError, mockReq, mockRes, mockNext);

      // Since 'typeof string' is not an instance of Error, it falls through to next()
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});
