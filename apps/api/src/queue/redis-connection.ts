import type { ConnectionOptions } from 'bullmq';

/**
 * Build BullMQ Redis connection options from a REDIS_URL. Returning plain
 * options (rather than an ioredis instance) lets BullMQ own the client and
 * avoids depending on a specific ioredis version.
 */
export function buildRedisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) || 0 : 0,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    // Required by BullMQ for blocking commands (workers).
    maxRetriesPerRequest: null,
  };
}
