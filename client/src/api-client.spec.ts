import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from './api-client';

describe('apiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Mock the browser's native fetch API
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    // Restore fetch to prevent bleeding into other tests
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should fetch the campaign status successfully', async () => {
    const mockData = {
      waiting: 5,
      active: 1,
      completed: 10,
      failed: 0,
      hardFailures: 2
    };

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData
    } as Response);

    const result = await apiClient.getStatus();

    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/api/status');
    expect(result).toEqual(mockData);
  });

  it('should throw an error if the network response is not ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false
    } as Response);

    await expect(apiClient.getStatus()).rejects.toThrow('Network response was not ok');
  });
});
