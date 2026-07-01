import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AppConfigService } from '../config/config.module';
import { parseDurationMs } from '../common/time/duration.util';
import {
  ADMIN_REFRESH_COOKIE,
  USER_REFRESH_COOKIE,
  clearRefreshCookie,
  setRefreshCookie,
} from './cookies';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import type { AuthAdmin, AuthTokens, AuthUser } from './auth.types';

/**
 * Auth endpoints. The refresh token is delivered only as an httpOnly cookie
 * (never in the response body or JS-readable storage); the short-lived access
 * token is returned in the body for the client to hold in memory.
 */
@Controller('auth')
@Throttle({ default: { ttl: 60_000, limit: 20 } }) // tighter than the global default
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  private get isProd(): boolean {
    return this.config.isProduction;
  }

  private get refreshMaxAge(): number {
    return parseDurationMs(this.config.get('JWT_REFRESH_TTL'));
  }

  /** Set the refresh cookie and strip the refresh token from the body. */
  private issue(res: Response, cookieName: string, tokens: AuthTokens) {
    setRefreshCookie(res, cookieName, tokens.refreshToken, this.refreshMaxAge, this.isProd);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.signup(dto);
    return { user, ...this.issue(res, USER_REFRESH_COOKIE, tokens) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto);
    return { user, ...this.issue(res, USER_REFRESH_COOKIE, tokens) };
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { admin, tokens } = await this.auth.adminLogin(dto);
    return { admin, ...this.issue(res, ADMIN_REFRESH_COOKIE, tokens) };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[USER_REFRESH_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('No session');
    return this.issue(res, USER_REFRESH_COOKIE, await this.auth.refresh(token));
  }

  @Post('admin/refresh')
  @HttpCode(HttpStatus.OK)
  async adminRefresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[ADMIN_REFRESH_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('No session');
    return this.issue(res, ADMIN_REFRESH_COOKIE, await this.auth.refresh(token));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[USER_REFRESH_COOKIE] as string | undefined;
    if (token) await this.auth.logout(token);
    clearRefreshCookie(res, USER_REFRESH_COOKIE, this.isProd);
    return { ok: true };
  }

  @Post('admin/logout')
  @HttpCode(HttpStatus.OK)
  async adminLogout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[ADMIN_REFRESH_COOKIE] as string | undefined;
    if (token) await this.auth.logout(token);
    clearRefreshCookie(res, ADMIN_REFRESH_COOKIE, this.isProd);
    return { ok: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  @Get('admin/me')
  @UseGuards(AdminJwtAuthGuard)
  adminMe(@CurrentAdmin() admin: AuthAdmin) {
    return this.auth.adminMe(admin.adminId);
  }
}
