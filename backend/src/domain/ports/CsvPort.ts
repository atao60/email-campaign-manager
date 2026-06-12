import { type Contact } from '@domain/models/Contact';

export interface CsvRow {
  email: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  company?: string;
}

export interface CsvPort {
  read(filePath: string): Promise<CsvRow[]>;
  write(filePath: string, contacts: Contact[]): Promise<void>;
}
