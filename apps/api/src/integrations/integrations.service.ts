import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type IntegrationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { generateOpaqueToken } from '../common/crypto/token.util';
import type { ConfigureSlackDto } from './dto/slack-config.dto';

const CRM_TYPES: IntegrationType[] = ['close', 'gohighlevel', 'salesforce', 'hubspot'];

interface IntegrationView {
  id: string;
  type: string;
  status: string;
  webhookUrl: string;
  signingSecret: string;
  createdAt: string;
}

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private webhookUrl(type: string, token: string): string {
    return `${this.config.get('API_PUBLIC_URL')}/v1/ingest/${type}/${token}`;
  }

  private toView(i: {
    id: string;
    type: string;
    status: string;
    webhookToken: string;
    signingSecret: string;
    createdAt: Date;
  }): IntegrationView {
    return {
      id: i.id,
      type: i.type,
      status: i.status,
      webhookUrl: this.webhookUrl(i.type, i.webhookToken),
      signingSecret: i.signingSecret,
      createdAt: i.createdAt.toISOString(),
    };
  }

  /** Connect a CRM: provisions a unique inbound webhook + signing secret. */
  async createCrm(orgId: string, type: IntegrationType): Promise<IntegrationView> {
    const integration = await this.prisma.integration.create({
      data: {
        orgId,
        type,
        webhookToken: generateOpaqueToken(24),
        signingSecret: generateOpaqueToken(32),
      },
    });
    return this.toView(integration);
  }

  async listForOrg(orgId: string): Promise<IntegrationView[]> {
    const items = await this.prisma.integration.findMany({
      where: { orgId, type: { in: CRM_TYPES } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i) => this.toView(i));
  }

  // ── Slack ─────────────────────────────────────────────────────────────────

  private get slackEventsUrl(): string {
    return `${this.config.get('API_PUBLIC_URL')}/v1/slack/events`;
  }

  /** Create or update the org's Slack integration (one per org). */
  async configureSlack(orgId: string, dto: ConfigureSlackDto) {
    const config = {
      teamId: dto.teamId,
      bookingMode: dto.bookingMode,
      setterRepId: dto.setterRepId ?? null,
      channels: dto.channels,
    };
    const existing = await this.prisma.integration.findFirst({
      where: { orgId, type: 'slack' },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.integration.update({
        where: { id: existing.id },
        data: { config: config as unknown as Prisma.InputJsonValue, status: 'active' },
      });
    } else {
      await this.prisma.integration.create({
        data: {
          orgId,
          type: 'slack',
          webhookToken: generateOpaqueToken(24),
          signingSecret: generateOpaqueToken(16),
          config: config as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return { configured: true, eventsUrl: this.slackEventsUrl, ...config };
  }

  async getSlack(orgId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { orgId, type: 'slack' },
    });
    if (!integration) {
      return {
        configured: false,
        eventsUrl: this.slackEventsUrl,
        teamId: '',
        bookingMode: 'closer',
        setterRepId: null,
        channels: [],
      };
    }
    return {
      configured: true,
      eventsUrl: this.slackEventsUrl,
      ...(integration.config as object),
    };
  }

  async remove(orgId: string, id: string): Promise<void> {
    const result = await this.prisma.integration.deleteMany({ where: { id, orgId } });
    if (result.count === 0) {
      throw new NotFoundException('Integration not found');
    }
  }

  /** Resolve an active integration from its public webhook token (for ingestion). */
  async findActiveByToken(token: string) {
    return this.prisma.integration.findFirst({
      where: { webhookToken: token, status: 'active' },
    });
  }
}
