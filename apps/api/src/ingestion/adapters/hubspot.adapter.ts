import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  firstString,
  headerValue,
  safeEqual,
  type CrmAdapter,
  type NormalizedLead,
  type SignatureContext,
} from './crm-adapter';

const MAX_SKEW_MS = 5 * 60 * 1000;

interface HubSpotProps {
  email?: { value?: string } | string;
  firstname?: { value?: string } | string;
  lastname?: { value?: string } | string;
  phone?: { value?: string } | string;
}

/** HubSpot stores properties as `{ value }` objects or flat strings. */
function prop(p: HubSpotProps | undefined, key: keyof HubSpotProps): string | undefined {
  const v = p?.[key];
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return firstString(v.value);
  return undefined;
}

/**
 * Adapter for HubSpot Sales Hub. Verifies the v3 request signature
 * (HMAC-SHA256 over method + URL + body + timestamp, base64), and normalizes a
 * contact webhook/workflow payload.
 */
@Injectable()
export class HubSpotAdapter implements CrmAdapter {
  readonly source = 'hubspot';

  verifySignature(ctx: SignatureContext): boolean {
    const signature = headerValue(ctx.headers, 'x-hubspot-signature-v3');
    const timestamp = headerValue(ctx.headers, 'x-hubspot-request-timestamp');
    if (!signature || !timestamp || !ctx.url || !ctx.method) return false;

    if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return false;

    const base = `${ctx.method}${ctx.url}${ctx.rawBody}${timestamp}`;
    const expected = createHmac('sha256', ctx.secret).update(base).digest('base64');
    return safeEqual(expected, signature);
  }

  normalize(payload: unknown): NormalizedLead[] {
    // HubSpot app webhooks deliver an array of events; workflow webhooks deliver
    // a single object. Handle both.
    const record = Array.isArray(payload) ? payload[0] : payload;
    if (!record || typeof record !== 'object') return [];

    const obj = record as {
      objectId?: string | number;
      vid?: string | number;
      properties?: HubSpotProps;
      [k: string]: unknown;
    };
    const externalId = firstString(String(obj.objectId ?? ''), String(obj.vid ?? ''));
    if (!externalId) return [];

    const props = obj.properties;
    const name =
      firstString(
        [prop(props, 'firstname'), prop(props, 'lastname')].filter(Boolean).join(' '),
        prop(props, 'email'),
      ) ?? 'HubSpot contact';

    return [
      {
        externalId,
        name,
        email: prop(props, 'email')?.toLowerCase(),
        phone: prop(props, 'phone'),
        crmRecordUrl: `https://app.hubspot.com/contacts/contact/${externalId}`,
        raw: record as Record<string, unknown>,
      },
    ];
  }
}
