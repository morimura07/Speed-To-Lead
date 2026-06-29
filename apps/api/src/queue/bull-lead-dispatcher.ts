import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppConfigService } from '../config/config.module';
import { buildRedisConnection } from './redis-connection';
import {
  LEAD_ROUTING_QUEUE,
  ROUTE_LEAD_JOB,
  type LeadDispatcher,
  type RouteLeadJobData,
} from './queue.constants';

/**
 * BullMQ-backed lead dispatcher. The queue (and its Redis connection) is created
 * lazily on first dispatch, so the API boots (and tests run) without Redis until
 * a lead is actually ingested. The routing worker that consumes this queue is
 * introduced in Phase 3.
 */
@Injectable()
export class BullLeadDispatcher implements LeadDispatcher, OnModuleDestroy {
  private readonly logger = new Logger(BullLeadDispatcher.name);
  private queue: Queue<RouteLeadJobData> | null = null;

  constructor(private readonly config: AppConfigService) {}

  private getQueue(): Queue<RouteLeadJobData> {
    if (this.queue) return this.queue;
    const redisUrl = this.config.get('REDIS_URL') ?? 'redis://localhost:6379';
    const queue = new Queue<RouteLeadJobData>(LEAD_ROUTING_QUEUE, {
      connection: buildRedisConnection(redisUrl),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    this.queue = queue;
    this.logger.log('Lead routing queue initialized');
    return queue;
  }

  async dispatch(data: RouteLeadJobData): Promise<void> {
    // Use the lead id as the job id so duplicate dispatches collapse into one.
    await this.getQueue().add(ROUTE_LEAD_JOB, data, { jobId: data.leadId });
    this.logger.debug(`Dispatched lead ${data.leadId} for routing`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
