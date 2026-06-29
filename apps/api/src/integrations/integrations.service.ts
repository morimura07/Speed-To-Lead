import { Injectable, NotFoundException } from '@nestjs/common';
import type { IntegrationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { generateOpaqueToken } from '../common/crypto/token.util';

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
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i) => this.toView(i));
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
