/**
 * Database seed — provisions the platform admin from environment variables so
 * the backend admin surface is usable immediately after `prisma migrate`.
 *
 * Idempotent: re-running updates the existing admin's name/password rather than
 * creating duplicates. Run with: `pnpm --filter @leadarrow/api db:seed`.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

async function main(): Promise<void> {
  const email = (process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@leadarrow.local').toLowerCase();
  const name = process.env.PLATFORM_ADMIN_NAME ?? 'LeadArrow Admin';
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? 'changeme-admin-123';

  const passwordHash = await hash(password, ARGON_OPTIONS);

  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  console.log(`✔ Platform admin ready: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
