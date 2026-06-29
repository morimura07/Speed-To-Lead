import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class AnalyticsFilterDto {
  /** Inclusive start of the window (ISO date). Defaults to 30 days ago. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Inclusive end of the window (ISO date). Defaults to now. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  /** Restrict to a single lead source (e.g. "close"). */
  @IsOptional()
  @IsString()
  source?: string;
}

export class LeadsQueryDto extends AnalyticsFilterDto {
  @IsOptional()
  @IsIn(['accepted', 'dead_end', 'in_progress'])
  outcome?: 'accepted' | 'dead_end' | 'in_progress';

  @IsOptional()
  @IsString()
  take?: string;

  @IsOptional()
  @IsString()
  skip?: string;
}
