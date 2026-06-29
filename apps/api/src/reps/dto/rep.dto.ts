import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone!: string;

  /** Weight (0–100) used by percentage routing. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  routingPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateRepDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  routingPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class SetAvailabilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  calendarEmail?: string;

  /** Weekly schedule keyed by weekday 0–6 → [{ start, end }]. Validated server-side. */
  @IsOptional()
  availability?: unknown;

  /** List of "YYYY-MM-DD" days off. Validated server-side. */
  @IsOptional()
  daysOff?: unknown;
}
