import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RepsService } from './reps.service';
import { CreateRepDto, SetAvailabilityDto, UpdateRepDto } from './dto/rep.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('reps')
@UseGuards(JwtAuthGuard)
export class RepsController {
  constructor(private readonly reps: RepsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRepDto) {
    return this.reps.create(user.orgId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.reps.list(user.orgId);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRepDto) {
    return this.reps.update(user.orgId, id, dto);
  }

  @Patch(':id/availability')
  setAvailability(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.reps.setAvailability(user.orgId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.reps.remove(user.orgId, id);
    return { ok: true };
  }
}
