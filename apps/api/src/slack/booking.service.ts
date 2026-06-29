import { Inject, Injectable, Logger } from '@nestjs/common';
import type { BookingMode } from '@prisma/client';
import { EventType } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { EventsService } from '../events/events.service';
import { TELEPHONY_PROVIDER, type TelephonyProvider } from '../telephony/telephony.types';
import { parseBooking } from './booking.util';

export interface SlackBookingConfig {
  bookingMode: BookingMode;
  setterRepId?: string;
}

/**
 * Handles a booking posted in Slack. In **triage** mode it rings the configured
 * setter to confirm; in **closer** mode it rings the closer matched by the host
 * email. Records a BookingAlert either way.
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly events: EventsService,
    @Inject(TELEPHONY_PROVIDER) private readonly telephony: TelephonyProvider,
  ) {}

  async handle(orgId: string, config: SlackBookingConfig, message: { text: string; ts: string }) {
    const { title, hostEmail } = parseBooking(message.text);

    const repId =
      config.bookingMode === 'triage'
        ? (config.setterRepId ?? null)
        : await this.findCloser(orgId, hostEmail);

    const alert = await this.prisma.bookingAlert.create({
      data: {
        orgId,
        mode: config.bookingMode,
        title,
        hostEmail,
        repId,
        raw: message as object,
      },
    });

    if (!repId) {
      await this.prisma.bookingAlert.update({ where: { id: alert.id }, data: { status: 'failed' } });
      this.logger.warn(`Booking alert ${alert.id}: no rep resolved (mode=${config.bookingMode})`);
      return;
    }

    const rep = await this.prisma.rep.findFirst({
      where: { id: repId, orgId },
      select: { phone: true },
    });
    if (rep && this.telephony.isConfigured()) {
      const base = `${this.config.get('API_PUBLIC_URL')}/v1/telephony`;
      await this.telephony.ringRep({
        to: rep.phone,
        answerUrl: `${base}/booking/${alert.id}`,
        statusCallbackUrl: `${base}/booking/${alert.id}/status`,
        timeoutSeconds: this.config.get('RING_TIMEOUT_SECONDS'),
      });
    }

    await this.prisma.bookingAlert.update({ where: { id: alert.id }, data: { status: 'alerted' } });
    await this.events.record({
      orgId,
      type: EventType.BookingAlertSent,
      repId,
      payload: { bookingAlertId: alert.id, mode: config.bookingMode, title },
    });
    this.logger.log(`Booking alert ${alert.id} rang rep ${repId} (${config.bookingMode})`);
  }

  /** Closer mode: match the booking's host email to a rep's calendar email. */
  private async findCloser(orgId: string, hostEmail: string | null): Promise<string | null> {
    if (!hostEmail) return null;
    const rep = await this.prisma.rep.findFirst({
      where: { orgId, active: true, calendarEmail: hostEmail },
      select: { id: true },
    });
    return rep?.id ?? null;
  }

  listForOrg(orgId: string) {
    return this.prisma.bookingAlert.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { rep: { select: { name: true } } },
    });
  }

  async titleFor(bookingAlertId: string): Promise<string | null> {
    const a = await this.prisma.bookingAlert.findUnique({
      where: { id: bookingAlertId },
      select: { title: true },
    });
    return a?.title ?? null;
  }
}
