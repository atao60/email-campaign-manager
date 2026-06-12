import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SystemTimeProvider } from './SystemTimeProvider';

describe('SystemTimeProvider', () => {
  let provider: SystemTimeProvider;

  beforeEach(() => {
    provider = new SystemTimeProvider();

    // Tell Vitest to take control of the global Date object
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Always restore real timers to avoid breaking other test suites
    vi.useRealTimers();
  });

  it('should return a valid Date instance', () => {
    const result = provider.getCurrentDate();

    expect(result).toBeInstanceOf(Date);
  });

  it('should return the exact current system date', () => {
    // Arrange: Freeze time to a highly specific, arbitrary date
    const frozenTime = new Date('2026-06-11T14:30:00.000Z');
    vi.setSystemTime(frozenTime);

    // Act
    const result = provider.getCurrentDate();

    // Assert: The provider should return the exact frozen time
    expect(result).toEqual(frozenTime);
    expect(result.toISOString()).toBe('2026-06-11T14:30:00.000Z');
  });

  it('should return updated times if time advances', () => {
    // Arrange: Freeze initial time
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const firstCall = provider.getCurrentDate();
    expect(firstCall.toISOString()).toBe('2026-01-01T00:00:00.000Z');

    // Act: Advance the fake clock by 5000 milliseconds (5 seconds)
    vi.advanceTimersByTime(5000);
    const secondCall = provider.getCurrentDate();

    // Assert
    expect(secondCall.toISOString()).toBe('2026-01-01T00:00:05.000Z');
  });
});
