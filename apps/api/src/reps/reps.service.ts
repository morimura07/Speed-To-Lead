import { Injectable, NotFoundException } from '@nestjs/common';
import type { Rep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRepDto, UpdateRepDto } from './dto/rep.dto';

@Injectable()
export class RepsService {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, dto: CreateRepDto): Promise<Rep> {
    return this.prisma.rep.create({
      data: {
        orgId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        routingPercent: dto.routingPercent ?? null,
        order: dto.order ?? 0,
      },
    });
  }

  list(orgId: string): Promise<Rep[]> {
    return this.prisma.rep.findMany({
      where: { orgId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(orgId: string, id: string, dto: UpdateRepDto): Promise<Rep> {
    await this.ensureOwned(orgId, id);
    return this.prisma.rep.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        phone: dto.phone?.trim(),
        active: dto.active,
        routingPercent: dto.routingPercent,
        order: dto.order,
      },
    });
  }

  async remove(orgId: string, id: string): Promise<void> {
    await this.ensureOwned(orgId, id);
    await this.prisma.rep.delete({ where: { id } });
  }

  /**
   * Reps eligible to receive a lead right now: active, idle (not on a call),
   * and not already tried for this lead. Ordered deterministically so
   * round-robin selection is stable. Full availability-window and calendar
   * checks are layered in here in Phase 5.
   */
  findEligible(orgId: string, excludeRepIds: string[] = []): Promise<Rep[]> {
    return this.prisma.rep.findMany({
      where: {
        orgId,
        active: true,
        status: 'idle',
        id: excludeRepIds.length ? { notIn: excludeRepIds } : undefined,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async ensureOwned(orgId: string, id: string): Promise<void> {
    const rep = await this.prisma.rep.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!rep) throw new NotFoundException('Rep not found');
  }
}
