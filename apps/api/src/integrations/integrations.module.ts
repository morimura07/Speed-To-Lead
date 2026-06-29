import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';

/**
 * CRM/Slack connection management. Exports IntegrationsService so the ingestion
 * pipeline can resolve an integration from its webhook token.
 */
@Module({
  imports: [AuthModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
