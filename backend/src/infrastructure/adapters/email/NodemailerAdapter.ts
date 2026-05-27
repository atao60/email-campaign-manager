import nodemailer from 'nodemailer';
import { type Contact } from '@domain/models/Contact';
import type { EmailPort, EmailMessageDto, LoggerPort } from '@domain/ports';

/**
 * ==========================================
 * Local Development SMTP Adapter (Nodemailer)
 * ==========================================
 *
 * @rule
 * Provides the concrete infrastructure implementation of the `EmailPort` interface
 * using the `nodemailer` library to send emails via SMTP.
 *
 * @why
 * This adapter is specifically designed to route emails to a local testing server
 * (like Maildev or MailHog) on port 1025. It guarantees that real emails are never
 * sent to real users during active development.
 *
 * @warning
 * **Nodemailer is an SMTP Client, not an SMTP Server.**
 * It cannot send emails to the outside world by itself. The default configuration
 * (`localhost:1025`) is strictly for local development using mock servers like Maildev or MailHog.
 * For production environments, the container injecting this adapter MUST provide valid
 * credentials (host, port, auth) for a production-grade SMTP relay (e.g., Amazon SES, SendGrid SMTP).
 *
 * @how
 * It wraps a Nodemailer `Transporter` configured to ignore TLS and connect locally.
 * Because it simulates network traffic, it intentionally includes fail-states
 * for specific test emails (e.g., addresses containing 'fail') to verify how
 * the domain handles SMTP connection rejections.
 *
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
    const toAddress = contact.firstName ? `"${contact.firstName}" <${contact.email}>` : contact.email;
    console.log('[TEST] NodemailerAdapter.send, contact: ', toAddress);

    // FUTURE. TO BE REMOVED. Dirty fail test until a full test available.
    // Run `npx tsx src/main.ts send-campaign data/fail-test.csv`
    if (contact.email.includes('fail')) {
      this.logger.warn(`[SIMULATION] Intentionally failing email for ${toAddress}`);
      throw new Error('SIMULATED_SMTP_ERROR: Connection refused or host unreachable');
    }

    try {
      await this.transporter.sendMail({
        from: '"Campaign Manager" <noreply@example.com>',
        to: toAddress,
        subject: `[DEV] ${message.subject}`,
        html: message.bodyHtml,
        attachments: message.attachments
      });
      this.logger.info(`✉️ [DEV] Email intercepted by local NodemailerAdapter for: ${toAddress}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${toAddress}`, error);
      // Here: interact with FailedEmailRepository to log the failure
    }
  }

  public async scheduleSend(contact: Contact, message: EmailMessageDto, delayMs: number): Promise<void> {
    this.logger.info(`⏳ [DEV] Simulating scheduled email to ${contact.email} in ${delayMs}ms`);
    setTimeout(() => {
      this.send(contact, message).catch((err) => this.logger.error('Scheduled send failed', err));
    }, delayMs);
  }
}
