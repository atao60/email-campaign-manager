import type { CsvPort, EmailPort, LoggerPort, EmailAttachmentDto, EmailMessageDto } from '@domain/ports';
import type { CampaignHistoryRepository } from '@domain/repositories';
import type { SentCampaign } from '@domain/models/Campaign';

export class SendCampaignUseCase {
  constructor(
    private readonly csvPort: CsvPort,
    private readonly emailPort: EmailPort,
    private readonly logger: LoggerPort,
    private readonly historyRepository: CampaignHistoryRepository
  ) {}

  public async execute(
    contactsFilePath: string,
    subject: string,
    template: { label?: string; html?: string; url?: string; attachments?: EmailAttachmentDto[] }
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

    // Retrieve the contact list
    this.logger.info(`Reading contacts from ${contactsFilePath}`);

    const contacts = await this.csvPort.read(contactsFilePath);

    if (contacts.length === 0) {
      this.logger.warn('No contacts found in the file. Aborting campaign.');
      return 0;
    }

    // Process contacts: put them in queue, waiting to be sent
    this.logger.info(`Queuing campaign for ${contacts.length} contacts...`);

    for (const contact of contacts) {
      const personalizedHtml = templateHtml
        .replace(/{{firstName}}/g, contact.firstName)
        .replace(/{{lastName}}/g, contact.lastName)
        .replace(/{{email}}/g, contact.email);

      const messagePayload: EmailMessageDto = {
        subject: subject,
        bodyHtml: personalizedHtml,
        ...(template.label && { label: template.label }),
        ...(template.attachments && { attachments: template.attachments })
      };
      await this.emailPort.send(contact, messagePayload);
    }

    this.logger.info('All emails successfully queued to Redis.');

    const pendingEmails = contacts.map((contact) => ({
      address: contact.email,
      name: contact.firstName + ' ' + contact.lastName,
      status: 'PENDING' as const
    }));

    // Build the campaign record
    const campaignRecord: SentCampaign = {
      id: `camp_${Date.now()}`,
      subject: subject,
      ...(template.label && { label: template.label }),
      sentDate: new Date().toISOString(),
      totalSent: contacts.length,
      status: 'PARTIAL', // It stays PARTIAL until webhooks confirm delivery or failure
      htmlContent: templateHtml,
      emails: pendingEmails
    };

    // Save the campaign record to the history repository
    this.logger.info(`Saving campaign history for ${campaignRecord.id}`);
    await this.historyRepository.save(campaignRecord);

    // Return the total number of contacts processed
    return contacts.length;
  }
}
