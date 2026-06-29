/** DI token for the telephony provider abstraction. */
export const TELEPHONY_PROVIDER = Symbol('TELEPHONY_PROVIDER');

export interface RingRepInput {
  /** Rep's phone number in E.164. */
  to: string;
  /** TwiML URL Twilio fetches when the rep answers. */
  answerUrl: string;
  /** URL Twilio posts call-status callbacks to. */
  statusCallbackUrl: string;
  /** Ring duration before treating as no-answer. */
  timeoutSeconds: number;
}

/**
 * Provider-agnostic telephony surface. The routing engine depends only on this
 * interface — Twilio (or a future Telnyx adapter) stays invisible to the rest
 * of the system, exactly as the product requires.
 */
export interface TelephonyProvider {
  /** Place an outbound call to a rep. Returns the provider call id. */
  ringRep(input: RingRepInput): Promise<{ callId: string }>;

  /** Send an SMS (e.g. the CRM link to a rep who accepted by phone). */
  sendSms(to: string, body: string): Promise<void>;

  /** Cancel an in-progress call (used when another channel wins, Phase 4). */
  cancelCall(callId: string): Promise<void>;

  /** Whether the provider is configured with credentials. */
  isConfigured(): boolean;
}
