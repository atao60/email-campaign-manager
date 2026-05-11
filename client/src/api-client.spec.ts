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

  describe('getStatus', () => {
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

  describe('getCampaigns', () => {
    it('should fetch the list of campaigns successfully', async () => {
      const mockCampaigns = [
        { id: '1', subject: 'Campaign 1', status: 'completed' },
        { id: '2', subject: 'Campaign 2', status: 'active' }
      ];

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockCampaigns
      } as Response);

      const result = await apiClient.getCampaigns();

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/campaigns');
      expect(result).toEqual(mockCampaigns);
    });

    it('should throw an error if the network response is not ok', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false
      } as Response);

      await expect(apiClient.getCampaigns()).rejects.toThrow('Failed to fetch campaigns');
    });
  });

  describe('getCampaignDetails', () => {
    it('should fetch campaign details successfully', async () => {
      const mockDetail = { id: '123', subject: 'Promo', totalContacts: 50 };

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockDetail
      } as Response);

      const result = await apiClient.getCampaignDetails('123');

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/campaigns/123');
      expect(result).toEqual(mockDetail);
    });

    it('should throw an error if the network response is not ok', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false
      } as Response);

      await expect(apiClient.getCampaignDetails('123')).rejects.toThrow('Failed to fetch details for campaign 123');
    });
  });

  describe('launchCampaign', () => {
    it('should successfully launch a campaign with FormData', async () => {
      const mockResponse = { processed: 25 };

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const formData = new FormData();
      formData.append('subject', 'Test Subject');

      const result = await apiClient.launchCampaign(formData);

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/campaigns/send', {
        method: 'POST',
        body: formData
      });
      expect(result).toEqual(mockResponse);
    });

    it('should extract the "error" property from the backend when the response is not ok', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid CSV format provided' })
      } as Response);

      const formData = new FormData();

      await expect(apiClient.launchCampaign(formData)).rejects.toThrow('Invalid CSV format provided');
    });

    it('should fallback to the "message" property if "error" is not present', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'A validation message occurred' })
      } as Response);

      const formData = new FormData();

      await expect(apiClient.launchCampaign(formData)).rejects.toThrow('A validation message occurred');
    });

    it('should fallback to the HTTP status code if the backend returns unparseable HTML/text', async () => {
      // Simulate an Nginx/Express standard 500 error page that fails JSON parsing
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => Promise.reject(new SyntaxError('Unexpected token < in JSON'))
      } as unknown as Response);

      const formData = new FormData();

      await expect(apiClient.launchCampaign(formData)).rejects.toThrow('Server error: 502');
    });
  });
});
