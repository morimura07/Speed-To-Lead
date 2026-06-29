import { Injectable } from '@nestjs/common';
import type { CalendarChecker } from './calendar.types';

/**
 * Default calendar checker: treats every rep as free. Active until a real
 * provider (Google Calendar) is configured, so enabling the busy-check toggle
 * is harmless until then.
 */
@Injectable()
export class NoopCalendarChecker implements CalendarChecker {
  isBusy(): Promise<boolean> {
    return Promise.resolve(false);
  }

  isConfigured(): boolean {
    return false;
  }
}
