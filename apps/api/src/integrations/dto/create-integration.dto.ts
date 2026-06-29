import { IsIn } from 'class-validator';
import { CrmType } from '@leadarrow/shared';

/** CRM providers that can be connected as an inbound lead source. */
const CRM_TYPES = [CrmType.Close, CrmType.GoHighLevel, CrmType.Salesforce, CrmType.HubSpot];

export class CreateIntegrationDto {
  @IsIn(CRM_TYPES, { message: `type must be one of: ${CRM_TYPES.join(', ')}` })
  type!: CrmType;
}
