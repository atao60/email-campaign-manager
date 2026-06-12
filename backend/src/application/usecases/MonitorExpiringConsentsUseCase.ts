import { randomBytes } from 'node:crypto';

import type { EmailPort, LoggerPort, EmailMessageDto, LanguagePort, TimeProvider } from '@domain/ports';
import type { ContactRepository } from '@domain/repositories';

export interface GdprMonitorConfig {
  consentValidityYears: number;
  renewalDaysLimit: number;
  frontendUrl: string;
  checkingPeriodicity: string;
}

const RENEWAL_TOKEN_IN_BYTES = 32;

/**
 * ==========================================
 * Use Case: Monitor Expiring Consents (GDPR Watchdog)
 * ==========================================
 *
 * @rule
 * An automated background service responsible for enforcing data retention
 * policies and triggering the re-permissioning workflow.
 *
 * @why
 * Under GDPR (and specific guidelines like the French CNIL), marketing consent
 * is not permanent; it typically expires after 3 years of inactivity. Without an
 * automated monitor, the system would eventually hold illegal, stale PII. This
 * use case ensures the application proactively maintains its own legal compliance
 * without requiring manual intervention from the admins.
 *
 * @how
 * - Retrieves all known contacts from the `ContactRepository`.
 * - Delegates the legal time-math to the domain entity by calling
 *    `contact.isConsentExpiring(3)`.
 * - **For expiring contacts:** Generates a secure, 32-byte cryptographic token.
 *   (providing 256 bits of entropy, which guarantees mathematical collision
 *   resistance without prior database lookups and total immunity to brute-force attacks).
 * - Updates the domain state via `contact.markForRenewal(token)`.
 * - Formats and dispatches an automated "re-permissioning" email via the `EmailPort`
 *   containing the secure link. If the user clicks the link, the token validates
 *   the request and resets their 3-year legal timer.
 */
export class MonitorExpiringConsentsUseCase {
  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly emailPort: EmailPort,
    private readonly logger: LoggerPort,
    private readonly i18n: LanguagePort,
    private readonly timeProvider: TimeProvider,
    private readonly config: GdprMonitorConfig
  ) {}

  public async execute(): Promise<number> {
    this.logger.info(`Starting ${this.config.checkingPeriodicity || 'periodic'} GDPR consent expiration monitor...`);

    const allContacts = await this.contactRepo.getAll();
    const batchExecutionTime = this.timeProvider.getCurrentDate();
    let expiringCount = 0;

    for (const contact of allContacts) {
      if (!contact.isConsentExpiring(this.config.consentValidityYears, batchExecutionTime)) {
        continue;
      }

      // Generate a cryptographically secure token
      const token = randomBytes(RENEWAL_TOKEN_IN_BYTES).toString('hex');

      // Update the domain state
      contact.markForRenewal(token);
      await this.contactRepo.save(contact);

      // Avoids double slashes if FRONTEND_URL has a trailing slash
      const baseUrl = this.config.frontendUrl.replace(/\/$/, '');
      const renewalLink = `${baseUrl}/renew?t=${token}`;

      // Dispatch the renewal email
      const message: EmailMessageDto = {
        // subject: 'Do you still want to hear from us?',
        subject: this.i18n.translate('email:gdpr.renewalSubject'),
        // bodyHtml: `
        //     <p>Hi ${contact.firstName},</p>
        //     <p>It's been a while! To comply with data protection laws, we need you to confirm if you'd still like to receive our emails.</p>
        //     <a href="${renewalLink}" style="padding: 10px 20px; background: #2563eb; color: white; text-decoration: none;">Yes, keep me subscribed</a>
        //     <p>If you don't click the link within 14 days, we will automatically remove your data from our systems.</p>
        //   `
        bodyHtml: this.i18n.translate('email:gdpr.renewalBodyHtml', {
          firstName: contact.firstName,
          renewalLink: renewalLink,
          daysLimit: this.config.renewalDaysLimit.toString()
        })
      };

      await this.emailPort.send(contact, message);
      expiringCount++;
      this.logger.info(`Renewal request sent to ${contact.email}`);
    }

    this.logger.info(`Monitor complete. Sent ${expiringCount} renewal requests.`);
    return expiringCount;
  }
}
