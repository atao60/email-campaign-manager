import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { json, urlencoded } from 'express';
import cors from 'cors';

import { startRestServer } from './RestServer';
import { setContainer } from '@config/tsoa-ioc';
import { RegisterRoutes } from './generated/routes';
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
      const customMiddleware = middlewareCalls.find((arg) => typeof arg === 'function');

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
});
