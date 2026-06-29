import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { AppConfigService } from '../config/config.module';
import { buildRedisConnection } from '../queue/redis-connection';
import { FOLLOWUP_QUEUE, type SendReminderJobData } from './reminder.constants';
import { RemindersService } from './reminders.service';

/**
 * Consumes due follow-up reminders. Gated by ROUTING_WORKER_ENABLED (the same
 * "background workers on" switch used by the routing worker), so it's disabled
 * in tests and on processes without Redis.
 */
@Injectable()
export class ReminderWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderWorker.name);
  private worker: Worker<SendReminderJobData> | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly reminders: RemindersService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('ROUTING_WORKER_ENABLED')) return;

    const redisUrl = this.config.get('REDIS_URL') ?? 'redis://localhost:6379';
    this.worker = new Worker<SendReminderJobData>(
      FOLLOWUP_QUEUE,
      async (job) => {
        await this.reminders.process(job.data.reminderId);
      },
      { connection: buildRedisConnection(redisUrl), concurrency: 4 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Reminder job ${job?.id} failed: ${err.message}`),
    );
    this.worker.on('error', (err) => this.logger.error(`Reminder worker error: ${err.message}`));
    this.logger.log('Reminder worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
