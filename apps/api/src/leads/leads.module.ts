import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

/**
 * Lead persistence + listing. LeadsService is exported so the ingestion
 * pipeline can hand it normalized leads. Imports AuthModule for the JWT guard
 * used by the listing endpoint.
 */
@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
