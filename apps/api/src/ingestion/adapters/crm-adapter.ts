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
