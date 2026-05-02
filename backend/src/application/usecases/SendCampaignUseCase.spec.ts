import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SendCampaignUseCase } from './SendCampaignUseCase';
import { type CsvPort } from '@domain/ports/CsvPort';
import { type EmailPort } from '@domain/ports/EmailPort';
import { type LoggerPort } from '@domain/ports/LoggerPort';
import { Contact } from '@domain/models/Contact';
import { type ContactId } from '@domain/models/BrandedTypes';

describe('SendCampaignUseCase', () => {
  let mockCsvPort: CsvPort;
  let mockEmailPort: EmailPort;
  let mockLogger: LoggerPort;
  let useCase: SendCampaignUseCase;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    // 1. Create mock implementations of the ports
    mockCsvPort = {
      read: vi.fn(),
      write: vi.fn()
    };
    mockEmailPort = {
      send: vi.fn(),
      scheduleSend: vi.fn()
    };
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // 2. Inject the mocks into the Use Case
    useCase = new SendCampaignUseCase(mockCsvPort, mockEmailPort, mockLogger);

    // 3. Backup global fetch for tests that need to mock it
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore global fetch and vi spies
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should abort early and return 0 if the CSV file is empty', async () => {
    vi.mocked(mockCsvPort.read).mockResolvedValue([]);

    const result = await useCase.execute('empty.csv', 'Subject', { html: '<p>Test</p>' });

    expect(result).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledWith('No contacts found in the file. Aborting campaign.');
    expect(mockEmailPort.send).not.toHaveBeenCalled();
  });

  describe('Template Resolution', () => {
    it('should throw an error if neither template HTML nor URL is provided', async () => {
      await expect(useCase.execute('contacts.csv', 'Subject', {})).rejects.toThrow(
        'Either template HTML or URL must be provided.'
      );
    });

    it('should fetch template from URL if template.html is not provided but template.url is', async () => {
      // Setup mock data
      const mockContacts = [new Contact('c-1' as ContactId, 'Alice', 'Smith', 'alice@test.com', 'Dev', 'Acme')];
      vi.mocked(mockCsvPort.read).mockResolvedValue(mockContacts);

      // Mock a successful fetch response
      const mockHtml = '<p>Remote Hello {{firstName}}</p>';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHtml)
      } as unknown as Response);

      const result = await useCase.execute('contacts.csv', 'Remote Subject', {
        url: 'http://example.com/template.html'
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('http://example.com/template.html');
      expect(result).toBe(1);
      expect(mockEmailPort.send).toHaveBeenCalledWith(mockContacts[0], {
        subject: 'Remote Subject',
        bodyHtml: '<p>Remote Hello Alice</p>'
      });
    });

    it('should throw an error if fetching template URL returns non-ok HTTP status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      } as unknown as Response);

      // Note: the internal HTTP error is caught and wrapped in a domain error by the UseCase
      await expect(useCase.execute('contacts.csv', 'Subject', { url: 'http://example.com/404' })).rejects.toThrow(
        'Could not download template from URL http://example.com/404'
      );
    });

    it('should throw an error and log if fetching template URL throws a network exception', async () => {
      const fetchError = new Error('Network timeout');
      globalThis.fetch = vi.fn().mockRejectedValue(fetchError);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(useCase.execute('contacts.csv', 'Subject', { url: 'http://example.com/timeout' })).rejects.toThrow(
        'Could not download template from URL http://example.com/timeout'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Could not download template from URL http://example.com/timeout: ',
        fetchError
      );
    });
  });

  describe('Campaign Execution', () => {
    it('should queue an email for each contact and return the processed count', async () => {
      const mockContacts = [
        new Contact('c-1' as ContactId, 'Alice', 'Smith', 'alice@test.com', 'Dev', 'Acme'),
        new Contact('c-2' as ContactId, 'Bob', 'Jones', 'bob@test.com', 'QA', 'Acme')
      ];
      vi.mocked(mockCsvPort.read).mockResolvedValue(mockContacts);

      const template = '<h1>Hello {{firstName}}</h1>';
      const result = await useCase.execute('contacts.csv', 'Welcome', { html: template });

      // Verify correct count is returned
      expect(result).toBe(2);

      // Verify first contact processing
      expect(mockEmailPort.send).toHaveBeenNthCalledWith(1, mockContacts[0], {
        subject: 'Welcome',
        bodyHtml: '<h1>Hello Alice</h1>'
      });

      // Verify second contact processing
      expect(mockEmailPort.send).toHaveBeenNthCalledWith(2, mockContacts[1], {
        subject: 'Welcome',
        bodyHtml: '<h1>Hello Bob</h1>'
      });

      expect(mockLogger.info).toHaveBeenCalledWith('All emails successfully queued to Redis.');
    });
  });
});
