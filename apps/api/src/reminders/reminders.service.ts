import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventType } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { EventsService } from '../events/events.service';
import { RepsService } from '../reps/reps.service';
import { TELEPHONY_PROVIDER, type TelephonyProvider } from '../telephony/telephony.types';
import { ReminderDispatcher } from './reminder.dispatcher';
import type { CreateReminderDto } from './dto/reminder.dto';

const MAX_RESCHEDULES = 5;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly events: EventsService,
    private readonly reps: RepsService,
    private readonly dispatcher: ReminderDispatcher,
    @Inject(TELEPHONY_PROVIDER) private readonly telephony: TelephonyProvider,
  ) {}

  async schedule(orgId: string, dto: CreateReminderDto) {
    const rep = await this.prisma.rep.findFirst({
      where: { id: dto.repId, orgId },
      select: { id: true },
    });
    if (!rep) throw new NotFoundException('Rep not found');

    const dueAt = new Date(dto.dueAt);
    if (Number.isNaN(dueAt.getTime())) throw new BadRequestException('Invalid due date');

    const reminder = await this.prisma.followUpReminder.create({
      data: {
        orgId,
        repId: dto.repId,
        note: dto.note.trim(),
        crmTaskId: dto.crmTaskId ?? null,
        dueAt,
      },
    });

    await this.dispatcher.schedule(reminder.id, dueAt.getTime() - Date.now());
    this.logger.log(`Scheduled reminder ${reminder.id} for rep ${dto.repId} at ${dueAt.toISOString()}`);
    return reminder;
  }

  list(orgId: string) {
    return this.prisma.followUpReminder.findMany({
      where: { orgId },
      orderBy: { dueAt: 'asc' },
      include: { rep: { select: { name: true } } },
    });
  }

  async cancel(orgId: string, id: string) {
    const result = await this.prisma.followUpReminder.updateMany({
      where: { id, orgId, status: { in: ['scheduled', 'rescheduled'] } },
      data: { status: 'canceled' },
    });
    if (result.count === 0) throw new NotFoundException('Reminder not found or not cancelable');
    return { ok: true };
  }

  /**
   * Fired by the worker at the due time. If the rep is available, call them;
   * otherwise move the reminder to their next free block (up to a cap).
   */
  async process(reminderId: string): Promise<void> {
    const reminder = await this.prisma.followUpReminder.findUnique({
      where: { id: reminderId },
      include: { rep: { select: { phone: true } } },
    });
    if (!reminder || reminder.status === 'canceled' || reminder.status === 'completed') return;

    const now = new Date();

    if (await this.reps.isAvailable(reminder.repId, now)) {
      await this.callRep(reminder.id, reminder.rep.phone);
      await this.prisma.followUpReminder.update({
        where: { id: reminder.id },
        data: { status: 'completed' },
      });
      await this.events.record({
        orgId: reminder.orgId,
        type: EventType.FollowUpReminderSent,
        repId: reminder.repId,
        payload: { reminderId: reminder.id },
      });
      this.logger.log(`Reminder ${reminder.id} delivered to rep ${reminder.repId}`);
      return;
    }

    // Rep unavailable — reschedule to their next free block.
    const next = reminder.attempts < MAX_RESCHEDULES ? await this.reps.nextAvailable(reminder.repId, now) : null;
    if (next) {
      await this.prisma.followUpReminder.update({
        where: { id: reminder.id },
        data: { dueAt: next, status: 'rescheduled', attempts: { increment: 1 } },
      });
      await this.dispatcher.schedule(reminder.id, next.getTime() - now.getTime());
      this.logger.log(`Reminder ${reminder.id} rescheduled to ${next.toISOString()}`);
    } else {
      await this.prisma.followUpReminder.update({
        where: { id: reminder.id },
        data: { status: 'failed' },
      });
      this.logger.warn(`Reminder ${reminder.id} failed (no available slot)`);
    }
  }

  private async callRep(reminderId: string, phone: string): Promise<void> {
    if (!this.telephony.isConfigured()) {
      this.logger.warn(`Telephony not configured; skipping reminder call ${reminderId}`);
      return;
    }
    const base = `${this.config.get('API_PUBLIC_URL')}/v1/telephony`;
    await this.telephony.ringRep({
      to: phone,
      answerUrl: `${base}/reminder/${reminderId}`,
      statusCallbackUrl: `${base}/reminder/${reminderId}/status`,
      timeoutSeconds: this.config.get('RING_TIMEOUT_SECONDS'),
    });
  }

  /** The note read out on the reminder call (used by the voice webhook). */
  async noteFor(reminderId: string): Promise<string | null> {
    const r = await this.prisma.followUpReminder.findUnique({
      where: { id: reminderId },
      select: { note: true },
    });
    return r?.note ?? null;
  }
}
