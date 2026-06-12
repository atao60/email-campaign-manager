import { Contact, ConsentStatus } from '@domain/models/Contact';
import type { ContactId } from '@domain/models/BrandedTypes';
import type { ContactRepository } from '@domain/repositories/ContactRepository';
import type { TimeProvider, LoggerPort, DataSeeder } from '@domain/ports';

export class DevDataSeeder implements DataSeeder {
  constructor(
    private readonly repo: ContactRepository,
    private readonly timeProvider: TimeProvider,
    private readonly logger: LoggerPort
  ) {}

  public async seed(): Promise<void> {
    const existingContacts = await this.repo.getAll();
    if (existingContacts.length > 0) return;

    this.logger.info('🌱 [DevDataSeeder] Repository is empty. Seeding dummy data...');
    const now = this.timeProvider.getCurrentDate();

    const validDate = new Date(now);
    validDate.setFullYear(now.getFullYear() - 1);

    const expiredDate = new Date(now);
    expiredDate.setFullYear(now.getFullYear() - 4);

    const mockContacts = [
      new Contact('ctct_dev_1' as ContactId, 'Alice', 'Fresh', 'alice@test.com', validDate),
      new Contact('ctct_dev_2' as ContactId, 'Bob', 'Expired', 'bob@test.com', expiredDate),
      new Contact(
        'ctct_dev_3' as ContactId,
        'Charlie',
        'OptOut',
        'charlie@test.com',
        expiredDate,
        undefined,
        undefined,
        ConsentStatus.UNSUBSCRIBED
      )
    ];

    for (const contact of mockContacts) {
      await this.repo.save(contact);
    }
    this.logger.info('✅ [DevDataSeeder] Seeded 3 contacts.');
  }
}
