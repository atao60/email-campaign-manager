import { randomUUID } from 'node:crypto';

import { Contact, ConsentStatus } from '@domain/models/Contact';
import type { ContactId } from '@domain/models/BrandedTypes';
import type { CsvPort, LoggerPort, TimeProvider } from '@domain/ports';
import type { ContactRepository } from '@domain/repositories';

/**
 * ==========================================
 * Use Case: Resolve Campaign Contacts (Ingestion & Upsert)
 * ==========================================
 *
 * @rule
 * Orchestrates the secure ingestion of contact data from uploaded CSV files,
 * ensuring that existing GDPR consent states are strictly preserved.
 *
 * @why
 * When a user uploads a new mailing list for a campaign, performing a naive
 * overwrite of existing contacts would destroy their original `optInDate` and
 * legally invalidate their consent history. This use case acts as a data-integrity
 * gatekeeper, ensuring that new uploads merge with existing data rather than destroy it.
 *
 * @how
 * - Reads the raw CSV data using the `CsvPort`.
 * - Performs an O(1) lookup against the `ContactRepository` for each email address.
 * - **If the contact exists:** Performs a safe "upsert". It updates mutable PII
 * (like names) but explicitly protects the `optInDate`. If the user was previously
 * unsubscribed but is included in this new explicit upload, it delegates to the
 * domain entity (`contact.renewConsent(...)`) to legally restart their subscription.
 * - **If the contact is new:** Instantiates a fresh `Contact` entity, which
 * automatically stamps today as the legally binding `optInDate`.
 */
export class ResolveCampaignContactsUseCase {
  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly csvPort: CsvPort,
    private readonly logger: LoggerPort,
    private readonly timeProvider: TimeProvider
  ) {}

  /**
   * Reads a CSV upload, checks against existing records, and safely upserts
   * data without destroying GDPR consent history.
   */
  public async execute(csvFilePath: string): Promise<Contact[]> {
    this.logger.info(`Resolving contacts from ${csvFilePath}`);
    const rawRows = await this.csvPort.read(csvFilePath);

    const resolvedContacts: Contact[] = [];

    const now = this.timeProvider.getCurrentDate();

    for (const row of rawRows) {
      let contact = await this.contactRepo.getByEmail(row.email);

      if (contact) {
        // Upsert: Update metadata, but strictly preserve `status` and `optInDate`
        contact.firstName = row.firstName || contact.firstName;
        contact.lastName = row.lastName || contact.lastName;

        // Only re-subscribe if they were previously anonymized/unsubscribed
        // and explicitly signed up again via this new list
        if (contact.status === ConsentStatus.UNSUBSCRIBED) {
          this.logger.info(`Re-subscribing previously unsubscribed contact: ${contact.email}`);
          contact.renewConsent(now);
        }
      } else {
        // New Contact: Create fresh with today's opt-in date
        const now = this.timeProvider.getCurrentDate();
        contact = new Contact(
          `ctct_${randomUUID()}` as ContactId,
          row.firstName ?? 'Unknown',
          row.lastName ?? 'Unknown',
          row.email,
          now,
          row.jobTitle,
          row.company
        );
      }

      await this.contactRepo.save(contact);
      resolvedContacts.push(contact);
    }

    return resolvedContacts;
  }
}
