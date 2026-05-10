import { type FailedEmail } from '@domain/models/FailedEmail';

export interface FailedEmailRepository {
  save(failure: FailedEmail): Promise<void>;
  findAll(): Promise<FailedEmail[]>;
}
