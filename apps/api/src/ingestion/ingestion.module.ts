import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { IngestionController } from './ingestion.controller';
import { AdapterRegistry } from './adapters/adapter.registry';
import { CloseCrmAdapter } from './adapters/close.adapter';

/**
 * Inbound webhook pipeline: verify → normalize (via a CRM adapter) → hand to
 * LeadsService. Register additional CRM adapters here as they're implemented.
 */
@Module({
  imports: [LeadsModule, IntegrationsModule],
  controllers: [IngestionController],
  providers: [CloseCrmAdapter, AdapterRegistry],
})
export class IngestionModule {}
