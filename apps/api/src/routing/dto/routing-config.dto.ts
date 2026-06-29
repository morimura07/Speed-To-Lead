import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RoutingMethod } from '@leadarrow/shared';

const METHODS = [RoutingMethod.RoundRobin, RoutingMethod.Percentage];

export class UpdateRoutingConfigDto {
  @IsOptional()
  @IsIn(METHODS, { message: `routingMethod must be one of: ${METHODS.join(', ')}` })
  routingMethod?: RoutingMethod;

  /** Org default IANA timezone (used when a rep has no timezone of their own). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  /** Skip reps who are calendar-busy when routing (requires a calendar provider). */
  @IsOptional()
  @IsBoolean()
  calendarBusyCheck?: boolean;
}
