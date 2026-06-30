import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { IntegrationType } from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { ConfigureSlackDto } from './dto/slack-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../billing/subscription.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('integrations')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIntegrationDto) {
    return this.integrations.createCrm(user.orgId, dto.type as IntegrationType);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.integrations.listForOrg(user.orgId);
  }

  @Get('slack')
  getSlack(@CurrentUser() user: AuthUser) {
    return this.integrations.getSlack(user.orgId);
  }

  @Post('slack')
  configureSlack(@CurrentUser() user: AuthUser, @Body() dto: ConfigureSlackDto) {
    return this.integrations.configureSlack(user.orgId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.integrations.remove(user.orgId, id);
    return { ok: true };
  }
}
