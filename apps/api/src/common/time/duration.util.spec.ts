import { parseDurationMs, fromNow } from './duration.util';

describe('parseDurationMs', () => {
  it.each([
    ['45s', 45_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['30d', 2_592_000_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseDurationMs(' 5m ')).toBe(300_000);
  });

  it('throws on malformed input', () => {
    expect(() => parseDurationMs('soon')).toThrow(/Invalid duration/);
    expect(() => parseDurationMs('10y')).toThrow(/Invalid duration/);
  });
});

describe('fromNow', () => {
  it('returns a future date', () => {
    expect(fromNow('1h').getTime()).toBeGreaterThan(Date.now());
  });
});
