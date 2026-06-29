import { Global, Module } from '@nestjs/common';
import { RoutingModule } from '../routing/routing.module';
import { RealtimeServer } from './realtime.server';
import { RealtimeGateway } from './realtime.gateway';
import { REALTIME_NOTIFIER } from './realtime.types';

/**
 * Realtime softphone signaling. Global so the routing engine can inject the
 * REALTIME_NOTIFIER (bound to RealtimeServer) without an import cycle; imports
 * RoutingModule so the gateway can drive accept/decline. The notifier and the
 * gateway are distinct providers, which keeps the dependency graph acyclic.
 */
@Global()
@Module({
  imports: [RoutingModule],
  providers: [
    RealtimeServer,
    RealtimeGateway,
    { provide: REALTIME_NOTIFIER, useExisting: RealtimeServer },
  ],
  exports: [REALTIME_NOTIFIER],
})
export class RealtimeModule {}
