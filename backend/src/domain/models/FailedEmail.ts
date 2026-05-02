import { type FailedEmailId, type ContactId } from './BrandedTypes';

export class FailedEmail {
  constructor(
    public readonly id: FailedEmailId,
    public readonly contactId: ContactId,
    public readonly emailAddress: string,
    public readonly reason: string,
    public readonly failedAt: Date
  ) {}
}
