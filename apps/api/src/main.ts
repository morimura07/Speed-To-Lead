import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  // `rawBody: true` preserves the exact request bytes so CRM webhook signatures
  // can be verified against the unmodified payload.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  // Route Nest's internal logging through Pino.
  app.useLogger(app.get(Logger));

  const config = app.get(AppConfigService);

  // Security headers + cookie parsing (httpOnly refresh-token cookies).
  app.use(helmet());
  app.use(cookieParser());

  // CORS limited to configured origins (the web dashboard, extension, etc.).
  app.enableCors({
    origin: config.get('CORS_ORIGINS'),
    credentials: true,
  });

  // URI versioning: feature routes live under /v1/*. The health controller is
  // marked version-neutral so probes hit a stable /health path.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validate + transform all incoming DTOs; strip unknown properties.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Consistent error envelope for every unhandled exception.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Flush logs and close connections cleanly on shutdown.
  app.enableShutdownHooks();

  const port = config.get('PORT');
  await app.listen(port, '0.0.0.0');

  app.get(Logger).log(`LeadArrow API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
