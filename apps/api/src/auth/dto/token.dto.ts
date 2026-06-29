import { IsNotEmpty, IsString } from 'class-validator';

/** Used for both refresh and logout — carries the opaque refresh token. */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
