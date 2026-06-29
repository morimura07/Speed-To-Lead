import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Env } from '../../config/env.validation';

/**
 * Structured, request-scoped logging via Pino. In development we pretty-print;
 * in production we emit JSON for log aggregators. Every request gets a
 * correlation id (reused from an inbound `x-request-id` when present).
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        // Pretty-print only in local development. In test/production we emit
        // plain JSON, which also avoids pino-pretty's worker thread leaking in Jest.
        const isDev = config.get('NODE_ENV', { infer: true }) === 'development';
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const existing = req.headers['x-request-id'];
              const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            autoLogging: true,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true, translateTime: 'SYS:standard' },
                }
              : undefined,
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
