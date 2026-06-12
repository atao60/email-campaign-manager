import { describe, it, expect, beforeEach } from 'vitest';
import { Contact, ConsentStatus } from './Contact';
import type { ContactId } from './BrandedTypes';

describe('Contact Domain Entity', () => {
  const MOCK_ID = 'ctct_123' as ContactId;
  const INITIAL_DATE = new Date('2023-01-01T12:00:00Z');

  let contact: Contact;

  beforeEach(() => {
    // Fresh instance for every test
    contact = new Contact(MOCK_ID, 'John', 'Doe', 'john.doe@test.com', INITIAL_DATE, 'Developer', 'ACME Corp');
  });

  describe('Initialization', () => {
    it('should initialize with default SUBSCRIBED status if not provided', () => {
      expect(contact.status).toBe(ConsentStatus.SUBSCRIBED);
      expect(contact.id).toBe(MOCK_ID);
      expect(contact.email).toBe('john.doe@test.com');
      expect(contact.optInDate).toEqual(INITIAL_DATE);
    });

    it('should initialize with provided status and token if passed', () => {
      const customContact = new Contact(
        'ctct_999' as ContactId,
        'Jane',
        'Smith',
        'jane@test.com',
        INITIAL_DATE,
        undefined,
        undefined,
        ConsentStatus.PENDING_RENEWAL,
        'secure-token-123'
      );

      expect(customContact.status).toBe(ConsentStatus.PENDING_RENEWAL);
      expect(customContact.renewalToken).toBe('secure-token-123');
    });
  });

  describe('isConsentExpiring()', () => {
    it('should return false if the contact is already unsubscribed', () => {
      contact.unsubscribe();
      const futureDate = new Date('2030-01-01T12:00:00Z');

      expect(contact.isConsentExpiring(3, futureDate)).toBe(false);
    });

    it('should return false if the consent period has not elapsed yet', () => {
      // 2 years and 364 days later
      const almostExpiredDate = new Date('2025-12-31T12:00:00Z');

      expect(contact.isConsentExpiring(3, almostExpiredDate)).toBe(false);
    });

    it('should return true if the exact consent period has elapsed', () => {
      // Exactly 3 years later
      const exactlyExpiredDate = new Date('2026-01-01T12:00:00Z');

      expect(contact.isConsentExpiring(3, exactlyExpiredDate)).toBe(true);
    });

    it('should return true if the consent period is well in the past', () => {
      // 5 years later
      const wayPastExpiredDate = new Date('2028-01-01T12:00:00Z');

      expect(contact.isConsentExpiring(3, wayPastExpiredDate)).toBe(true);
    });
  });

  describe('markForRenewal()', () => {
    it('should transition status to PENDING_RENEWAL and assign the token', () => {
      contact.markForRenewal('mock-crypto-token');

      expect(contact.status).toBe(ConsentStatus.PENDING_RENEWAL);
      expect(contact.renewalToken).toBe('mock-crypto-token');
    });
  });

  describe('renewConsent()', () => {
    it('should restore SUBSCRIBED status, update the opt-in date, and clear the token', () => {
      // Put into pending state first
      contact.markForRenewal('mock-crypto-token');

      const RENEWAL_DATE = new Date('2026-01-05T10:00:00Z');
      contact.renewConsent(RENEWAL_DATE);

      expect(contact.status).toBe(ConsentStatus.SUBSCRIBED);
      expect(contact.optInDate).toEqual(RENEWAL_DATE);
      expect(contact.renewalToken).toBeUndefined();
    });
  });

  describe('unsubscribe()', () => {
    it('should transition status to UNSUBSCRIBED and clear any pending tokens', () => {
      contact.markForRenewal('mock-crypto-token'); // Set token first

      contact.unsubscribe();

      expect(contact.status).toBe(ConsentStatus.UNSUBSCRIBED);
      expect(contact.renewalToken).toBeUndefined();

      // Ensure PII is retained (unlike anonymization)
      expect(contact.email).toBe('john.doe@test.com');
      expect(contact.firstName).toBe('John');
    });
  });

  describe('anonymize() - Right to be Forgotten', () => {
    it('should wipe all PII and transition status to ANONYMIZED while keeping the ID intact', () => {
      contact.markForRenewal('mock-crypto-token');

      contact.anonymize();

      expect(contact.status).toBe(ConsentStatus.ANONYMIZED);
      expect(contact.id).toBe(MOCK_ID); // The critical piece that must not change

      // Verify PII is completely wiped
      expect(contact.firstName).toBe('Anonymized');
      expect(contact.lastName).toBe('Anonymized');
      expect(contact.email).toBe(`${MOCK_ID}@anonymized.local`);
      expect(contact.jobTitle).toBeUndefined();
      expect(contact.company).toBeUndefined();
      expect(contact.renewalToken).toBeUndefined();
    });
  });
});
