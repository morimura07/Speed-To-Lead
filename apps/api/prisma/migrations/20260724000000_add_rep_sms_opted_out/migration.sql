-- AlterTable
-- Adds the SMS opt-out flag to reps (STOP/START compliance). This column was
-- added to the schema after the 0_init baseline; capturing it as a migration so
-- the migration history matches the schema and fresh deploys include it.
ALTER TABLE "reps" ADD COLUMN "smsOptedOut" BOOLEAN NOT NULL DEFAULT false;
