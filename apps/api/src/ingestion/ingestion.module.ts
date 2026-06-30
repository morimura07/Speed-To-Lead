import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { IngestionController } from './ingestion.controller';
import { AdapterRegistry } from './adapters/adapter.registry';
import { CloseCrmAdapter } from './adapters/close.adapter';
import { HubSpotAdapter } from './adapters/hubspot.adapter';
import { GoHighLevelAdapter } from './adapters/gohighlevel.adapter';
import { SalesforceAdapter } from './adapters/salesforce.adapter';

/**
 * Inbound webhook pipeline: verify → normalize (via a CRM adapter) → hand to
 * LeadsService. All four CRM adapters are registered here.
 */
@Module({
  imports: [LeadsModule, IntegrationsModule],
  controllers: [IngestionController],
  providers: [
    CloseCrmAdapter,
    HubSpotAdapter,
    GoHighLevelAdapter,
    SalesforceAdapter,
    AdapterRegistry,
  ],
})
export class IngestionModule {}
