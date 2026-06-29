import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ZodError } from 'zod';
import { Prisma, type Rep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CALENDAR_CHECKER, type CalendarChecker } from '../calendar/calendar.types';
import {
  isAvailableAt,
  parseDaysOff,
  parseSchedule,
  validateDaysOff,
  validateSchedule,
} from './availability.util';
import type { CreateRepDto, SetAvailabilityDto, UpdateRepDto } from './dto/rep.dto';

@Injectable()
export class RepsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CALENDAR_CHECKER) private readonly calendar: CalendarChecker,
  ) {}

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
   * Reps eligible by base status: active, idle (not on a call), and not already
   * tried for this lead. Ordered deterministically so round-robin is stable.
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

  /**
   * Reps eligible to be rung *right now*: base status (above) AND within their
   * availability window / not on a day off, AND — when the org enables it — not
   * calendar-busy. This is what the routing engine consults.
   */
  async findEligibleNow(orgId: string, excludeRepIds: string[] = []): Promise<Rep[]> {
    const [reps, org] = await Promise.all([
      this.findEligible(orgId, excludeRepIds),
      this.prisma.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: { timezone: true, calendarBusyCheck: true },
      }),
    ]);

    const now = new Date();
    const available = reps.filter((r) =>
      isAvailableAt(
        parseSchedule(r.availability),
        parseDaysOff(r.daysOff),
        r.timezone ?? org.timezone,
        now,
      ),
    );

    if (!org.calendarBusyCheck) return available;

    const checked = await Promise.all(
      available.map(async (rep) => ({
        rep,
        busy: await this.calendar.isBusy({ repId: rep.id, calendarEmail: rep.calendarEmail, at: now }),
      })),
    );
    return checked.filter((c) => !c.busy).map((c) => c.rep);
  }

  /** Update a rep's weekly schedule, days off, timezone, and calendar email. */
  async setAvailability(orgId: string, id: string, dto: SetAvailabilityDto): Promise<Rep> {
    await this.ensureOwned(orgId, id);
    try {
      return await this.prisma.rep.update({
        where: { id },
        data: {
          ...(dto.timezone !== undefined ? { timezone: dto.timezone || null } : {}),
          ...(dto.calendarEmail !== undefined ? { calendarEmail: dto.calendarEmail || null } : {}),
          ...(dto.availability !== undefined
            ? { availability: validateSchedule(dto.availability) as unknown as Prisma.InputJsonValue }
            : {}),
          ...(dto.daysOff !== undefined
            ? { daysOff: validateDaysOff(dto.daysOff) as Prisma.InputJsonValue }
            : {}),
        },
      });
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException('Invalid availability schedule or days off');
      }
      throw err;
    }
  }

  private async ensureOwned(orgId: string, id: string): Promise<void> {
    const rep = await this.prisma.rep.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!rep) throw new NotFoundException('Rep not found');
  }
}
