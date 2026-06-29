import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LicenseKeyStatus } from '@leadarrow/shared';

export class ListKeysDto {
  @IsOptional()
  @IsEnum(LicenseKeyStatus)
  status?: LicenseKeyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}
