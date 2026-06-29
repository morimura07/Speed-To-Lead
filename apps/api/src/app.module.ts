import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { LoggingModule } from './common/logging/logging.module';
import { MailModule } from './common/mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { QueueModule } from './queue/queue.module';
import { TelephonyModule } from './telephony/telephony.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { LicensingModule } from './licensing/licensing.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LeadsModule } from './leads/leads.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RepsModule } from './reps/reps.module';
import { RoutingModule } from './routing/routing.module';
import { AnalyticsModule } from './analytics/analytics.module';

/**
 * Root module. Feature modules are registered here as each phase lands.
 *
 * Phase 0: configuration, logging, database, health.
 * Phase 1: mail, authentication, licensing.
 * Phase 2: events spine, routing queue, integrations, leads, CRM ingestion.
 * Phase 3: telephony, reps, routing engine + worker.
 * Phase 6: analytics.
 */
@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    MailModule,
    PrismaModule,
    EventsModule,
    QueueModule,
    TelephonyModule,
    CalendarModule,
    HealthModule,
    AuthModule,
    LicensingModule,
    IntegrationsModule,
    LeadsModule,
    IngestionModule,
    RepsModule,
    RoutingModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
