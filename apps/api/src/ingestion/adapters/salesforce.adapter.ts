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
 * Adapter for Salesforce Sales Cloud. Expects a JSON Lead payload from an Apex
 * HTTP callout / Flow webhook. Verifies an HMAC-SHA256 (hex) over the body via
 * the `x-sfdc-signature` header when present; otherwise the secret webhook URL
 * token authenticates the request.
 */
@Injectable()
export class SalesforceAdapter implements CrmAdapter {
  readonly source = 'salesforce';

  verifySignature(ctx: SignatureContext): boolean {
    const signature = headerValue(ctx.headers, 'x-sfdc-signature');
    if (!signature) return true; // authenticated by the secret URL token
    const expected = createHmac('sha256', ctx.secret).update(ctx.rawBody).digest('hex');
    return safeEqual(expected, signature);
  }

  normalize(payload: unknown): NormalizedLead[] {
    if (!payload || typeof payload !== 'object') return [];
    const l = payload as {
      Id?: string;
      id?: string;
      FirstName?: string;
      LastName?: string;
      Name?: string;
      Company?: string;
      Email?: string;
      Phone?: string;
      instanceUrl?: string;
    };

    const externalId = firstString(l.Id, l.id);
    if (!externalId) return [];

    const name =
      firstString(
        [l.FirstName, l.LastName].filter(Boolean).join(' '),
        l.Name,
        l.Company,
        l.Email,
      ) ?? 'Salesforce lead';

    return [
      {
        externalId,
        name,
        email: l.Email?.toLowerCase(),
        phone: l.Phone,
        crmRecordUrl: l.instanceUrl ? `${l.instanceUrl}/${externalId}` : undefined,
        raw: l as Record<string, unknown>,
      },
    ];
  }
}
