/** DI token for the realtime notifier (server → rep browser). */
export const REALTIME_NOTIFIER = Symbol('REALTIME_NOTIFIER');

/** Payload pushed to a rep's browser when a lead rings their extension. */
export interface IncomingLeadPayload {
  attemptId: string;
  leadId: string;
  name: string;
  source: string;
  crmUrl: string | null;
}

/**
 * Outbound realtime surface used by the routing engine. Kept as an interface so
 * RoutingService stays decoupled from the WebSocket layer (and testable).
 */
export interface RealtimeNotifier {
  /** Whether a rep has at least one connected (paired) browser. */
  isOnline(repId: string): boolean;
  /** Ring a rep's browser softphone for an incoming lead. */
  ringRep(repId: string, payload: IncomingLeadPayload): void;
  /** Tell a rep's browser that an attempt is resolved (stop ringing). */
  resolve(repId: string, attemptId: string): void;
  /** Tell a rep's browser to open the CRM record (extension accept). */
  openCrm(repId: string, url: string): void;
}
