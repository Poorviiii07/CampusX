import { DayOfWeek } from '@prisma/client';

export interface PeriodTime {
  period: number;
  start: string;
  end: string;
}

export const PERIOD_TIMES: PeriodTime[] = [
  { period: 1, start: '08:00', end: '08:55' },
  { period: 2, start: '09:00', end: '09:55' },
  { period: 3, start: '10:00', end: '10:55' },
  { period: 4, start: '11:00', end: '11:55' },
  { period: 5, start: '12:00', end: '12:55' },
  { period: 6, start: '13:00', end: '13:55' },
  { period: 7, start: '14:00', end: '14:55' },
  { period: 8, start: '15:00', end: '15:55' },
];

/**
 * Returns the current period number (1-8) or null if outside all periods.
 */
export function getCurrentPeriod(date: Date = new Date()): number | null {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  for (const pt of PERIOD_TIMES) {
    if (currentTime >= pt.start && currentTime <= pt.end) {
      return pt.period;
    }
  }
  return null;
}

/**
 * Returns {start, end} times for a given period number.
 */
export function getPeriodTimes(period: number): { start: string; end: string } {
  const pt = PERIOD_TIMES.find((p) => p.period === period);
  if (!pt) throw new Error(`Invalid period: ${period}`);
  return { start: pt.start, end: pt.end };
}

const DAY_MAP: Record<number, DayOfWeek> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

/**
 * Returns the DayOfWeek enum value for a date, or null for Sunday (0).
 */
export function isDayOfWeek(date: Date): DayOfWeek | null {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return DAY_MAP[day] ?? null;
}
