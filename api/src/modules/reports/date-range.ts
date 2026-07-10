/**
 * Period boundary helpers for reports. Pure functions so period math can be
 * unit-tested without a database. All ranges are half-open-safe: we return
 * inclusive start and end-of-day so Prisma `gte`/`lte` filters behave.
 */

export type Period = 'today' | 'week' | 'month' | 'year';

export interface DateRange {
  start: Date;
  end: Date;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolve a named period into a concrete date range, relative to `now`. */
export function rangeFor(period: Period, now: Date = new Date()): DateRange {
  const end = endOfDay(now);
  const start = startOfDay(now);
  switch (period) {
    case 'today':
      return { start, end };
    case 'week': {
      const s = startOfDay(now);
      s.setDate(s.getDate() - 6); // last 7 days inclusive
      return { start: s, end };
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: s, end };
    }
    case 'year': {
      const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start: s, end };
    }
  }
}

/** A list of daily buckets [start,end] spanning the last `days` days inclusive. */
export function dailyBuckets(days: number, now: Date = new Date()): DateRange[] {
  const buckets: DateRange[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    buckets.push({ start: startOfDay(day), end: endOfDay(day) });
  }
  return buckets;
}

/** YYYY-MM-DD label for a date (local). */
export function dayLabel(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
