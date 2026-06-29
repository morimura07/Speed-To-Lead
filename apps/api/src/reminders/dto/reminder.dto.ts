import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  repId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  note!: string;

  /** When to call the rep (ISO-8601). */
  @IsISO8601()
  dueAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  crmTaskId?: string;
}
