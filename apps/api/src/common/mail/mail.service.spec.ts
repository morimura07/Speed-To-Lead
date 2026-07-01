import { MailService } from './mail.service';

function makeService(env: Record<string, unknown>) {
  const config = { get: jest.fn((k: string) => env[k]) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new MailService(config as any);
}

describe('MailService', () => {
  it('is unconfigured (logs, does not send) without SMTP_HOST', async () => {
    const svc = makeService({ SMTP_PORT: 587 });
    expect(svc.isConfigured()).toBe(false);
    // Should resolve without attempting a real send.
    await expect(svc.send({ to: 'a@b.com', subject: 'Hi', body: 'x' })).resolves.toBeUndefined();
  });

  it('is configured when SMTP_HOST is set', () => {
    const svc = makeService({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587 });
    expect(svc.isConfigured()).toBe(true);
  });
});
