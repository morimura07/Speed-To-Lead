import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  headerValue,
  type CrmAdapter,
  type NormalizedLead,
  type SignatureContext,
} from './crm-adapter';

/** Reject deliveries whose timestamp is older than this (replay protection). */
const MAX_SKEW_SECONDS = 5 * 60;

// ── Minimal shapes we read from Close webhook payloads ───────────────────────

interface CloseContact {
  name?: string;
  emails?: Array<{ email?: string }>;
  phones?: Array<{ phone?: string }>;
}
interface CloseLeadData {
  id?: string;
  display_name?: string;
  name?: string;
  contacts?: CloseContact[];
}
interface CloseEvent {
  object_type?: string;
  action?: string;
  data?: CloseLeadData;
}

/**
 * Adapter for Close CRM (https://developer.close.com/topics/webhook-signatures).
 *
 * Signature scheme: HMAC-SHA256, hex-encoded, over `${timestamp}${rawBody}`,
 * keyed by the subscription's signature key. Delivered via the
 * `close-sig-hash` and `close-sig-timestamp` headers.
 */
@Injectable()
export class CloseCrmAdapter implements CrmAdapter {
  readonly source = 'close';

  verifySignature(ctx: SignatureContext): boolean {
    const hash = headerValue(ctx.headers, 'close-sig-hash');
    const timestamp = headerValue(ctx.headers, 'close-sig-timestamp');
    if (!hash || !timestamp) return false;

    // Reject stale deliveries to blunt replay attacks.
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
      return false;
    }

    const expected = createHmac('sha256', ctx.secret)
      .update(`${timestamp}${ctx.rawBody}`)
      .digest('hex');

    return safeEqualHex(expected, hash);
  }

  normalize(payload: unknown): NormalizedLead[] {
    if (!isObject(payload)) return [];
    const event = (isObject(payload.event) ? payload.event : payload) as CloseEvent;

    // Only act on lead-shaped events.
    if (event.object_type && event.object_type !== 'lead') return [];

    const data = event.data;
    const externalId = data?.id;
    if (!externalId) return [];

    const contact = data.contacts?.[0];
    const name =
      data.display_name?.trim() ||
      data.name?.trim() ||
      contact?.name?.trim() ||
      'Unknown lead';

    return [
      {
        externalId,
        name,
        email: firstTruthy(contact?.emails?.map((e) => e.email)),
        phone: firstTruthy(contact?.phones?.map((p) => p.phone)),
        crmRecordUrl: `https://app.close.com/lead/${externalId}/`,
        raw: payload,
      },
    ];
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function firstTruthy(values?: Array<string | undefined>): string | undefined {
  return values?.find((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
