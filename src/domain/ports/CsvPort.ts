import { type Contact } from '@domain/models/Contact';

export interface CsvPort {
  read(filePath: string): Promise<Contact[]>;
  write(filePath: string, contacts: Contact[]): Promise<void>;
}
