import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RepsService } from './reps.service';
import { RepsController } from './reps.controller';

/**
 * Rep management. Exports RepsService so the routing engine can resolve
 * eligible reps for a lead.
 */
@Module({
  imports: [AuthModule],
  controllers: [RepsController],
  providers: [RepsService],
  exports: [RepsService],
})
export class RepsModule {}
