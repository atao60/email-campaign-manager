import nodemailer from 'nodemailer';

import type { EmailPort, EmailMessageDto, LoggerPort } from '@domain/ports/';
import { type Contact } from '@domain/models/Contact';

const gmailConfig = {
  host: 'smtp.gmail.com',
  port: 465, // Secure SSL port
  secure: true
};

export interface GmailConfig {
  user: string;
  /** Gmail requires an "App Password", not your main account password */
  appPassword: string;
  defaultFrom: string;
  replyTo: string;
  logPrefix: string;
}

/**
 * ==========================================
 * Production SMTP Adapter (Gmail)
 * ==========================================
 *
 * @rule
 * Provides the concrete production implementation of the `EmailPort` interface,
 * specifically tailored for Google's secure SMTP relays.
 *
 * @warning
 * **Authentication Strictness:** Gmail strictly requires an "App Password" to bypass
 * its 2FA requirements. Attempting to use a standard Google account password will
 * result in immediate authentication failures (e.g., "Application-specific password required").
 *
 * @how
 * This class wraps a Nodemailer `Transporter` permanently configured to connect over
 * port 465 (Secure SSL). It translates the domain-agnostic `Contact` and `EmailMessageDto`
 * entities into Nodemailer's specific payload format, taking special care to format
 * recipient strings as `"{Name}" <{email}>` to satisfy strict header parsing.
 * It also handles network-level error wrapping and delegates observability to the
 * injected `LoggerPort`.
 */
export class GmailSmtpAdapter implements EmailPort {
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;
  private readonly replyTo: string;
  private readonly logPrefix: string;

  constructor(
    private readonly logger: LoggerPort,
    config: GmailConfig
  ) {
    this.defaultFrom = config.defaultFrom;
    this.replyTo = config.replyTo;
    this.logPrefix = config.logPrefix;

    this.transporter = nodemailer.createTransport({
      host: gmailConfig.host,
      port: gmailConfig.port,
      secure: gmailConfig.secure,
      auth: {
        user: config.user,
        pass: config.appPassword
      }
    });
  }

  async send(contact: Contact, message: EmailMessageDto): Promise<void> {
    // Map the Domain Entity to Infrastructure Primitives
    // Assuming Contact has 'email' and optionally 'firstName'/'lastName' or 'name'
    const recipientName = contact.firstName ? `${contact.firstName} ${contact.lastName || ''}`.trim() : '';
    const toAddress = recipientName ? `"${recipientName}" <${contact.email}>` : contact.email;

    // Map the DTO to Nodemailer Options
    const mailOptions: nodemailer.SendMailOptions = {
      from: this.defaultFrom,
      to: toAddress,
      subject: message.subject,
      html: message.bodyHtml,
      replyTo: this.replyTo,
      headers: message.label ? { 'X-Campaign-Label': message.label } : undefined,
      attachments: message.attachments?.map((att) => ({
        filename: att.filename,
        path: att.path,
        cid: att.cid
      }))
    };

    // Dispatch
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.info(`✉️ ${this.logPrefix} Email successfully sent to: ${toAddress}`);
    } catch (error) {
      this.logger.error(`[GmailSmtpAdapter] Failed to send email to ${toAddress}`, error);
      // Catch and wrap the error so the Domain doesn't leak Nodemailer-specific errors
      throw new Error(`[GmailSmtpAdapter] Failed to send email to ${contact.email}: ${(error as Error).message}`, {
        cause: error
      });
    }
  }

  async scheduleSend(contact: Contact, message: EmailMessageDto, delayMs: number): Promise<void> {
    // Note: In a true production environment, you would not use setTimeout.
    // You would push this job to a queue (like BullMQ, RabbitMQ, or AWS SQS).
    // This implementation is a placeholder to satisfy the interface until a queue is added.

    this.logger.info(`⏳ ${this.logPrefix} Scheduling email to ${contact.email} in ${delayMs}ms...`);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.send(contact, message).then(resolve).catch(reject);
      }, delayMs);
    });
  }
}
