import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Authentication & session management for both company users and the platform
 * admin. Exports the token service and guards so other feature modules (e.g.
 * licensing) can protect their routes without re-declaring them.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtAuthGuard, AdminJwtAuthGuard, RolesGuard],
  exports: [TokenService, JwtAuthGuard, AdminJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
