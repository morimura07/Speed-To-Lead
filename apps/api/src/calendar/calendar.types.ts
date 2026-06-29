/** DI token for the calendar busy-check abstraction. */
export const CALENDAR_CHECKER = Symbol('CALENDAR_CHECKER');

export interface BusyQuery {
  repId: string;
  calendarEmail: string | null;
  at: Date;
}

/**
 * Abstraction over a rep's calendar free/busy state, consulted by routing
 * eligibility when the org enables calendar busy-checking. A Google Calendar
 * implementation slots in here once OAuth credentials are configured; until
 * then the no-op checker treats everyone as free.
 */
export interface CalendarChecker {
  isBusy(query: BusyQuery): Promise<boolean>;
  isConfigured(): boolean;
}
