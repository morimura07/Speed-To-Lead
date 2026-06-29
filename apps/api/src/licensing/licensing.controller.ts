import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LicensingService } from './licensing.service';
import { CreateKeyDto } from './dto/create-key.dto';
import { ListKeysDto } from './dto/list-keys.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';

/**
 * Backend admin surface for the platform operator. Every route requires a valid
 * admin access token.
 */
@Controller('admin')
@UseGuards(AdminJwtAuthGuard)
export class LicensingController {
  constructor(private readonly licensing: LicensingService) {}

  @Post('license-keys')
  createKeys(@Body() dto: CreateKeyDto) {
    return this.licensing.createKeys(dto);
  }

  @Get('license-keys')
  listKeys(@Query() dto: ListKeysDto) {
    return this.licensing.listKeys(dto);
  }

  @Post('license-keys/:id/disable')
  @HttpCode(HttpStatus.OK)
  disableKey(@Param('id') id: string) {
    return this.licensing.disableKey(id);
  }

  @Post('license-keys/:id/enable')
  @HttpCode(HttpStatus.OK)
  enableKey(@Param('id') id: string) {
    return this.licensing.enableKey(id);
  }

  @Get('stats')
  stats() {
    return this.licensing.getStats();
  }

  @Get('signups')
  signups() {
    return this.licensing.listSignups();
  }
}
