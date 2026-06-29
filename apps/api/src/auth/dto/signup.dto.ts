import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Company owner sign-up — gated by a valid license key. */
export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  /** Consent to receive SMS/voice notifications. */
  @IsBoolean()
  smsConsent!: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  licenseKey!: string;
}
