const messagesCreate = jest.fn().mockResolvedValue({ sid: 'SM1' });

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({ messages: { create: messagesCreate } })),
}));

import { TwilioProvider } from './twilio.provider';
import type { AppConfigService } from '../config/config.module';

/** Minimal config stub: a base Twilio setup with per-test overrides. */
function makeConfig(overrides: Record<string, string | undefined> = {}): AppConfigService {
  const map: Record<string, string | undefined> = {
    TWILIO_ACCOUNT_SID: 'AC1',
    TWILIO_AUTH_TOKEN: 'tok',
    TWILIO_FROM_NUMBER: '+15550000000',
    ...overrides,
  };
  return { get: (key: string) => map[key] } as unknown as AppConfigService;
}

describe('TwilioProvider.sendSms', () => {
  beforeEach(() => messagesCreate.mockClear());

  it('sends through the Messaging Service when TWILIO_MESSAGING_SERVICE_SID is set', async () => {
    const provider = new TwilioProvider(makeConfig({ TWILIO_MESSAGING_SERVICE_SID: 'MG123' }));
    await provider.sendSms('+15551234567', 'LeadArrow: you accepted Jordan.');
    expect(messagesCreate).toHaveBeenCalledWith({
      to: '+15551234567',
      body: 'LeadArrow: you accepted Jordan.',
      messagingServiceSid: 'MG123',
    });
  });

  it('falls back to the from-number when no Messaging Service is configured', async () => {
    const provider = new TwilioProvider(makeConfig());
    await provider.sendSms('+15551234567', 'LeadArrow: you accepted Jordan.');
    expect(messagesCreate).toHaveBeenCalledWith({
      to: '+15551234567',
      body: 'LeadArrow: you accepted Jordan.',
      from: '+15550000000',
    });
  });
});
