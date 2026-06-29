import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { AppConfigService } from '../config/config.module';
import { buildRedisConnection } from '../queue/redis-connection';
import { LEAD_ROUTING_QUEUE, type RouteLeadJobData } from '../queue/queue.constants';
import { RoutingService } from './routing.service';

/**
 * BullMQ worker that consumes the lead-routing queue and drives each lead
 * through the routing engine. Gated by ROUTING_WORKER_ENABLED so it can be
 * disabled on processes without Redis (and in tests).
 */
@Injectable()
export class RoutingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoutingWorker.name);
  private worker: Worker<RouteLeadJobData> | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly routing: RoutingService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('ROUTING_WORKER_ENABLED')) {
      this.logger.log('Routing worker disabled (ROUTING_WORKER_ENABLED=false)');
      return;
    }

    const redisUrl = this.config.get('REDIS_URL') ?? 'redis://localhost:6379';
    this.worker = new Worker<RouteLeadJobData>(
      LEAD_ROUTING_QUEUE,
      async (job) => {
        await this.routing.routeLead(job.data.leadId);
      },
      { connection: buildRedisConnection(redisUrl), concurrency: 8 },
    );

    this.worker.on('failed', (job, err) =>
      this.logger.error(`Routing job ${job?.id} failed: ${err.message}`),
    );
    this.worker.on('error', (err) => this.logger.error(`Routing worker error: ${err.message}`));

    this.logger.log('Routing worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
