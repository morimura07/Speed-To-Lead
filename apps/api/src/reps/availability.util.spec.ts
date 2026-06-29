import {
  isAvailableAt,
  localParts,
  nextAvailableFrom,
  parseSchedule,
  validateDaysOff,
  validateSchedule,
} from './availability.util';

// 2026-06-29 13:30 UTC. Summer: New York = EDT (UTC-4) → 09:30 Mon;
// Tokyo (UTC+9) → 22:30 Mon.
const MON_1330Z = new Date('2026-06-29T13:30:00Z');
// 2026-06-30 02:00 UTC. New York → 22:00 Mon (Jun 29); Tokyo → 11:00 Tue (Jun 30).
const BOUNDARY = new Date('2026-06-30T02:00:00Z');

describe('localParts', () => {
  it('resolves weekday/time/date per timezone', () => {
    const ny = localParts(MON_1330Z, 'America/New_York');
    expect(ny).toEqual({ weekday: 1, minutes: 9 * 60 + 30, date: '2026-06-29' });

    const tokyo = localParts(MON_1330Z, 'Asia/Tokyo');
    expect(tokyo).toEqual({ weekday: 1, minutes: 22 * 60 + 30, date: '2026-06-29' });
  });

  it('crosses the day boundary by timezone', () => {
    expect(localParts(BOUNDARY, 'America/New_York').date).toBe('2026-06-29');
    expect(localParts(BOUNDARY, 'Asia/Tokyo').date).toBe('2026-06-30');
    expect(localParts(BOUNDARY, 'Asia/Tokyo').weekday).toBe(2); // Tue
  });

  it('falls back to UTC for an unknown timezone', () => {
    expect(localParts(MON_1330Z, 'Not/AZone').minutes).toBe(13 * 60 + 30);
  });
});

describe('isAvailableAt', () => {
  const mon9to5: ReturnType<typeof parseSchedule> = { '1': [{ start: '09:00', end: '17:00' }] };

  it('treats an empty schedule as always available', () => {
    expect(isAvailableAt({}, [], 'America/New_York', MON_1330Z)).toBe(true);
  });

  it('respects working windows in the rep timezone', () => {
    // NY 09:30 Mon is inside 09:00–17:00; Tokyo 22:30 Mon is outside.
    expect(isAvailableAt(mon9to5, [], 'America/New_York', MON_1330Z)).toBe(true);
    expect(isAvailableAt(mon9to5, [], 'Asia/Tokyo', MON_1330Z)).toBe(false);
  });

  it('returns false on a weekday with no windows', () => {
    expect(isAvailableAt({ '2': [{ start: '09:00', end: '17:00' }] }, [], 'America/New_York', MON_1330Z)).toBe(
      false,
    );
  });

  it('excludes days off (by local date)', () => {
    expect(isAvailableAt(mon9to5, ['2026-06-29'], 'America/New_York', MON_1330Z)).toBe(false);
  });

  it('uses the timezone-local weekday at the day boundary', () => {
    // Same instant: Mon in NY (available within Mon window), Tue in Tokyo (no Tue window).
    const schedule = { '1': [{ start: '00:00', end: '23:59' }] };
    expect(isAvailableAt(schedule, [], 'America/New_York', BOUNDARY)).toBe(true);
    expect(isAvailableAt(schedule, [], 'Asia/Tokyo', BOUNDARY)).toBe(false);
  });
});

describe('nextAvailableFrom', () => {
  const mon9to5 = { '1': [{ start: '09:00', end: '17:00' }] };

  it('returns the start time when already available', () => {
    expect(nextAvailableFrom({}, [], 'America/New_York', MON_1330Z)).toEqual(MON_1330Z);
  });

  it('advances to the next open window in the rep timezone', () => {
    // NY 02:00 Mon (before the window) → should land at 09:00 Mon NY.
    const before = new Date('2026-06-29T06:00:00Z'); // 02:00 EDT Mon
    const next = nextAvailableFrom(mon9to5, [], 'America/New_York', before);
    expect(next).not.toBeNull();
    expect(localParts(next!, 'America/New_York').minutes).toBe(9 * 60);
  });

  it('returns null when no slot exists within the window', () => {
    // Only Mondays are workable; starting Tuesday with a 2-day horizon finds none.
    const tue = new Date('2026-06-30T13:00:00Z');
    expect(nextAvailableFrom(mon9to5, [], 'America/New_York', tue, 2)).toBeNull();
  });
});

describe('validation', () => {
  it('accepts a valid schedule and rejects bad shapes', () => {
    expect(validateSchedule({ '1': [{ start: '09:00', end: '17:00' }] })).toBeTruthy();
    expect(() => validateSchedule({ '9': [] })).toThrow();
    expect(() => validateSchedule({ '1': [{ start: '17:00', end: '09:00' }] })).toThrow();
    expect(() => validateSchedule({ '1': [{ start: '25:00', end: '26:00' }] })).toThrow();
  });

  it('accepts/rejects days-off lists', () => {
    expect(validateDaysOff(['2026-06-29'])).toEqual(['2026-06-29']);
    expect(() => validateDaysOff(['June 29'])).toThrow();
  });
});
