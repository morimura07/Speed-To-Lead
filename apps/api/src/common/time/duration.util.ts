/**
 * Parse a short duration string (e.g. "15m", "30d", "12h", "45s") into
 * milliseconds. Used to translate TTL config into concrete expiry dates.
 */
const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}" (expected e.g. "15m", "30d")`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  return value * UNIT_MS[unit];
}

export function fromNow(duration: string): Date {
  return new Date(Date.now() + parseDurationMs(duration));
}
