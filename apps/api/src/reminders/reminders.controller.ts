import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/reminder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReminderDto) {
    return this.reminders.schedule(user.orgId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.reminders.list(user.orgId);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reminders.cancel(user.orgId, id);
  }
}
