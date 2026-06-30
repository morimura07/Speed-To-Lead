import { Injectable, NotFoundException } from '@nestjs/common';
import type { CrmAdapter } from './crm-adapter';
import { CloseCrmAdapter } from './close.adapter';
import { HubSpotAdapter } from './hubspot.adapter';
import { GoHighLevelAdapter } from './gohighlevel.adapter';
import { SalesforceAdapter } from './salesforce.adapter';

/**
 * Resolves a CRM adapter by provider key. Register a new CRM by implementing
 * CrmAdapter and adding it here — the ingestion pipeline is otherwise untouched.
 */
@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<string, CrmAdapter>();

  constructor(
    close: CloseCrmAdapter,
    hubspot: HubSpotAdapter,
    gohighlevel: GoHighLevelAdapter,
    salesforce: SalesforceAdapter,
  ) {
    for (const adapter of [close, hubspot, gohighlevel, salesforce]) this.register(adapter);
  }

  private register(adapter: CrmAdapter): void {
    this.adapters.set(adapter.source, adapter);
  }

  get(source: string): CrmAdapter {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new NotFoundException(`No ingestion adapter for source "${source}"`);
    }
    return adapter;
  }

  has(source: string): boolean {
    return this.adapters.has(source);
  }
}
