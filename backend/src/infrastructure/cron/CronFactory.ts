export function createCronSchedule(time: string, periodicity: 'daily' | 'weekly'): string {
  const [hour, minute] = time.split(':');

  if (periodicity === 'daily') {
    return `${minute} ${hour} * * *`;
  }

  // Weekly default: Sunday at the specified time
  return `${minute} ${hour} * * 0`;
}
