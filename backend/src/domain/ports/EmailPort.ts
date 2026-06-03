import { type Contact } from '@domain/models/Contact';

export interface EmailAttachmentDto {
  readonly filename: string;
  readonly path: string;
  readonly cid?: string;
}

export interface EmailMessageDto {
  readonly subject: string;
  readonly bodyHtml: string;
  readonly attachments?: EmailAttachmentDto[];
}

/**
 * ==========================================
 * Outbound Port: Email Dispatcher
 * ==========================================
 *
 * @rule
 * Defines the contract for sending and scheduling emails from the core domain.
 *
 * @why
 * Following Clean/Hexagonal Architecture, the core domain (Use Cases, Entities)
 * must remain strictly isolated from third-party libraries and network protocols.
 * By relying on this interface, the domain dictates *what* to send and to *whom*,
 * without knowing *how* it gets delivered. If the application later migrates to an
 * API-based email provider (e.g., SendGrid, AWS SES), a new adapter can simply
 * be swapped into the DI container without altering a single line of core domain code.
 */
export interface EmailPort {
  send(contact: Contact, message: EmailMessageDto): Promise<void>;
  scheduleSend(contact: Contact, message: EmailMessageDto, delayMs: number): Promise<void>;
}
