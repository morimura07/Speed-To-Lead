import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { APP_NAME } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness/readiness endpoints. Readiness verifies the database is reachable;
 * Redis and downstream-provider indicators are added in later phases as those
 * dependencies come online.
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /** Readiness check — confirms the process can serve traffic (DB reachable). */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database', this.prisma)]);
  }

  /** Lightweight liveness probe with basic process metadata. */
  @Get('live')
  live() {
    return {
      service: APP_NAME,
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
