import { createHmac } from 'node:crypto';
import { SlackService } from './slack.service';

const SECRET = 'slack_signing_secret_test';

function makeService(secret?: string) {
  const config = { get: jest.fn((k: string) => (k === 'SLACK_SIGNING_SECRET' ? secret : undefined)) };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return new SlackService({} as any, config as any, {} as any, {} as any);
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function sign(rawBody: string, ts: string, secret = SECRET): string {
  return `v0=${createHmac('sha256', secret).update(`v0:${ts}:${rawBody}`).digest('hex')}`;
}

describe('SlackService.verifySignature', () => {
  const ts = () => Math.floor(Date.now() / 1000).toString();

  it('skips verification when no signing secret is configured (dev)', () => {
    expect(makeService(undefined).verifySignature('{}')).toBe(true);
  });

  it('accepts a correctly-signed, fresh request', () => {
    const svc = makeService(SECRET);
    const body = '{"type":"event_callback"}';
    const t = ts();
    expect(svc.verifySignature(body, sign(body, t), t)).toBe(true);
  });

  it('rejects a tampered body and a stale timestamp', () => {
    const svc = makeService(SECRET);
    const t = ts();
    expect(svc.verifySignature('{"evil":true}', sign('{"good":true}', t), t)).toBe(false);
    const old = (Math.floor(Date.now() / 1000) - 3600).toString();
    expect(svc.verifySignature('{}', sign('{}', old), old)).toBe(false);
  });
});

describe('SlackService.handleEvent', () => {
  it('echoes the url_verification challenge', async () => {
    const res = await makeService().handleEvent({ type: 'url_verification', challenge: 'abc123' });
    expect(res.challenge).toBe('abc123');
  });

  it('ignores non-message payloads', async () => {
    const res = await makeService().handleEvent({ type: 'event_callback', event: { type: 'reaction_added' } });
    expect(res).toEqual({ ok: true });
  });
});
