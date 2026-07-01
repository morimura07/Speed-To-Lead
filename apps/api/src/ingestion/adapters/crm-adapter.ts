import { timingSafeEqual } from 'node:crypto';

/** Provider-agnostic lead shape produced by every CRM adapter. */
export interface NormalizedLead {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  crmRecordUrl?: string;
  raw: Record<string, unknown>;
}

/** Everything an adapter needs to authenticate an inbound webhook. */
export interface SignatureContext {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
  secret: string;
  /** Absolute request URL (some schemes, e.g. HubSpot v3, sign over it). */
  url?: string;
  /** HTTP method (HubSpot v3 signs over it). */
  method?: string;
}

/**
 * Contract implemented once per CRM. Adapters are pure (no I/O): they verify a
 * webhook's authenticity and translate the provider payload into NormalizedLead
 * records. Persistence, eventing, and routing are handled by the ingestion
 * pipeline, not the adapter.
 */
export interface CrmAdapter {
  /** Provider key, matching the integration type (e.g. "close"). */
  readonly source: string;

  /** Returns true only if the request is a genuine, fresh delivery. */
  verifySignature(ctx: SignatureContext): boolean;

  /** Extract zero or more normalized leads from a (parsed) webhook payload. */
  normalize(payload: unknown): NormalizedLead[];
}

/** Read a header that may arrive as a string or string[]. */
export function headerValue(
  headers: SignatureContext['headers'],
  name: string,
): string | undefined {
  const raw = headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Constant-time compare of two equal-length strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** Pull the first non-empty string from a list (helper for normalizers). */
export function firstString(...values: Array<unknown>): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
}
