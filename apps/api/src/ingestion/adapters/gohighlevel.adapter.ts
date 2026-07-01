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

/**
 * Adapter for GoHighLevel. GHL workflow webhooks POST the contact JSON directly.
 * GHL signing is configurable; we verify an HMAC-SHA256 (hex) over the body via
 * the `x-wh-signature` header when present, otherwise the secret webhook URL
 * token (validated upstream) authenticates the request.
 */
@Injectable()
export class GoHighLevelAdapter implements CrmAdapter {
  readonly source = 'gohighlevel';

  verifySignature(ctx: SignatureContext): boolean {
    const signature = headerValue(ctx.headers, 'x-wh-signature');
    if (!signature) return true; // authenticated by the secret URL token
    const expected = createHmac('sha256', ctx.secret).update(ctx.rawBody).digest('hex');
    return safeEqual(expected, signature);
  }

  normalize(payload: unknown): NormalizedLead[] {
    if (!payload || typeof payload !== 'object') return [];
    const c = payload as {
      id?: string;
      contact_id?: string;
      full_name?: string;
      first_name?: string;
      last_name?: string;
      name?: string;
      email?: string;
      phone?: string;
      locationId?: string;
    };

    const externalId = firstString(c.id, c.contact_id);
    if (!externalId) return [];

    const name =
      firstString(
        c.full_name,
        c.name,
        [c.first_name, c.last_name].filter(Boolean).join(' '),
        c.email,
      ) ?? 'GoHighLevel contact';

    return [
      {
        externalId,
        name,
        email: c.email?.toLowerCase(),
        phone: c.phone,
        crmRecordUrl: c.locationId
          ? `https://app.gohighlevel.com/location/${c.locationId}/contacts/detail/${externalId}`
          : undefined,
        raw: c as Record<string, unknown>,
      },
    ];
  }
}
