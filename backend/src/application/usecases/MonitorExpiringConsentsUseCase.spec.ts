import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { MonitorExpiringConsentsUseCase, type GdprMonitorConfig } from './MonitorExpiringConsentsUseCase';
import { Contact, ConsentStatus } from '@domain/models/Contact';
import type { ContactRepository } from '@domain/repositories';
import type { EmailPort, LoggerPort, LanguagePort, TimeProvider } from '@domain/ports';
import type { ContactId } from '@domain/models/BrandedTypes';

describe('MonitorExpiringConsentsUseCase', () => {
  let contactRepo: Mocked<ContactRepository>;
  let emailPort: Mocked<EmailPort>;
  let logger: Mocked<LoggerPort>;
  let timeProvider: Mocked<TimeProvider>;
  let useCase: MonitorExpiringConsentsUseCase;

  // Lock time to a specific date to make math deterministic
  const MOCK_NOW = new Date('2026-06-11T12:00:00Z');
  // A date only 1 year old (valid)
  const MOCK_VALID_DATE_1 = new Date('2025-06-11T12:00:00Z');
  // A date only 2 year old (valid)
  const MOCK_VALID_DATE_2 = new Date('2024-06-11T12:00:00Z');
  // Dates at least 4 years old (expired relative to MOCK_NOW)
  const MOCK_EXPIRED_DATE_1 = new Date('2022-01-01T12:00:00Z');
  const MOCK_EXPIRED_DATE_2 = new Date('2021-01-01T12:00:00Z');

  const MOCK_CONFIG: GdprMonitorConfig = {
    consentValidityYears: 3,
    renewalDaysLimit: 14,
    frontendUrl: 'https://test.com',
    checkingPeriodicity: ''
  };

  beforeEach(() => {
    // 1. Initialize Mocks
    contactRepo = {
      getAll: vi.fn(),
      save: vi.fn(),
      getByEmail: vi.fn()
    } as unknown as Mocked<ContactRepository>;

    emailPort = {
      send: vi.fn()
    } as unknown as Mocked<EmailPort>;

    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as Mocked<LoggerPort>;

    const i18Port = {
      init: vi.fn(),
      translate: vi.fn((key, vars) => `Mocked copy for ${key} with ${vars?.renewalLink}`)
    } as unknown as Mocked<LanguagePort>;

    // Setup TimeProvider mock
    timeProvider = {
      getCurrentDate: vi.fn(() => MOCK_NOW)
    };

    // 2. Instantiate Use Case
    useCase = new MonitorExpiringConsentsUseCase(contactRepo, emailPort, logger, i18Port, timeProvider, MOCK_CONFIG);
  });

  it('should process 0 contacts if the repository is empty', async () => {
    contactRepo.getAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toBe(0);
    expect(timeProvider.getCurrentDate).toHaveBeenCalledTimes(1);
    expect(contactRepo.save).not.toHaveBeenCalled();
    expect(emailPort.send).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Starting periodic GDPR consent expiration monitor...');
  });

  it('should ignore contacts that have not expired yet', async () => {
    const validContact1 = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'John',
      'Doe',
      'john@test.com',
      MOCK_VALID_DATE_1
    );
    const validContact2 = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'Jane',
      'Smith',
      'jane@test.com',
      MOCK_VALID_DATE_2
    );

    const isExpiringSpy1 = vi.spyOn(validContact1, 'isConsentExpiring');
    const isExpiringSpy2 = vi.spyOn(validContact2, 'isConsentExpiring');

    contactRepo.getAll.mockResolvedValue([validContact1, validContact2]);

    const result = await useCase.execute();

    expect(result).toBe(0);

    // 🚀 Assert the Domain State did NOT change
    expect(validContact1.status).toBe(ConsentStatus.SUBSCRIBED);
    expect(validContact1.renewalToken).toBeUndefined();
    expect(validContact2.status).toBe(ConsentStatus.SUBSCRIBED);
    expect(validContact2.renewalToken).toBeUndefined();

    // Verify no side-effects were triggered
    expect(contactRepo.save).not.toHaveBeenCalled();
    expect(emailPort.send).not.toHaveBeenCalled();

    // Verify domain logic was delegated to
    expect(isExpiringSpy1).toHaveBeenCalledWith(3, MOCK_NOW);
    expect(isExpiringSpy2).toHaveBeenCalledWith(3, MOCK_NOW);
  });

  it('should process expiring contacts and trigger renewal emails', async () => {
    const expiredContact = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'John',
      'Doe',
      'john@test.com',
      MOCK_EXPIRED_DATE_1
    );
    contactRepo.getAll.mockResolvedValue([expiredContact]);

    const result = await useCase.execute();

    expect(result).toBe(1);
    expect(expiredContact.status).toBe(ConsentStatus.PENDING_RENEWAL);
    expect(expiredContact.renewalToken).toBeDefined();

    // Verify token generation and domain state update
    // expect(expiredContact.markForRenewal).toHaveBeenCalledWith(expect.any(String)); // Random hex token
    expect(expiredContact.status).toBe(ConsentStatus.PENDING_RENEWAL);
    expect(expiredContact.renewalToken).toBeDefined();
    expect(typeof expiredContact.renewalToken).toBe('string');
    expect(expiredContact.renewalToken).toHaveLength(64);

    // Verify persistence
    expect(contactRepo.save).toHaveBeenCalledWith(expiredContact);

    // Verify email dispatch
    expect(emailPort.send).toHaveBeenCalledTimes(1);
    expect(emailPort.send).toHaveBeenCalledWith(
      expiredContact,
      expect.objectContaining({
        subject: expect.stringContaining('Mocked copy for email:gdpr.renewalSubject'),
        bodyHtml: expect.stringContaining('https://test.com/renew?t=')
      })
    );
  });

  it('should ignore contacts that are already unsubscribed', async () => {
    // Arrange: Expired date, but already opted out
    const expiredDate = new Date('2020-01-01T12:00:00Z');
    const contact = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'Bob',
      'Jones',
      'bob@test.com',
      expiredDate,
      undefined,
      undefined,
      ConsentStatus.UNSUBSCRIBED
    );
    contactRepo.getAll.mockResolvedValue([contact]);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toBe(0);
    expect(emailPort.send).not.toHaveBeenCalled();
  });

  it('should handle a mix of valid and expiring contacts correctly', async () => {
    const validContact = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'John',
      'Doe',
      'john@test.com',
      MOCK_VALID_DATE_1
    );
    const expiringContact1 = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'Bob',
      'Jones',
      'bob@test.com',
      MOCK_EXPIRED_DATE_1
    );
    const expiringContact2 = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'Jane',
      'Smith',
      'jane@test.com',
      MOCK_EXPIRED_DATE_2
    );

    contactRepo.getAll.mockResolvedValue([validContact, expiringContact1, expiringContact2]);

    const result = await useCase.execute();

    expect(result).toBe(2);

    // Verify the Valid Contact was ignored (State did not change)
    expect(validContact.status).toBe(ConsentStatus.SUBSCRIBED);
    expect(validContact.renewalToken).toBeUndefined();

    // Verify the Expiring Contacts were processed (State changed)
    expect(expiringContact1.status).toBe(ConsentStatus.PENDING_RENEWAL);
    expect(expiringContact1.renewalToken).toBeDefined();

    expect(expiringContact2.status).toBe(ConsentStatus.PENDING_RENEWAL);
    expect(expiringContact2.renewalToken).toBeDefined();

    // Verify Persistence and Side Effects
    // Ensure save was only called for the two expiring contacts
    expect(contactRepo.save).toHaveBeenCalledTimes(2);
    expect(contactRepo.save).toHaveBeenCalledWith(expiringContact1);
    expect(contactRepo.save).toHaveBeenCalledWith(expiringContact2);

    // Ensure emails were only sent to the two expiring contacts
    expect(emailPort.send).toHaveBeenCalledTimes(2);
  });

  it('should generate unique cryptographic tokens for each expiring contact', async () => {
    const expiringContact1 = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'Bob',
      'Jones',
      'bob@test.com',
      MOCK_EXPIRED_DATE_1
    );
    const expiringContact2 = new Contact(
      `ctct_${Math.random()}` as ContactId,
      'Jane',
      'Smith',
      'jane@test.com',
      MOCK_EXPIRED_DATE_2
    );

    contactRepo.getAll.mockResolvedValue([expiringContact1, expiringContact2]);

    await useCase.execute();

    // Extract the tokens passed to the markForRenewal method
    const token1 = expiringContact1.renewalToken;
    const token2 = expiringContact2.renewalToken;

    // Verify tokens were actually assigned
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();

    // Verify tokens are 64 characters long (32 hex bytes) and are unique
    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });
});
