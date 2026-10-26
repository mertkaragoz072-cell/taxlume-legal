export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;

export interface ClockReading {
  day: number; // 1-based
  hour: number;
  minute: number;
  weekday: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function readClock(seconds: number): ClockReading {
  const dayIdx = Math.floor(seconds / DAY);
  const inDay = seconds - dayIdx * DAY;
  return {
    day: dayIdx + 1,
    hour: Math.floor(inDay / HOUR),
    minute: Math.floor((inDay % HOUR) / MINUTE),
    weekday: WEEKDAYS[dayIdx % 7] ?? 'Mon',
  };
}

export function formatClock(seconds: number): string {
  const c = readClock(seconds);
  return `${c.weekday} · Day ${c.day} · ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}

export function dayPart(seconds: number): 'night' | 'morning' | 'afternoon' | 'evening' {
  const h = readClock(seconds).hour;
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}
