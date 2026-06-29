import { Global, Module } from '@nestjs/common';
import { NoopCalendarChecker } from './noop-calendar.checker';
import { CALENDAR_CHECKER } from './calendar.types';

/**
 * Provides the calendar busy-check behind the CALENDAR_CHECKER token. Swap the
 * binding to a GoogleCalendarChecker once OAuth credentials are configured.
 */
@Global()
@Module({
  providers: [{ provide: CALENDAR_CHECKER, useClass: NoopCalendarChecker }],
  exports: [CALENDAR_CHECKER],
})
export class CalendarModule {}
