import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiClient, type LaunchCampaignRequest } from './api-client';

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
    const dummyCsv = new File(['name,email\nTest,test@test.com'], 'contacts.csv', { type: 'text/csv' });

    it('should successfully launch a campaign and correctly map standard fields to FormData', async () => {
      const mockResponse = { processed: 25 };

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const payload: LaunchCampaignRequest = {
        subject: 'Test Subject',
        csvFile: dummyCsv,
        html: '<p>Hi</p>'
      };

      const result = await apiClient.launchCampaign(payload);

      // Verify response
      expect(result).toEqual(mockResponse);

      // Verify the fetch call url
      const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(fetchCallArgs[0]).toBe('http://localhost:3000/campaigns/send');

      // Verify the generated FormData object sent in the body
      const formData = fetchCallArgs[1]?.body as FormData;
      expect(formData.get('subject')).toBe('Test Subject');
      expect(formData.get('csvFile')).toBe(dummyCsv);
      expect(formData.get('html')).toBe('<p>Hi</p>');
      expect(formData.has('url')).toBe(false); // Shouldn't exist if not provided
    });

    it('should correctly append arrays of attachments and exclusions to FormData', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ processed: 5 })
      } as Response);

      const mockAttachment1 = new File(['data1'], 'att1.pdf');
      const mockAttachment2 = new File(['data2'], 'att2.pdf');
      const mockExclusion = new File(['bounces'], 'bounces.csv');

      const payload: LaunchCampaignRequest = {
        subject: 'Advanced Payload',
        csvFile: dummyCsv,
        url: 'http://example.com/template',
        attachments: [mockAttachment1, mockAttachment2],
        exclusions: [mockExclusion]
      };

      await apiClient.launchCampaign(payload);

      const formData = vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as FormData;

      expect(formData.get('url')).toBe('http://example.com/template');
      expect(formData.has('html')).toBe(false);

      // FormData.getAll retrieves all files appended under the same key
      expect(formData.getAll('attachments')).toHaveLength(2);
      expect(formData.getAll('attachments')).toEqual([mockAttachment1, mockAttachment2]);

      expect(formData.getAll('exclusions')).toHaveLength(1);
      expect(formData.getAll('exclusions')).toEqual([mockExclusion]);
    });

    it('should extract the "error" property from the backend when the response is not ok', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid CSV format provided' })
      } as Response);

      const payload: LaunchCampaignRequest = { subject: 'Err', csvFile: dummyCsv };

      await expect(apiClient.launchCampaign(payload)).rejects.toThrow('Invalid CSV format provided');
    });

    it('should fallback to the "message" property if "error" is not present', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'A validation message occurred' })
      } as Response);

      const payload: LaunchCampaignRequest = { subject: 'Err', csvFile: dummyCsv };

      await expect(apiClient.launchCampaign(payload)).rejects.toThrow('A validation message occurred');
    });

    it('should fallback to the HTTP status code if the backend returns unparseable HTML/text', async () => {
      // Simulate an Nginx/Express standard 500 error page that fails JSON parsing
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => Promise.reject(new SyntaxError('Unexpected token < in JSON'))
      } as unknown as Response);

      const payload: LaunchCampaignRequest = { subject: 'Err', csvFile: dummyCsv };

      await expect(apiClient.launchCampaign(payload)).rejects.toThrow('Server error: 502');
    });
  });
});
