import nodemailer from 'nodemailer';
import { type EmailPort, type EmailMessageDto } from '@domain/ports/EmailPort';
import { type Contact } from '@domain/models/Contact';
import { type LoggerPort } from '@domain/ports/LoggerPort';

export class NodemailerAdapter implements EmailPort {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly logger: LoggerPort,
    host: string = 'localhost',
    port: number = 1025
  ) {
    // Configured for Maildev local dev server by default.
    // Production config injected via JSON config file.
    this.transporter = nodemailer.createTransport({
      host,
      port,
      ignoreTLS: true,
      pool: true,
      maxConnections: 5, // Split sending / avoid limitation
      maxMessages: 100
    });
  }

  public async send(contact: Contact, message: EmailMessageDto): Promise<void> {
    console.log('NodemailerAdapter.send, contact: ', contact.email);

    // FUTURE. TO BE REMOVED. Dirty fail test until a full test available.
    // Run `npx tsx src/main.ts send-campaign data/fail-test.csv`
    if (contact.email.includes('fail')) {
      this.logger.warn(`[SIMULATION] Intentionally failing email for ${contact.email}`);
      throw new Error('SIMULATED_SMTP_ERROR: Connection refused or host unreachable');
    }

    try {
      await this.transporter.sendMail({
        from: '"Campaign Manager" <noreply@example.com>',
        to: contact.email,
        subject: message.subject,
        html: message.bodyHtml,
        attachments: message.attachments
      });
      this.logger.info(`Email sent to ${contact.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${contact.email}`, error);
      // Here: interact with FailedEmailRepositoryPort to log the failure
    }
  }

  public async scheduleSend(contact: Contact, message: EmailMessageDto, delayMs: number): Promise<void> {
    setTimeout(() => {
      this.send(contact, message).catch((err) => this.logger.error('Scheduled send failed', err));
    }, delayMs);
  }
}
