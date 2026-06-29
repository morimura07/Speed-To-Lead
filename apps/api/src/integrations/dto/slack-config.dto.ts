import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BookingMode } from '@leadarrow/shared';

class SlackChannelDto {
  @IsString()
  @MaxLength(40)
  id!: string;

  @IsIn(['leads', 'bookings'])
  purpose!: 'leads' | 'bookings';
}

export class ConfigureSlackDto {
  @IsString()
  @MaxLength(40)
  teamId!: string;

  @IsIn([BookingMode.Triage, BookingMode.Closer])
  bookingMode!: BookingMode;

  @IsOptional()
  @IsString()
  setterRepId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlackChannelDto)
  channels!: SlackChannelDto[];
}
