import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { LicenseKeyType } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { generateLicenseKey } from '../common/crypto/token.util';
import type { CreateKeyDto } from './dto/create-key.dto';
import type { ListKeysDto } from './dto/list-keys.dto';

@Injectable()
export class LicensingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate one or more keys. Retries on the (astronomically rare) collision. */
  async createKeys(dto: CreateKeyDto) {
    const count = dto.count ?? 1;
    const trialDays = dto.type === LicenseKeyType.Timed ? dto.trialDays : null;
    const created = [];

    for (let i = 0; i < count; i += 1) {
      created.push(
        await this.createOneWithRetry({
          type: dto.type,
          trialDays,
          notes: dto.notes ?? null,
        }),
      );
    }
    return created;
  }

  private async createOneWithRetry(
    data: Omit<Prisma.LicenseKeyCreateInput, 'code'>,
    attempts = 5,
  ) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.prisma.licenseKey.create({
          data: { ...data, code: generateLicenseKey() },
        });
      } catch (err) {
        if (isUniqueViolation(err) && attempt < attempts - 1) continue;
        throw err;
      }
    }
    // Unreachable, but satisfies the type checker.
    throw new Error('Failed to generate a unique license key');
  }

  async listKeys(dto: ListKeysDto) {
    const where: Prisma.LicenseKeyWhereInput = dto.status ? { status: dto.status } : {};
    const take = dto.take ?? 50;
    const skip = dto.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.licenseKey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          redeemedByOrg: {
            select: { id: true, name: true, subscriptionStatus: true, createdAt: true },
          },
        },
      }),
      this.prisma.licenseKey.count({ where }),
    ]);

    return { items, total, take, skip };
  }

  /** Revoke an active key so it can no longer be redeemed. */
  async disableKey(id: string) {
    const key = await this.prisma.licenseKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('License key not found');
    if (key.status === 'redeemed') {
      throw new BadRequestException('A redeemed key cannot be disabled');
    }
    return this.prisma.licenseKey.update({ where: { id }, data: { status: 'disabled' } });
  }

  /** Re-enable a previously disabled key. */
  async enableKey(id: string) {
    const key = await this.prisma.licenseKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('License key not found');
    if (key.status !== 'disabled') {
      throw new BadRequestException('Only a disabled key can be re-enabled');
    }
    return this.prisma.licenseKey.update({ where: { id }, data: { status: 'active' } });
  }

  /** Aggregate metrics for the admin dashboard. */
  async getStats() {
    const [
      keysActive,
      keysDisabled,
      keysRedeemed,
      orgsTotal,
      orgsTrialing,
      orgsActive,
      orgsExpired,
      orgsCanceled,
    ] = await this.prisma.$transaction([
      this.prisma.licenseKey.count({ where: { status: 'active' } }),
      this.prisma.licenseKey.count({ where: { status: 'disabled' } }),
      this.prisma.licenseKey.count({ where: { status: 'redeemed' } }),
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { subscriptionStatus: 'trialing' } }),
      this.prisma.organization.count({ where: { subscriptionStatus: 'active' } }),
      this.prisma.organization.count({ where: { subscriptionStatus: 'expired' } }),
      this.prisma.organization.count({ where: { subscriptionStatus: 'canceled' } }),
    ]);

    const conversionRate = orgsTotal > 0 ? Math.round((orgsActive / orgsTotal) * 100) : 0;

    return {
      keys: {
        total: keysActive + keysDisabled + keysRedeemed,
        active: keysActive,
        disabled: keysDisabled,
        redeemed: keysRedeemed,
      },
      organizations: {
        total: orgsTotal,
        trialing: orgsTrialing,
        active: orgsActive,
        expired: orgsExpired,
        canceled: orgsCanceled,
        conversionRatePct: conversionRate,
      },
    };
  }

  /** Signup roster: who redeemed, which company, current status. */
  async listSignups(take = 50, skip = 0) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          users: {
            where: { role: 'admin' },
            select: { email: true, name: true },
            take: 1,
          },
          redeemedKey: { select: { code: true, type: true } },
        },
      }),
      this.prisma.organization.count(),
    ]);

    const mapped = items.map((org) => ({
      id: org.id,
      company: org.name,
      ownerEmail: org.users[0]?.email ?? null,
      ownerName: org.users[0]?.name ?? null,
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
      licenseKey: org.redeemedKey?.code ?? null,
      keyType: org.redeemedKey?.type ?? null,
      createdAt: org.createdAt.toISOString(),
    }));

    return { items: mapped, total, take, skip };
  }
}

/** True when a Prisma error is a unique-constraint violation (P2002). */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
