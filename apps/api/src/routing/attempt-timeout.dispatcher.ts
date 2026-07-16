import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppConfigService } from '../config/config.module';
import { buildRedisConnection } from '../queue/redis-connection';
import {
  ATTEMPT_TIMEOUT_QUEUE,
  TIMEOUT_ATTEMPT_JOB,
  type AttemptTimeoutJobData,
} from './attempt-timeout.constants';

/**
 * Schedules a delayed "force timeout" for a ring attempt. This is a backstop:
 * normally Twilio's status callback ends the attempt, but if that never arrives
 * (telephony unconfigured, extension-only ring, or a lost callback) this fires
 * after the ring window so the lead still re-routes / dead-ends instead of
 * hanging. Idempotent — noResponse no-ops if the attempt already resolved.
 */
@Injectable()
export class AttemptTimeoutDispatcher implements OnModuleDestroy {
  private readonly logger = new Logger(AttemptTimeoutDispatcher.name);
  private queue: Queue<AttemptTimeoutJobData> | null = null;

  constructor(private readonly config: AppConfigService) {}

  private getQueue(): Queue<AttemptTimeoutJobData> {
    if (this.queue) return this.queue;
    const redisUrl = this.config.get('REDIS_URL') ?? 'redis://localhost:6379';
    this.queue = new Queue<AttemptTimeoutJobData>(ATTEMPT_TIMEOUT_QUEUE, {
      connection: buildRedisConnection(redisUrl),
      defaultJobOptions: { attempts: 2, removeOnComplete: 1000, removeOnFail: 1000 },
    });
    return this.queue;
  }

  async schedule(attemptId: string, delayMs: number): Promise<void> {
    try {
      await this.getQueue().add(
        TIMEOUT_ATTEMPT_JOB,
        { attemptId },
        { delay: Math.max(0, delayMs), jobId: `to-${attemptId}` },
      );
    } catch (err) {
      // A missing timeout backstop must not break placing the ring.
      this.logger.warn(`Could not schedule attempt timeout for ${attemptId}: ${String(err)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
