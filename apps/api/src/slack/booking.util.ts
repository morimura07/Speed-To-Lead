import type { NormalizedLead } from '../ingestion/adapters/crm-adapter';

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/;

/** First non-empty line of a message, trimmed and length-capped. */
function firstLine(text: string, max = 140): string {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (line ?? 'Untitled').slice(0, max);
}

/**
 * Extract the booking title + host email from a Slack appointment message.
 * Looks for an explicit `host:`/`rep:` email first, then any email in the text.
 */
export function parseBooking(text: string): { title: string; hostEmail: string | null } {
  const labeled = /(?:host|rep|closer)\s*[:=]\s*([\w.+-]+@[\w-]+\.[\w.-]+)/i.exec(text);
  const hostEmail = labeled?.[1] ?? EMAIL_RE.exec(text)?.[0] ?? null;
  return { title: firstLine(text), hostEmail: hostEmail?.toLowerCase() ?? null };
}

/** Turn a Slack "lead" message into a normalized lead (ts is the external id). */
export function parseSlackLead(text: string, ts: string): NormalizedLead {
  return {
    externalId: ts,
    name: firstLine(text, 120),
    email: EMAIL_RE.exec(text)?.[0]?.toLowerCase(),
    phone: PHONE_RE.exec(text)?.[0]?.replace(/[\s().-]/g, ''),
    raw: { text, ts },
  };
}
