// src/application/usecases/SendCampaignUseCase.ts
import { type EmailPort } from '@domain/ports/EmailPort';
import { type CsvPort } from '@domain/ports/CsvPort';
import { type LoggerPort } from '@domain/ports/LoggerPort';

export class SendCampaignUseCase {
  constructor(
    private readonly csvPort: CsvPort,
    private readonly emailPort: EmailPort,
    private readonly logger: LoggerPort
  ) {}

  public async execute(contactsFilePath: string, subject: string, templateHtml: string): Promise<number> {
    this.logger.info(`Reading contacts from ${contactsFilePath}`);

    const contacts = await this.csvPort.read(contactsFilePath);

    if (contacts.length === 0) {
      this.logger.warn('No contacts found in the file. Aborting campaign.');
      return 0;
    }

    this.logger.info(`Queuing campaign for ${contacts.length} contacts...`);

    for (const contact of contacts) {
      const personalizedHtml = templateHtml.replace('{{firstName}}', contact.firstName);

      await this.emailPort.send(contact, {
        subject: subject,
        bodyHtml: personalizedHtml
      });
    }

    this.logger.info('All emails successfully queued to Redis.');

    // Return the total number of contacts processed
    return contacts.length;
  }
}
