import { formatDuration, ratePct, roundSeconds, safeDiv, toNumber } from './analytics.util';

describe('analytics.util', () => {
  describe('safeDiv', () => {
    it('divides normally and guards divide-by-zero', () => {
      expect(safeDiv(6, 2)).toBe(3);
      expect(safeDiv(5, 0)).toBe(0);
    });
  });

  describe('ratePct', () => {
    it('computes a rounded percentage', () => {
      expect(ratePct(1, 4)).toBe(25);
      expect(ratePct(0, 0)).toBe(0);
      expect(ratePct(1, 3, 1)).toBe(33.3);
    });
  });

  describe('toNumber', () => {
    it('coerces SQL string/bigint values', () => {
      expect(toNumber('42')).toBe(42);
      expect(toNumber(7n)).toBe(7);
      expect(toNumber(3.5)).toBe(3.5);
      expect(toNumber(null)).toBe(0);
      expect(toNumber('nope')).toBe(0);
    });
  });

  describe('roundSeconds', () => {
    it('rounds or passes through null', () => {
      expect(roundSeconds(12.7)).toBe(13);
      expect(roundSeconds(null)).toBeNull();
      expect(roundSeconds(NaN)).toBeNull();
    });
  });

  describe('formatDuration', () => {
    it('formats seconds/minutes', () => {
      expect(formatDuration(null)).toBe('—');
      expect(formatDuration(8)).toBe('8s');
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(75)).toBe('1m 15s');
    });
  });
});
