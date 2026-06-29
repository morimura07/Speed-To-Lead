import { createHmac } from 'node:crypto';
import { CloseCrmAdapter } from './close.adapter';

const SECRET = 'whsec_test_close_signing_key';

function sign(rawBody: string, timestamp: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('hex');
}

describe('CloseCrmAdapter', () => {
  const adapter = new CloseCrmAdapter();
  const now = () => Math.floor(Date.now() / 1000).toString();

  describe('verifySignature', () => {
    it('accepts a correctly-signed, fresh delivery', () => {
      const rawBody = '{"event":{"object_type":"lead","data":{"id":"lead_1"}}}';
      const ts = now();
      const ok = adapter.verifySignature({
        rawBody,
        secret: SECRET,
        headers: { 'close-sig-hash': sign(rawBody, ts), 'close-sig-timestamp': ts },
      });
      expect(ok).toBe(true);
    });

    it('rejects a tampered body', () => {
      const ts = now();
      const ok = adapter.verifySignature({
        rawBody: '{"event":{"data":{"id":"tampered"}}}',
        secret: SECRET,
        headers: { 'close-sig-hash': sign('{"original":true}', ts), 'close-sig-timestamp': ts },
      });
      expect(ok).toBe(false);
    });

    it('rejects the wrong secret', () => {
      const rawBody = '{"a":1}';
      const ts = now();
      const ok = adapter.verifySignature({
        rawBody,
        secret: SECRET,
        headers: { 'close-sig-hash': sign(rawBody, ts, 'wrong'), 'close-sig-timestamp': ts },
      });
      expect(ok).toBe(false);
    });

    it('rejects a stale timestamp (replay)', () => {
      const rawBody = '{"a":1}';
      const ts = (Math.floor(Date.now() / 1000) - 3600).toString();
      const ok = adapter.verifySignature({
        rawBody,
        secret: SECRET,
        headers: { 'close-sig-hash': sign(rawBody, ts), 'close-sig-timestamp': ts },
      });
      expect(ok).toBe(false);
    });

    it('rejects when signature headers are missing', () => {
      expect(adapter.verifySignature({ rawBody: '{}', secret: SECRET, headers: {} })).toBe(false);
    });
  });

  describe('normalize', () => {
    it('maps a lead with a contact to the normalized shape', () => {
      const [lead] = adapter.normalize({
        event: {
          object_type: 'lead',
          data: {
            id: 'lead_abc',
            display_name: 'Acme Corp',
            contacts: [
              {
                name: 'Jane Doe',
                emails: [{ email: 'jane@acme.com' }],
                phones: [{ phone: '+15550001111' }],
              },
            ],
          },
        },
      });

      expect(lead).toMatchObject({
        externalId: 'lead_abc',
        name: 'Acme Corp',
        email: 'jane@acme.com',
        phone: '+15550001111',
        crmRecordUrl: 'https://app.close.com/lead/lead_abc/',
      });
    });

    it('falls back to a contact name when no display name exists', () => {
      const [lead] = adapter.normalize({
        event: { object_type: 'lead', data: { id: 'l2', contacts: [{ name: 'Bob' }] } },
      });
      expect(lead.name).toBe('Bob');
      expect(lead.email).toBeUndefined();
    });

    it('ignores non-lead events and payloads without an id', () => {
      expect(adapter.normalize({ event: { object_type: 'opportunity', data: { id: 'x' } } })).toEqual([]);
      expect(adapter.normalize({ event: { object_type: 'lead', data: {} } })).toEqual([]);
      expect(adapter.normalize(null)).toEqual([]);
    });
  });
});
