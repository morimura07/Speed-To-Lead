/** Shared queue + job identifiers. The routing worker (Phase 3) consumes these. */
export const LEAD_ROUTING_QUEUE = 'lead-routing';
export const ROUTE_LEAD_JOB = 'route-lead';

export interface RouteLeadJobData {
  leadId: string;
  orgId: string;
}

/** DI token for the lead dispatcher abstraction. */
export const LEAD_DISPATCHER = Symbol('LEAD_DISPATCHER');

export interface LeadDispatcher {
  /** Enqueue a freshly-ingested lead for routing. */
  dispatch(data: RouteLeadJobData): Promise<void>;
}
