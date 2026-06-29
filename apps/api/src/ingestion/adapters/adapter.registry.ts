import { Injectable, NotFoundException } from '@nestjs/common';
import type { CrmAdapter } from './crm-adapter';
import { CloseCrmAdapter } from './close.adapter';

/**
 * Resolves a CRM adapter by provider key. New CRMs (GoHighLevel, Salesforce,
 * HubSpot) are added by implementing CrmAdapter and registering them here —
 * the ingestion pipeline is otherwise untouched.
 */
@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<string, CrmAdapter>();

  constructor(close: CloseCrmAdapter) {
    this.register(close);
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
