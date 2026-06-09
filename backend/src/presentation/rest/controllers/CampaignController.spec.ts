(globalThis as any).litDisableDevMode = true;

import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
import * as fs from 'node:fs';
import { Buffer } from 'node:buffer';

import { CampaignController } from './CampaignController';

import type { MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';
import type { SendCampaignUseCase } from '@application/usecases/SendCampaignUseCase';
import type { GetCampaignsUseCase } from '@application/usecases/GetCampaignsUseCase';
import type { GetCampaignDetailsUseCase } from '@application/usecases/GetCampaignDetailsUseCase';
import type { UpdateDeliveryStatusUseCase } from '@application/usecases/UpdateDeliveryStatusUseCase';
import type { SentCampaign } from '@domain/models/Campaign';

// Mock the file system to prevent actual file creation during tests
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

describe('CampaignController', () => {
  // Mock Use Cases
  let mergeUseCase: Mocked<MergeMailingListsUseCase>;
  let sendCampaignUseCase: Mocked<SendCampaignUseCase>;
  let getCampaignsUseCase: Mocked<GetCampaignsUseCase>;
  let getCampaignDetailsUseCase: Mocked<GetCampaignDetailsUseCase>;
  let updateDeliveryStatusUseCase: Mocked<UpdateDeliveryStatusUseCase>;

  let controller: CampaignController;

  // Mock TSOA Response Injectors
  const serverError = vi.fn((status, payload) => ({ status, payload }));
  const validationError = vi.fn((status, payload) => ({ status, payload }));
  const notFoundError = vi.fn((status, payload) => ({ status, payload }));

  beforeEach(() => {
    // Suppress console.error and console.log during tests to keep terminal clean
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Initialize mock use cases
    mergeUseCase = { execute: vi.fn() } as unknown as Mocked<MergeMailingListsUseCase>;
    sendCampaignUseCase = { execute: vi.fn() } as unknown as Mocked<SendCampaignUseCase>;
    getCampaignsUseCase = { execute: vi.fn() } as unknown as Mocked<GetCampaignsUseCase>;
    getCampaignDetailsUseCase = { execute: vi.fn() } as unknown as Mocked<GetCampaignDetailsUseCase>;
    updateDeliveryStatusUseCase = { execute: vi.fn() } as unknown as Mocked<UpdateDeliveryStatusUseCase>;

    controller = new CampaignController(
      mergeUseCase,
      sendCampaignUseCase,
      getCampaignsUseCase,
      getCampaignDetailsUseCase,
      updateDeliveryStatusUseCase
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('mergeLists', () => {
    it('should successfully merge lists and return a success message', async () => {
      mergeUseCase.execute.mockResolvedValue(undefined);

      const requestBody = { inputs: ['list1.csv'], output: 'out.csv' };
      const response = await controller.mergeLists(requestBody, serverError);

      expect(mergeUseCase.execute).toHaveBeenCalledWith(['list1.csv'], [], 'out.csv');
      expect(response).toEqual({ message: 'Successfully merged lists into out.csv' });
    });

    it('should handle internal errors during merge', async () => {
      mergeUseCase.execute.mockRejectedValue(new Error('Merge Failed'));

      const response = await controller.mergeLists({ inputs: [], output: 'out.csv' }, serverError);

      expect(serverError).toHaveBeenCalledWith(500, { error: 'Internal Server Error during merge.' });
      expect(response).toEqual({ status: 500, payload: { error: 'Internal Server Error during merge.' } });
    });
  });

  describe('launchCampaign', () => {
    const mockFile = { buffer: Buffer.from('test,csv,data') } as Express.Multer.File;

    it('should fail validation if templateUrl is provided instead of HTML', async () => {
      const response = await controller.launchCampaign(
        validationError,
        mockFile,
        'Subject',
        undefined, // no label
        undefined, // no html
        'http://example.com' // url provided
      );

      expect(validationError).toHaveBeenCalledWith(400, { error: 'URL fetching is not yet implemented.' });
      expect(response).toEqual({ status: 400, payload: { error: 'URL fetching is not yet implemented.' } });
    });

    it('should fail validation if neither html nor url is provided', async () => {
      await controller.launchCampaign(validationError, mockFile, 'Subject');

      expect(validationError).toHaveBeenCalledWith(400, { error: 'Must provide either HTML template or template URL' });
    });

    it('should process campaign with a label, create tmp folder if missing, write file, and return 202', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false); // Simulate tmp folder missing
      sendCampaignUseCase.execute.mockResolvedValue(100);

      // Spy on the inherited TSOA controller method
      const setStatusSpy = vi.spyOn(controller, 'setStatus').mockImplementation(() => {});

      const response = await controller.launchCampaign(
        validationError,
        mockFile,
        'My Subject',
        'Juneconcert',
        '<p>Hello</p>'
      );

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('tmp'), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.csv'), mockFile.buffer);

      expect(sendCampaignUseCase.execute).toHaveBeenCalledWith(
        expect.stringContaining('.csv'), // Temporary file path
        'My Subject',
        expect.objectContaining({
          html: '<p>Hello</p>',
          label: 'Juneconcert'
        })
      );

      expect(setStatusSpy).toHaveBeenCalledWith(202);
      expect(response).toEqual({
        message: 'Campaign for My Subject has been queued for sending.',
        processed: 100
      });
    });

    it('should not try to create tmp folder if it already exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true); // Simulate tmp folder exists
      sendCampaignUseCase.execute.mockResolvedValue(5);

      await controller.launchCampaign(validationError, mockFile, 'Subject', undefined, '<p>HTML</p>');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled(); // Skipping directory creation
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle missing label gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      sendCampaignUseCase.execute.mockResolvedValue(5);

      await controller.launchCampaign(validationError, mockFile, 'Subject', undefined, '<p>HTML</p>');

      expect(sendCampaignUseCase.execute).toHaveBeenCalledWith(
        expect.any(String),
        'Subject',
        expect.not.objectContaining({ label: expect.anything() }) // Verify label is absent
      );
    });

    it('should process exclusions by calling the mergeUseCase', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      sendCampaignUseCase.execute.mockResolvedValue(10);

      const mockExclusion = { buffer: Buffer.from('excl') } as Express.Multer.File;

      await controller.launchCampaign(
        validationError,
        mockFile,
        'Subject',
        'Label',
        '<p>HTML</p>',
        undefined,
        undefined,
        [mockExclusion]
      );

      // It should write both the master CSV and the exclusion CSV
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);

      // It should execute the merge logic to generate a new final CSV
      expect(mergeUseCase.execute).toHaveBeenCalledWith(
        [expect.stringContaining('.csv')], // Master file
        [expect.stringContaining('excl-')], // Exclusion files
        expect.stringContaining('filtered-master') // Output file
      );

      // The send campaign use case should receive the new FILTERED path
      expect(sendCampaignUseCase.execute).toHaveBeenCalledWith(expect.stringContaining('filtered-master'), 'Subject', {
        html: '<p>HTML</p>',
        label: 'Label'
      });
    });

    it('should process attachments and append them to the template payload', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      sendCampaignUseCase.execute.mockResolvedValue(10);

      const mockAttachment = { originalname: 'logo.png', buffer: Buffer.from('img') } as Express.Multer.File;

      await controller.launchCampaign(validationError, mockFile, 'Subject', 'Label', '<p>HTML</p>', undefined, [
        mockAttachment
      ]);

      // It should write both the master CSV and the attachment
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);

      // The send campaign use case should receive the payload WITH attachments
      expect(sendCampaignUseCase.execute).toHaveBeenCalledWith(expect.any(String), 'Subject', {
        html: '<p>HTML</p>',
        label: 'Label',
        attachments: [
          {
            filename: 'logo.png',
            path: expect.stringContaining('logo.png'),
            cid: 'logo.png'
          }
        ]
      });
    });

    it('should catch errors from the use case and throw a 500 error directly', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      sendCampaignUseCase.execute.mockRejectedValue(new Error('System crash'));

      await expect(controller.launchCampaign(validationError, mockFile, 'Subject', 'L', '<p>HTML</p>')).rejects.toThrow(
        'Internal Server Error while queueing campaign.'
      );
    });
  });

  describe('getCampaigns', () => {
    it('should return a list of campaigns', async () => {
      const mockCampaigns = [{ id: '1', subject: 'A', status: 'COMPLETED' as const, sentDate: '', totalSent: 0 }];
      getCampaignsUseCase.execute.mockResolvedValue(mockCampaigns);

      const response = await controller.getCampaigns(serverError);

      expect(getCampaignsUseCase.execute).toHaveBeenCalled();
      expect(response).toEqual(mockCampaigns);
    });

    it('should handle internal errors', async () => {
      getCampaignsUseCase.execute.mockRejectedValue(new Error('DB Error'));

      await controller.getCampaigns(serverError);

      expect(serverError).toHaveBeenCalledWith(500, { error: 'Internal Server Error while fetching campaigns.' });
    });
  });

  describe('getCampaignDetails', () => {
    it('should return campaign details if found', async () => {
      const mockDetails = { id: '123', subject: 'Detailed Subject' } as unknown as SentCampaign;
      getCampaignDetailsUseCase.execute.mockResolvedValue(mockDetails);

      const response = await controller.getCampaignDetails('123', notFoundError, serverError);

      expect(getCampaignDetailsUseCase.execute).toHaveBeenCalledWith('123');
      expect(response).toEqual(mockDetails);
    });

    it('should return 404 if the campaign is not found (returns null)', async () => {
      getCampaignDetailsUseCase.execute.mockResolvedValue(null);

      const response = await controller.getCampaignDetails('123', notFoundError, serverError);

      expect(notFoundError).toHaveBeenCalledWith(404, { error: 'Campaign with ID 123 not found.' });
      expect(response).toEqual({ status: 404, payload: { error: 'Campaign with ID 123 not found.' } });
    });

    it('should handle internal errors', async () => {
      getCampaignDetailsUseCase.execute.mockRejectedValue(new Error('Error retrieving data'));

      await controller.getCampaignDetails('123', notFoundError, serverError);

      expect(serverError).toHaveBeenCalledWith(500, {
        error: 'Internal Server Error while fetching campaign details.'
      });
    });
  });

  describe('handleEmailProviderWebhook', () => {
    it('should process a FAILED status for "bounce" events', async () => {
      const payload = { campaignId: 'c1', email: 'test@test.com', event: 'bounce', reason: 'Hard bounce' };

      const response = await controller.handleEmailProviderWebhook(payload);

      expect(updateDeliveryStatusUseCase.execute).toHaveBeenCalledWith('c1', 'test@test.com', 'FAILED', 'Hard bounce');
      expect(response).toEqual({ success: true });
    });

    it('should process a FAILED status for "dropped" events', async () => {
      const payload = { campaignId: 'c2', email: 'user@test.com', event: 'dropped', reason: 'Spam' };

      await controller.handleEmailProviderWebhook(payload);

      expect(updateDeliveryStatusUseCase.execute).toHaveBeenCalledWith('c2', 'user@test.com', 'FAILED', 'Spam');
    });

    it('should process an OK status for non-failure events (like delivered or open)', async () => {
      const payload = { campaignId: 'c3', email: 'ok@test.com', event: 'delivered' };

      await controller.handleEmailProviderWebhook(payload);

      expect(updateDeliveryStatusUseCase.execute).toHaveBeenCalledWith('c3', 'ok@test.com', 'OK', undefined);
    });
  });
});
