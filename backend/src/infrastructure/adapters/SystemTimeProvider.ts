import type { TimeProvider } from '@domain/ports/TimeProvider';

export class SystemTimeProvider implements TimeProvider {
  getCurrentDate(): Date {
    return new Date();
  }
}
