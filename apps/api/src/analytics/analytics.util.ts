/** Pure helpers for analytics math + formatting (no I/O — unit tested). */

/** Safe division returning 0 when the denominator is 0. */
export function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Percentage (0–100) of numerator over denominator, rounded to `decimals`. */
export function ratePct(numerator: number, denominator: number, decimals = 0): number {
  const pct = safeDiv(numerator, denominator) * 100;
  const f = 10 ** decimals;
  return Math.round(pct * f) / f;
}

/** Round a possibly-null number of seconds to a whole number (null → null). */
export function roundSeconds(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value);
}

/** Coerce a value that may arrive from SQL as a string|bigint|number into a number. */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Human-friendly short duration, e.g. 75 → "1m 15s", 8 → "8s", null → "—". */
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}
