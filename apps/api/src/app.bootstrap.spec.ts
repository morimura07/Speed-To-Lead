import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

/**
 * Smoke test: boot the full application module graph (config, logging, mail,
 * auth, licensing, health) with the database stubbed. This proves every
 * provider, controller, and guard resolves and wires up correctly — catching
 * DI misconfiguration that the type checker cannot.
 */
describe('AppModule bootstrap', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Keep the routing worker (and its Redis connection) out of the bootstrap test.
    process.env.ROUTING_WORKER_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('initializes the application', () => {
    expect(app).toBeDefined();
    expect(app.getHttpServer()).toBeDefined();
  });
});
