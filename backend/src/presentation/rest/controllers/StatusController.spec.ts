import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { StatusController } from './StatusController';
import type { GetCampaignStatusUseCase } from '@application/usecases/GetCampaignStatusUseCase';
import type { CampaignStatus } from '@domain/models/CampaignStatus';

describe('StatusController', () => {
  let getStatusUseCaseMock: vi.Mocked<GetCampaignStatusUseCase>;
  let controller: StatusController;

  // Mock the TSOA response injector function
  const serverErrorMock = vi.fn((status, payload) => ({ status, payload }));

  beforeEach(() => {
    // 1. Create a mocked instance of the Use Case
    getStatusUseCaseMock = {
      execute: vi.fn()
    } as unknown as vi.Mocked<GetCampaignStatusUseCase>;

    // 2. Instantiate the controller with the mock
    controller = new StatusController(getStatusUseCaseMock);

    // 3. Suppress console.error so it doesn't pollute the test output terminal
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up mocks after each test
    vi.restoreAllMocks();
  });

  describe('getCampaignStatus', () => {
    it('should return the campaign status when the use case executes successfully', async () => {
      // Arrange: Setup the mock data and tell the use case to return it
      const mockStatus: CampaignStatus = {
        waiting: 10,
        active: 5,
        completed: 100,
        failed: 2,
        hardFailures: 1
      };
      getStatusUseCaseMock.execute.mockResolvedValue(mockStatus);

      // Act: Call the controller method
      const result = await controller.getCampaignStatus(serverErrorMock as any);

      // Assert: Verify behavior and return value
      expect(getStatusUseCaseMock.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStatus);
      expect(serverErrorMock).not.toHaveBeenCalled();
    });

    it('should handle errors and return a 500 server error response', async () => {
      // Arrange: Tell the use case to throw an error
      const mockError = new Error('Database connection failed');
      getStatusUseCaseMock.execute.mockRejectedValue(mockError);

      // Act: Call the controller method
      const result = await controller.getCampaignStatus(serverErrorMock as any);

      // Assert: Verify the use case was called, the error was logged, and the TSOA error response was triggered
      expect(getStatusUseCaseMock.execute).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(`Failed to fetch status: ${mockError}`);
      expect(serverErrorMock).toHaveBeenCalledWith(500, { error: 'Failed to fetch status' });

      // Verify that the controller correctly returned whatever the TSOA `@Res()` function generated
      expect(result).toEqual({
        status: 500,
        payload: { error: 'Failed to fetch status' }
      });
    });
  });
});
