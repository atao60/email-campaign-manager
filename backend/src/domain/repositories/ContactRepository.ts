import { type Contact } from '@domain/models/Contact';

export interface ContactRepository {
  save(contact: Contact): Promise<void>;
  getByEmail(email: string): Promise<Contact | null>;
  getAll(): Promise<Contact[]>;
}
