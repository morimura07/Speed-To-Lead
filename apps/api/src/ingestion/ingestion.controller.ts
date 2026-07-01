import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { IntegrationsService } from '../integrations/integrations.service';
import { LeadsService } from '../leads/leads.service';
import { AppConfigService } from '../config/config.module';
import { AdapterRegistry } from './adapters/adapter.registry';

/**
 * Public inbound webhook for CRM lead notifications.
 *
 *   POST /v1/ingest/:source/:token
 *
 * Authenticated by the integration's signing secret (HMAC over the raw body),
 * not a bearer token — `:token` only identifies which integration/org the
 * delivery belongs to.
 */
@SkipThrottle()
@Controller('ingest')
export class IngestionController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly leads: LeadsService,
    private readonly registry: AdapterRegistry,
    private readonly config: AppConfigService,
  ) {}

  @Post(':source/:token')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('source') source: string,
    @Param('token') token: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: unknown,
  ) {
    const integration = await this.integrations.findActiveByToken(token);
    // A missing/mismatched token is indistinguishable from "not found" — don't
    // leak which tokens exist.
    if (!integration || integration.type !== source) {
      throw new NotFoundException('Unknown webhook endpoint');
    }

    const adapter = this.registry.get(source);
    const rawBody = req.rawBody?.toString('utf8');
    if (!rawBody) {
      throw new UnauthorizedException('Missing request body');
    }

    const valid = adapter.verifySignature({
      rawBody,
      headers: req.headers,
      secret: integration.signingSecret,
      url: `${this.config.get('API_PUBLIC_URL')}/v1/ingest/${source}/${token}`,
      method: 'POST',
    });
    if (!valid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const normalized = adapter.normalize(payload);
    let created = 0;
    for (const lead of normalized) {
      const result = await this.leads.ingest(
        { orgId: integration.orgId, integrationId: integration.id, source },
        lead,
      );
      if (result.created) created += 1;
    }

    return { received: normalized.length, created };
  }
}
