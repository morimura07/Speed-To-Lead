import { Global, Module } from '@nestjs/common';
import { EventsService } from './events.service';

/**
 * Global access to the event store. Any feature module can inject EventsService
 * to append to the analytics spine without re-importing.
 */
@Global()
@Module({
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
