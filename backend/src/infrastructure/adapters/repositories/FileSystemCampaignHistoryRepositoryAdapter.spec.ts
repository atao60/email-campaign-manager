import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { FileSystemCampaignHistoryRepositoryAdapter } from './FileSystemCampaignHistoryRepositoryAdapter';
import type { SentCampaign } from '@domain/models/Campaign';

// Mock the node:fs/promises module
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

describe('FileSystemCampaignHistoryRepositoryAdapter', () => {
  let adapter: FileSystemCampaignHistoryRepositoryAdapter;
  const mockStorageDir = '/mock/storage/dir';

  // Helper to generate a dummy campaign
  const createMockCampaign = (
    id: string,
    date: string,
    status: 'PARTIAL' | 'COMPLETED' | 'FAILED' = 'PARTIAL'
  ): SentCampaign => ({
    id,
    subject: 'Test Campaign',
    sentDate: date,
    totalSent: 2,
    status,
    htmlContent: '<p>Test</p>',
    emails: [
      { address: 'alice@test.com', status: 'PENDING' },
      { address: 'bob@test.com', status: 'PENDING' }
    ]
  });

  beforeEach(() => {
    adapter = new FileSystemCampaignHistoryRepositoryAdapter(mockStorageDir);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('save', () => {
    it('should ensure the directory exists and write the JSON file', async () => {
      const campaign = createMockCampaign('camp_1', '2026-05-10T10:00:00Z');

      await adapter.save(campaign);

      expect(mkdir).toHaveBeenCalledWith(mockStorageDir, { recursive: true });
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('camp_1.json'),
        JSON.stringify(campaign, null, 2),
        'utf-8'
      );
    });

    it('should ignore EEXIST errors when creating directory', async () => {
      const error = new Error('File exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      vi.mocked(mkdir).mockRejectedValueOnce(error);

      const campaign = createMockCampaign('camp_1', '2026-05-10T10:00:00Z');
      await expect(adapter.save(campaign)).resolves.not.toThrow();
    });
  });

  describe('getAll', () => {
    it('should read all JSON files and return them sorted by date descending', async () => {
      const camp1 = createMockCampaign('camp_1', '2026-05-01T10:00:00Z'); // Older
      const camp2 = createMockCampaign('camp_2', '2026-05-10T10:00:00Z'); // Newer

      vi.mocked(readdir).mockResolvedValueOnce(['camp_1.json', 'camp_2.json', 'ignore.txt'] as any);

      // First readFile returns camp_1, second returns camp_2
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(camp1)).mockResolvedValueOnce(JSON.stringify(camp2));

      const results = await adapter.getAll();

      expect(results).toHaveLength(2);
      // Ensure sorting: newer first
      expect(results[0]?.id).toBe('camp_2');
      expect(results[1]?.id).toBe('camp_1');
    });

    it('should skip empty or unreadable files gracefully', async () => {
      // 1. Spy on console.warn and replace it with an empty function
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.mocked(readdir).mockResolvedValueOnce(['camp_1.json', 'empty.json', 'corrupt.json'] as any);

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(createMockCampaign('camp_1', '2026-05-01')))
        .mockResolvedValueOnce('   ') // empty file
        .mockRejectedValueOnce(new Error('Corrupt file')); // unreadable file

      const results = await adapter.getAll();

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('camp_1');

      // 2. (Optional but recommended) Verify your code actually logged the warning!
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FileRepo] Skipping unreadable file corrupt.json'),
        expect.any(Error)
      );

      // 3. Restore the original console.warn behavior
      consoleSpy.mockRestore();
    });
  });

  describe('getById', () => {
    it('should return parsed campaign if file exists', async () => {
      const mockCampaign = createMockCampaign('camp_1', '2026-05-10T10:00:00Z');
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockCampaign));

      const result = await adapter.getById('camp_1');

      expect(result).toEqual(mockCampaign);
      expect(readFile).toHaveBeenCalledWith(expect.stringContaining('camp_1.json'), 'utf-8');
    });

    it('should return null if file does not exist (ENOENT)', async () => {
      const error = new Error('Not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(readFile).mockRejectedValueOnce(error);

      const result = await adapter.getById('missing_camp');

      expect(result).toBeNull();
    });
  });

  describe('updateEmailStatus', () => {
    it('should safely exit if campaign does not exist', async () => {
      const error = new Error('Not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(readFile).mockRejectedValueOnce(error); // getById will return null

      await adapter.updateEmailStatus('missing', 'alice@test.com', 'OK');

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should update a single email status and save', async () => {
      const mockCampaign = createMockCampaign('camp_1', '2026-05-10');
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockCampaign));

      await adapter.updateEmailStatus('camp_1', 'alice@test.com', 'OK', 'Delivered');

      // Check that it was saved with the updated email status
      expect(writeFile).toHaveBeenCalledTimes(1);
      const writtenData: SentCampaign = JSON.parse(vi.mocked(writeFile).mock.calls[0]?.[1] as unknown as string);

      expect(writtenData.emails[0]?.status).toBe('OK');
      expect(writtenData.emails[0]?.errorReason).toBe('Delivered');
      expect(writtenData.emails[1]?.status).toBe('PENDING'); // Bob is still pending
      expect(writtenData.status).toBe('PARTIAL'); // Overall campaign remains PARTIAL
    });

    it('should flip campaign status to COMPLETED if all emails are processed without failures', async () => {
      const mockCampaign = createMockCampaign('camp_1', '2026-05-10');
      // Set bob to OK already, so only alice is pending
      if (mockCampaign.emails[1]) mockCampaign.emails[1].status = 'OK';

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockCampaign));

      // Update alice to OK
      await adapter.updateEmailStatus('camp_1', 'alice@test.com', 'OK');

      const writtenData: SentCampaign = JSON.parse(vi.mocked(writeFile).mock.calls[0]?.[1] as unknown as string);

      expect(writtenData.emails[0]?.status).toBe('OK');
      expect(writtenData.emails[1]?.status).toBe('OK');
      expect(writtenData.status).toBe('COMPLETED'); // Parent flips to COMPLETED
    });

    it('should flip campaign status to FAILED if all emails are processed and at least one failed', async () => {
      const mockCampaign = createMockCampaign('camp_1', '2026-05-10');
      // Set bob to FAILED already
      if (mockCampaign.emails[1]) mockCampaign.emails[1].status = 'FAILED';

      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockCampaign));

      // Update alice to OK (all are now processed, but one failed)
      await adapter.updateEmailStatus('camp_1', 'alice@test.com', 'OK');

      const writtenData: SentCampaign = JSON.parse(vi.mocked(writeFile).mock.calls[0]?.[1] as unknown as string);

      expect(writtenData.status).toBe('FAILED'); // Parent flips to FAILED because Bob failed
    });
  });
});
