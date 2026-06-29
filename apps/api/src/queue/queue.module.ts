import { Global, Module } from '@nestjs/common';
import { BullLeadDispatcher } from './bull-lead-dispatcher';
import { LEAD_DISPATCHER } from './queue.constants';

/**
 * Provides the lead dispatcher (queue producer) behind the LEAD_DISPATCHER
 * token, so consumers depend on the abstraction and tests can swap in a fake.
 */
@Global()
@Module({
  providers: [{ provide: LEAD_DISPATCHER, useClass: BullLeadDispatcher }],
  exports: [LEAD_DISPATCHER],
})
export class QueueModule {}
