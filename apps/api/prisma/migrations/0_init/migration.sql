-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "LicenseKeyType" AS ENUM ('timed', 'unlimited');

-- CreateEnum
CREATE TYPE "LicenseKeyStatus" AS ENUM ('active', 'disabled', 'redeemed');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('close', 'gohighlevel', 'salesforce', 'hubspot', 'slack', 'google_calendar');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('received', 'routing', 'accepted', 'dead_end');

-- CreateEnum
CREATE TYPE "RoutingMethod" AS ENUM ('round_robin', 'percentage');

-- CreateEnum
CREATE TYPE "RepStatus" AS ENUM ('idle', 'on_call', 'off');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('ringing', 'accepted', 'declined', 'timed_out', 'failed');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('triage', 'closer');

-- CreateEnum
CREATE TYPE "BookingAlertStatus" AS ENUM ('pending', 'alerted', 'failed');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('scheduled', 'rescheduled', 'completed', 'canceled', 'failed');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "smsConsent" BOOLEAN NOT NULL DEFAULT false,
    "smsConsentAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "routingMethod" "RoutingMethod" NOT NULL DEFAULT 'round_robin',
    "roundRobinCursor" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "calendarBusyCheck" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_keys" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LicenseKeyType" NOT NULL,
    "trialDays" INTEGER,
    "status" "LicenseKeyStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "redeemedByOrgId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT,
    "adminId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'active',
    "webhookToken" TEXT NOT NULL,
    "signingSecret" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "integrationId" TEXT,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "crmRecordUrl" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'received',
    "acceptedById" TEXT,
    "raw" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reps" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "RepStatus" NOT NULL DEFAULT 'idle',
    "routingPercent" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT,
    "calendarEmail" TEXT,
    "availability" JSONB NOT NULL DEFAULT '{}',
    "daysOff" JSONB NOT NULL DEFAULT '[]',
    "pairingToken" TEXT,
    "pushoverUserKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_alerts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "mode" "BookingMode" NOT NULL,
    "title" TEXT NOT NULL,
    "hostEmail" TEXT,
    "repId" TEXT,
    "status" "BookingAlertStatus" NOT NULL DEFAULT 'pending',
    "raw" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_reminders" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "crmTaskId" TEXT,
    "note" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'scheduled',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_attempts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'phone',
    "providerCallId" TEXT,
    "outcome" "AttemptOutcome" NOT NULL DEFAULT 'ringing',
    "answeredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "leadId" TEXT,
    "repId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "license_keys_code_key" ON "license_keys"("code");

-- CreateIndex
CREATE UNIQUE INDEX "license_keys_redeemedByOrgId_key" ON "license_keys"("redeemedByOrgId");

-- CreateIndex
CREATE INDEX "license_keys_status_idx" ON "license_keys"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_adminId_idx" ON "refresh_tokens"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_webhookToken_key" ON "integrations"("webhookToken");

-- CreateIndex
CREATE INDEX "integrations_orgId_idx" ON "integrations"("orgId");

-- CreateIndex
CREATE INDEX "leads_orgId_createdAt_idx" ON "leads"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_orgId_status_idx" ON "leads"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_orgId_source_externalId_key" ON "leads"("orgId", "source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "reps_pairingToken_key" ON "reps"("pairingToken");

-- CreateIndex
CREATE INDEX "reps_orgId_idx" ON "reps"("orgId");

-- CreateIndex
CREATE INDEX "booking_alerts_orgId_createdAt_idx" ON "booking_alerts"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "followup_reminders_orgId_dueAt_idx" ON "followup_reminders"("orgId", "dueAt");

-- CreateIndex
CREATE INDEX "lead_attempts_leadId_idx" ON "lead_attempts"("leadId");

-- CreateIndex
CREATE INDEX "lead_attempts_providerCallId_idx" ON "lead_attempts"("providerCallId");

-- CreateIndex
CREATE INDEX "events_orgId_occurredAt_idx" ON "events"("orgId", "occurredAt");

-- CreateIndex
CREATE INDEX "events_orgId_type_occurredAt_idx" ON "events"("orgId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "events_leadId_idx" ON "events"("leadId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_redeemedByOrgId_fkey" FOREIGN KEY ("redeemedByOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "reps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reps" ADD CONSTRAINT "reps_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_alerts" ADD CONSTRAINT "booking_alerts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_alerts" ADD CONSTRAINT "booking_alerts_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_reminders" ADD CONSTRAINT "followup_reminders_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_reminders" ADD CONSTRAINT "followup_reminders_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

