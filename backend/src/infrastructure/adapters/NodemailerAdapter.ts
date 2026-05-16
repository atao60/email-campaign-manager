import nodemailer from 'nodemailer';
import { type Contact } from '@domain/models/Contact';
import type { EmailPort, EmailMessageDto, LoggerPort } from '@domain/ports';

/**
 * ==========================================
 * Synchronous SMTP Client Adapter
 * ==========================================
 *
 * @rule
 * Provides the concrete infrastructure implementation of the `EmailPort` interface
 * using the `nodemailer` library to send emails via SMTP.
 *
 * @why
 * Following Hexagonal (Ports and Adapters) Architecture, the core domain must remain
 * strictly isolated from third-party libraries and network protocols. By encapsulating
 * Nodemailer inside this adapter, we protect the business logic (Use Cases) from being tightly
 * coupled to SMTP. If the application later migrates to an API-based email provider
 * (e.g., SendGrid, AWS SES), a new adapter can simply be swapped in without altering a
 * single line of core domain code.
 *
 * @warning
 * **Nodemailer is an SMTP Client, not an SMTP Server.**
 * It cannot send emails to the outside world by itself. The default configuration
 * (`localhost:1025`) is strictly for local development using mock servers like Maildev or MailHog.
 * For production environments, the container injecting this adapter MUST provide valid
 * credentials (host, port, auth) for a production-grade SMTP relay (e.g., Amazon SES, SendGrid SMTP).
 *
 * @how
 * This class wraps a Nodemailer `Transporter` configured with connection pooling to
 * safely handle bulk email processing without overwhelming the server.
 * When the domain invokes `send()` or `scheduleSend()`, the adapter translates the domain-agnostic
 * `Contact` and `EmailMessageDto` objects into Nodemailer's specific payload format.
 * It manages the actual SMTP transmission, catches network-level errors, and delegates
 * observability to the injected `LoggerPort`.
 */
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
      // Here: interact with FailedEmailRepository to log the failure
    }
  }

  public async scheduleSend(contact: Contact, message: EmailMessageDto, delayMs: number): Promise<void> {
    setTimeout(() => {
      this.send(contact, message).catch((err) => this.logger.error('Scheduled send failed', err));
    }, delayMs);
  }
}
