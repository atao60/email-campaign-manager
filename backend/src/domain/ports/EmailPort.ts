import { type Contact } from '@domain/models/Contact';

export interface EmailAttachmentDto {
  readonly filename: string;
  readonly path: string;
}

export interface EmailMessageDto {
  readonly subject: string;
  readonly bodyHtml: string;
  readonly attachments?: EmailAttachmentDto[];
}

export interface EmailPort {
  send(contact: Contact, message: EmailMessageDto): Promise<void>;
  scheduleSend(contact: Contact, message: EmailMessageDto, delayMs: number): Promise<void>;
}
