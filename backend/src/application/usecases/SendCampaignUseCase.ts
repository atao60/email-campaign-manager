import { type EmailPort } from '@domain/ports/EmailPort';
import { type CsvPort } from '@domain/ports/CsvPort';
import { type LoggerPort } from '@domain/ports/LoggerPort';

export class SendCampaignUseCase {
  constructor(
    private readonly csvPort: CsvPort,
    private readonly emailPort: EmailPort,
    private readonly logger: LoggerPort
  ) {}

  public async execute(
    contactsFilePath: string,
    subject: string,
    template: { html?: string; url?: string }
  ): Promise<number> {
    // Resolve the HTML Content
    let templateHtml: string;

    if (template.html) {
      templateHtml = template.html;
    } else if (template.url) {
      this.logger.info(`Fetching HTML template from: ${template.url}`);
      try {
        const response = await fetch(template.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch template. HTTP Status: ${response.status}`);
        }
        templateHtml = await response.text();
      } catch (error) {
        console.error(`Could not download template from URL ${template.url}: `, error);
        throw new Error(`Could not download template from URL ${template.url}`, { cause: error });
      }
    } else {
      throw new Error('Either template HTML or URL must be provided.');
    }

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
