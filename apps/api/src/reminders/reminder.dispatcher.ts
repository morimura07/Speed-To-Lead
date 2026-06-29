import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppConfigService } from '../config/config.module';
import { buildRedisConnection } from '../queue/redis-connection';
import { FOLLOWUP_QUEUE, SEND_REMINDER_JOB, type SendReminderJobData } from './reminder.constants';

/**
 * Producer for follow-up reminder calls. Schedules a *delayed* BullMQ job that
 * fires at the reminder's due time. Lazy connection (like the lead dispatcher)
 * so the API boots without Redis until a reminder is scheduled.
 */
@Injectable()
export class ReminderDispatcher implements OnModuleDestroy {
  private readonly logger = new Logger(ReminderDispatcher.name);
  private queue: Queue<SendReminderJobData> | null = null;

  constructor(private readonly config: AppConfigService) {}

  private getQueue(): Queue<SendReminderJobData> {
    if (this.queue) return this.queue;
    const redisUrl = this.config.get('REDIS_URL') ?? 'redis://localhost:6379';
    this.queue = new Queue<SendReminderJobData>(FOLLOWUP_QUEUE, {
      connection: buildRedisConnection(redisUrl),
      defaultJobOptions: { attempts: 3, removeOnComplete: 1000, removeOnFail: 5000 },
    });
    return this.queue;
  }

  /** Enqueue (or re-enqueue) a reminder to fire after `delayMs`. */
  async schedule(reminderId: string, delayMs: number): Promise<void> {
    const delay = Math.max(0, delayMs);
    await this.getQueue().add(
      SEND_REMINDER_JOB,
      { reminderId },
      { delay, jobId: `${reminderId}-${Date.now() + delay}` },
    );
    this.logger.debug(`Scheduled reminder ${reminderId} in ${Math.round(delay / 1000)}s`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
