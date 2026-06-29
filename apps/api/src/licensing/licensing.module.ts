import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';

/**
 * Platform-admin licensing surface. Imports AuthModule for the admin guard /
 * token service. Note: license *redemption* lives in AuthService (it's atomic
 * with org creation), so there's no dependency back from auth to here.
 */
@Module({
  imports: [AuthModule],
  controllers: [LicensingController],
  providers: [LicensingService],
})
export class LicensingModule {}
