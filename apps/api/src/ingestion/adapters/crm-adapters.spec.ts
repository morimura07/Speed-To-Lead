import { createHmac } from 'node:crypto';
import { HubSpotAdapter } from './hubspot.adapter';
import { GoHighLevelAdapter } from './gohighlevel.adapter';
import { SalesforceAdapter } from './salesforce.adapter';

describe('HubSpotAdapter', () => {
  const adapter = new HubSpotAdapter();

  it('verifies a v3 signature over method+url+body+timestamp', () => {
    const secret = 'hs_client_secret';
    const url = 'https://api.example.com/v1/ingest/hubspot/tok';
    const body = '{"objectId":1,"properties":{"email":{"value":"a@b.com"}}}';
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', secret).update(`POST${url}${body}${timestamp}`).digest('base64');

    expect(adapter.verifySignature({ rawBody: body, secret, url, method: 'POST', headers: { 'x-hubspot-signature-v3': signature, 'x-hubspot-request-timestamp': timestamp } })).toBe(true);
    expect(adapter.verifySignature({ rawBody: '{"tampered":1}', secret, url, method: 'POST', headers: { 'x-hubspot-signature-v3': signature, 'x-hubspot-request-timestamp': timestamp } })).toBe(false);
  });

  it('normalizes a contact (object and array forms)', () => {
    const [lead] = adapter.normalize({
      objectId: 501,
      properties: { firstname: { value: 'Jane' }, lastname: { value: 'Doe' }, email: { value: 'JANE@X.com' }, phone: { value: '+15551112222' } },
    });
    expect(lead).toMatchObject({ externalId: '501', name: 'Jane Doe', email: 'jane@x.com', phone: '+15551112222' });
    expect(lead.crmRecordUrl).toContain('501');

    const [fromArray] = adapter.normalize([{ vid: 9, properties: { email: 'x@y.com' } }]);
    expect(fromArray.externalId).toBe('9');
  });
});

describe('GoHighLevelAdapter', () => {
  const adapter = new GoHighLevelAdapter();

  it('verifies HMAC when present and trusts the URL token when absent', () => {
    const secret = 's';
    const body = '{"id":"c1","email":"a@b.com"}';
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    expect(adapter.verifySignature({ rawBody: body, secret, headers: { 'x-wh-signature': sig } })).toBe(true);
    expect(adapter.verifySignature({ rawBody: body, secret, headers: { 'x-wh-signature': 'bad' } })).toBe(false);
    expect(adapter.verifySignature({ rawBody: body, secret, headers: {} })).toBe(true);
  });

  it('normalizes a contact payload', () => {
    const [lead] = adapter.normalize({ id: 'c1', first_name: 'Sam', last_name: 'Lee', email: 'SAM@x.com', phone: '+1555' });
    expect(lead).toMatchObject({ externalId: 'c1', name: 'Sam Lee', email: 'sam@x.com' });
  });
});

describe('SalesforceAdapter', () => {
  const adapter = new SalesforceAdapter();

  it('normalizes a Lead and falls back to Company for the name', () => {
    const [withName] = adapter.normalize({ Id: '00Q1', FirstName: 'Pat', LastName: 'Kim', Email: 'pat@x.com' });
    expect(withName).toMatchObject({ externalId: '00Q1', name: 'Pat Kim', email: 'pat@x.com' });

    const [companyOnly] = adapter.normalize({ Id: '00Q2', Company: 'Acme Inc' });
    expect(companyOnly.name).toBe('Acme Inc');
  });

  it('ignores payloads without an id', () => {
    expect(adapter.normalize({ Email: 'x@y.com' })).toEqual([]);
    expect(adapter.normalize(null)).toEqual([]);
  });
});
