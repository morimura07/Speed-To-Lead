import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { LicenseKeyType } from '@leadarrow/shared';

export class CreateKeyDto {
  @IsEnum(LicenseKeyType)
  type!: LicenseKeyType;

  /** Trial length in days — required for `timed` keys, ignored for `unlimited`. */
  @ValidateIf((o: CreateKeyDto) => o.type === LicenseKeyType.Timed)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  trialDays?: number;

  /** How many keys to generate in one batch (default 1). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
