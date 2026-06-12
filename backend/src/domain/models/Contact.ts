import { type ContactId } from '@domain/models/BrandedTypes';

export enum ConsentStatus {
  SUBSCRIBED = 'SUBSCRIBED',
  PENDING_RENEWAL = 'PENDING_RENEWAL',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  ANONYMIZED = 'ANONYMIZED'
}

export class Contact {
  public readonly id: ContactId;
  public firstName: string;
  public lastName: string;
  public email: string;
  public jobTitle?: string | undefined;
  public company?: string | undefined;

  // GDPR & Consent tracking fields
  public status: ConsentStatus;
  public optInDate: Date;
  public renewalToken?: string | undefined;

  constructor(
    id: ContactId,
    firstName: string,
    lastName: string,
    email: string,
    optInDate: Date,
    jobTitle?: string,
    company?: string,
    status: ConsentStatus = ConsentStatus.SUBSCRIBED,
    renewalToken?: string
  ) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    if (jobTitle) this.jobTitle = jobTitle;
    if (company) this.company = company;
    this.status = status;
    this.optInDate = optInDate;
    if (renewalToken) this.renewalToken = renewalToken;
  }

  /**
   * Checks if the contact's consent has passed the legal validity period.
   * @param validityYears The number of years consent is legally valid (e.g., 3 for CNIL)
   */
  public isConsentExpiring(validityYears: number, now: Date): boolean {
    if (this.status !== ConsentStatus.SUBSCRIBED) {
      return false;
    }

    const expirationDate = new Date(this.optInDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + validityYears);

    return now >= expirationDate;
  }

  /**
   * Transitions the contact into a pending state and assigns a secure token for the email link.
   */
  public markForRenewal(token: string): void {
    this.status = ConsentStatus.PENDING_RENEWAL;
    this.renewalToken = token;
  }

  /**
   * Called when the user clicks the renewal link. Resets the clock.
   */
  public renewConsent(now: Date): void {
    this.status = ConsentStatus.SUBSCRIBED;
    this.optInDate = now;
    this.renewalToken = undefined;
  }

  /**
   * Standard opt-out. Data is retained but marked as unmailable.
   */
  public unsubscribe(): void {
    this.status = ConsentStatus.UNSUBSCRIBED;
    this.renewalToken = undefined;
  }

  /**
   * Fulfills the "Right to be Forgotten".
   * Wipes all Personally Identifiable Information (PII) while keeping the ID intact
   * so historical campaign delivery stats don't break.
   */
  public anonymize(): void {
    this.status = ConsentStatus.ANONYMIZED;
    this.firstName = 'Anonymized';
    this.lastName = 'Anonymized';
    // Use a safe, unroutable fake email to satisfy email format validators
    this.email = `${this.id}@anonymized.local`;
    this.jobTitle = undefined;
    this.company = undefined;
    this.renewalToken = undefined;
  }
}
