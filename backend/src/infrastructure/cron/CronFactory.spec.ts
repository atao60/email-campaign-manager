import { describe, it, expect } from 'vitest';
import { createCronSchedule } from './CronFactory';

describe('CronFactory', () => {
  describe('createCronSchedule()', () => {
    it('should generate a valid daily cron string for a given time', () => {
      // Act
      const result = createCronSchedule('14:30', 'daily');

      // Assert
      // Format: minute hour dayOfMonth month dayOfWeek
      expect(result).toBe('30 14 * * *');
    });

    it('should generate a valid weekly cron string that defaults to Sunday', () => {
      // Act
      const result = createCronSchedule('02:15', 'weekly');

      // Assert
      // Day 0 in cron is Sunday
      expect(result).toBe('15 02 * * 0');
    });

    it('should correctly handle midnight formatting (00:00)', () => {
      // Act
      const dailyResult = createCronSchedule('00:00', 'daily');
      const weeklyResult = createCronSchedule('00:00', 'weekly');

      // Assert
      expect(dailyResult).toBe('00 00 * * *');
      expect(weeklyResult).toBe('00 00 * * 0');
    });

    it('should correctly handle late night times (e.g., 23:59)', () => {
      // Act
      const result = createCronSchedule('23:59', 'daily');

      // Assert
      expect(result).toBe('59 23 * * *');
    });
  });
});
