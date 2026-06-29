/**
 * Event-store contract — the analytics "spine" of LeadArrow.
 *
 * Every meaningful state transition emits exactly one event. All dashboard
 * metrics are aggregations over these events, so the catalog of event types is
 * a first-class, shared contract rather than an implementation detail.
 */

export const EventType = {
  // Lead lifecycle
  LeadReceived: 'lead.received',
  LeadRoutingStarted: 'lead.routing_started',
  LeadAccepted: 'lead.accepted',
  LeadRerouted: 'lead.rerouted',
  LeadTimedOut: 'lead.timed_out',
  LeadDeadEnd: 'lead.dead_end',

  // Alert / call lifecycle
  AlertSent: 'alert.sent',
  AlertAnswered: 'alert.answered',
  AlertDeclined: 'alert.declined',
  AlertFailed: 'alert.failed',

  // Integration / system
  CrmSyncFailed: 'crm.sync_failed',
  RoutingLag: 'routing.lag',

  // Booking & follow-up
  BookingAlertSent: 'booking.alert_sent',
  FollowUpReminderSent: 'followup.reminder_sent',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

/** Canonical shape of a persisted event (mirrors the `events` table). */
export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  orgId: string;
  type: EventType;
  leadId?: string | null;
  repId?: string | null;
  payload: TPayload;
  occurredAt: string; // ISO-8601
}
