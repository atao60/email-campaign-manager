import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { ResolveCampaignContactsUseCase } from './ResolveCampaignContactsUseCase';
import { Contact, ConsentStatus } from '@domain/models/Contact';
import type { ContactRepository } from '@domain/repositories';
import type { CsvPort, LoggerPort, TimeProvider } from '@domain/ports';
import type { ContactId } from '@domain/models/BrandedTypes';

describe('ResolveCampaignContactsUseCase', () => {
  let contactRepo: Mocked<ContactRepository>;
  let csvPort: Mocked<CsvPort>;
  let logger: Mocked<LoggerPort>;
  let timeProvider: Mocked<TimeProvider>;
  let useCase: ResolveCampaignContactsUseCase;

  const MOCK_NOW = new Date('2026-06-11T12:00:00Z');

  beforeEach(() => {
    contactRepo = {
      save: vi.fn(),
      getByEmail: vi.fn(),
      getAll: vi.fn()
    } as unknown as Mocked<ContactRepository>;

    csvPort = { read: vi.fn() } as unknown as Mocked<CsvPort>;
    logger = { info: vi.fn(), error: vi.fn() } as unknown as Mocked<LoggerPort>;

    // Setup TimeProvider mock
    timeProvider = { getCurrentDate: vi.fn(() => MOCK_NOW) };

    useCase = new ResolveCampaignContactsUseCase(contactRepo, csvPort, logger, timeProvider);
  });

  it('should create a new contact when the email does not exist', async () => {
    const rawContact = { email: 'new@example.com', firstName: 'John', lastName: 'Doe' };
    csvPort.read.mockResolvedValue([rawContact]);
    contactRepo.getByEmail.mockResolvedValue(null);

    const result = await useCase.execute('path/to/csv');

    expect(result).toHaveLength(1);
    expect(result[0]!.optInDate).toEqual(MOCK_NOW); // Assert injection works
    expect(contactRepo.save).toHaveBeenCalledTimes(1);
    // Verify a new Contact entity was created
    expect(result[0]).toBeInstanceOf(Contact);
  });

  it('should update existing contact metadata while preserving opt-in date', async () => {
    const originalDate = new Date('2023-01-01');
    const existingContact = new Contact(
      'id_1' as ContactId,
      'Old',
      'Name',
      'existing@example.com',
      originalDate,
      undefined,
      undefined,
      ConsentStatus.SUBSCRIBED
    );

    csvPort.read.mockResolvedValue([{ email: 'existing@example.com', firstName: 'New', lastName: 'Name' }]);
    contactRepo.getByEmail.mockResolvedValue(existingContact);

    await useCase.execute('path/to/csv');

    expect(existingContact.firstName).toBe('New');
    expect(existingContact.optInDate).toEqual(originalDate); // Ensure date was NOT updated to MOCK_NOW
    expect(contactRepo.save).toHaveBeenCalledWith(existingContact);
  });

  it('should re-subscribe a contact using the time provider date', async () => {
    const existingContact = new Contact(
      'id_1' as ContactId,
      'John',
      'Doe',
      'unsub@example.com',
      new Date('2020-01-01'),
      undefined,
      undefined,
      ConsentStatus.UNSUBSCRIBED
    );

    csvPort.read.mockResolvedValue([{ email: 'unsub@example.com' }]);
    contactRepo.getByEmail.mockResolvedValue(existingContact);

    await useCase.execute('path/to/csv');

    expect(existingContact.status).toBe(ConsentStatus.SUBSCRIBED);
    expect(existingContact.optInDate).toEqual(MOCK_NOW);
    expect(contactRepo.save).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Re-subscribing'));
  });

  it('should handle multiple contacts from CSV', async () => {
    csvPort.read.mockResolvedValue([
      { email: 'a@ex.com', firstName: 'A' },
      { email: 'b@ex.com', firstName: 'B' }
    ]);
    contactRepo.getByEmail.mockResolvedValue(null);

    const result = await useCase.execute('path/to/csv');

    expect(result).toHaveLength(2);
    expect(contactRepo.save).toHaveBeenCalledTimes(2);
  });
});
