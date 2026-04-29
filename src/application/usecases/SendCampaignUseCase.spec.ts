import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  });

  it('should abort early and return 0 if the CSV file is empty', async () => {
    vi.mocked(mockCsvPort.read).mockResolvedValue([]);

    const result = await useCase.execute('empty.csv', 'Subject', '<p>Test</p>');

    expect(result).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledWith('No contacts found in the file. Aborting campaign.');
    expect(mockEmailPort.send).not.toHaveBeenCalled();
  });

  it('should queue an email for each contact and return the processed count', async () => {
    const mockContacts = [
      new Contact('c-1' as ContactId, 'Alice', 'Smith', 'alice@test.com', 'Dev', 'Acme'),
      new Contact('c-2' as ContactId, 'Bob', 'Jones', 'bob@test.com', 'QA', 'Acme')
    ];
    vi.mocked(mockCsvPort.read).mockResolvedValue(mockContacts);

    const template = '<h1>Hello {{firstName}}</h1>';
    const result = await useCase.execute('contacts.csv', 'Welcome', template);

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
