import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterDto, LeadsQueryDto } from './dto/analytics-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** All dashboard metrics for the selected window/source. */
  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() filters: AnalyticsFilterDto) {
    return this.analytics.summary(user.orgId, filters);
  }

  /** Filtered lead list for drill-down. */
  @Get('leads')
  leads(@CurrentUser() user: AuthUser, @Query() query: LeadsQueryDto) {
    return this.analytics.listLeads(user.orgId, query);
  }

  /** A single lead's full attempt timeline. */
  @Get('leads/:id')
  async leadDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const detail = await this.analytics.leadDetail(user.orgId, id);
    if (!detail) throw new NotFoundException('Lead not found');
    return detail;
  }
}
