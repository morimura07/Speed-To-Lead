import { Injectable, Logger } from '@nestjs/common';
import type { EventType } from '@leadarrow/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordEventInput {
  orgId: string;
  type: EventType;
  leadId?: string | null;
  repId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Append-only writer for the event store — the single source of truth behind
 * every analytics metric. Feature code emits one event per meaningful state
 * transition; nothing mutates or deletes events.
 *
 * Writes are intentionally best-effort: recording an event must never break the
 * primary operation (e.g. ingesting a lead), so failures are logged, not thrown.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordEventInput): Promise<void> {
    try {
      await this.prisma.event.create({
        data: {
          orgId: input.orgId,
          type: input.type,
          leadId: input.leadId ?? null,
          repId: input.repId ?? null,
          payload: (input.payload ?? {}) as object,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record event ${input.type} for org ${input.orgId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
