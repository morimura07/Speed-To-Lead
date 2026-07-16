import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { AppConfigService } from '../config/config.module';
import { buildRedisConnection } from '../queue/redis-connection';
import { ATTEMPT_TIMEOUT_QUEUE, type AttemptTimeoutJobData } from './attempt-timeout.constants';
import { RoutingService } from './routing.service';

/** Consumes attempt-timeout jobs and forces a timeout on still-ringing attempts. */
@Injectable()
export class AttemptTimeoutWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttemptTimeoutWorker.name);
  private worker: Worker<AttemptTimeoutJobData> | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly routing: RoutingService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('ROUTING_WORKER_ENABLED')) return;
    const redisUrl = this.config.get('REDIS_URL') ?? 'redis://localhost:6379';
    this.worker = new Worker<AttemptTimeoutJobData>(
      ATTEMPT_TIMEOUT_QUEUE,
      async (job) => {
        await this.routing.noResponse(job.data.attemptId, 'timeout');
      },
      { connection: buildRedisConnection(redisUrl), concurrency: 8 },
    );
    this.worker.on('error', (err) => this.logger.error(`Attempt-timeout worker error: ${err.message}`));
    this.logger.log('Attempt-timeout worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
