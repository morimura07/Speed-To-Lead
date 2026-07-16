# LeadArrow — Client Demo Guide

Everything is configured so the client can connect to **your** machine at
`103.179.45.26` and experience the full product. Follow this script to walk them
through every feature.

## Access

| What | URL |
| --- | --- |
| **App + marketing site** | http://103.179.45.26:3000 |
| **Admin console** | http://103.179.45.26:3000/admin/login |

## Credentials

| Account | Login |
| --- | --- |
| **Demo company** (pre-loaded with data) | `demo@leadarrow.com` / `demo1234` |
| **Platform admin** | `admin@leadarrow.local` / `changeme-admin-123` |
| **Fresh license key** (for the live sign-up) | `LA-N62Y-KFJ2-T7X3` |

> Keep the terminal running during the demo (both API :4000 and web :3000 must
> stay up). If the client can't connect, it's a network/ISP reachability issue —
> test with them a few minutes early.

---

## Walkthrough (≈15–20 min)

### 1. The marketing site — "what a prospect sees"
Open **http://103.179.45.26:3000**. Scroll the landing page: the hero, **how it
works** (lead lands → everything rings → press 1), the feature grid, and the
**pricing** ("Plans start at $750/mo" with a Book-a-consultation CTA). Sets the
tone: this is a real, polished product.

### 2. The licensing model — "you control who gets in"
Go to **/admin/login** → sign in as the platform admin. Show:
- **Generate access keys** (timed trials or unlimited) — generate one live.
- The **keys table** (active / redeemed / disabled), **stats** (companies,
  conversion rate), and the **sign-ups roster**.

Message: *account creation is gated by keys you issue — nobody signs up without one.*

### 3. Live onboarding — "a brand-new customer"
Open **/signup** → paste the fresh key **`LA-N62Y-KFJ2-T7X3`**, enter a company
name, your name, email, phone, tick SMS consent → **Create account**. You land in
a fresh dashboard on a **30-day trial**. Message: *key-gated signup, consent
captured, trial starts instantly.* (This creates a new empty org — the rich data
lives in the demo account next.)

### 4. The product, fully loaded — sign in as the demo company
Sign out, then sign in as **`demo@leadarrow.com` / `demo1234`** ("Acme Sales Co").
Walk the left-nav top to bottom:

- **Overview** — welcome, trial banner, and the workspace tiles.
- **Leads** — the live feed of **28 incoming leads** (Close, HubSpot, Slack),
  each with source, status, and "Open in CRM."
- **Analytics** — the highlight. Point out:
  - KPIs: **68% connection rate** (animated ring), avg time-to-accept, dead-end rate.
  - **Response speed** windows, **leads by source**, **leads over time** chart.
  - **Rep performance** table — pickup & acceptance rates per rep.
  - **Routing health** + **reliability**.
  - Change the range (**7d / 30d / 90d**) and the **source filter** — it all recomputes.
  - Scroll to **Lead histories** → click a lead to expand its **routing timeline**
    (you'll see reroutes: one rep declined → next accepted).
- **Team** — the reps, the **routing method** (round-robin vs percentage), and
  click **Hours** on a rep to show the **weekly availability editor**, days off,
  timezone, Pushover key, and **Generate pairing code** (Chrome softphone).
- **Follow-ups** — schedule a reminder (pick a rep, a note, a time), and the
  existing **reminders + booking alerts** lists.
- **Integrations** — connect a CRM (**Close, HubSpot, GoHighLevel, Salesforce**)
  to get a **secure webhook URL + signing secret**; plus the **Slack** setup
  (events URL, monitored channels, triage/closer booking mode).

### 5. Show a lead arrive live (optional, impressive)
In **Integrations**, click **Connect → Close** and copy the **Webhook URL** and
**Signing secret**. In your terminal:

```bash
node scripts/send-test-lead.mjs "<WEBHOOK_URL>" "<SIGNING_SECRET>" "Live Demo Lead"
```

Refresh **Leads** — the new lead appears instantly (ingested → routed). If you
want the **phone to actually ring**, add a rep in **Team** with *your verified
mobile*, and the lead will call you: you hear the prospect + press **1** to accept
and get an SMS with the CRM link.

### 6. Billing & the trial gate
Click the **"TRIAL · N D LEFT"** pill (top-right) → the **/billing** screen with
the **$750/mo** plan and **Subscribe with Stripe**. Explain: when a trial ends,
the dashboard is gated until they subscribe (enforced server-side).

---

## Confidence talking points
- **Four CRMs + Slack** ingest leads; everything normalizes into one feed.
- **Simultaneous ring** across phone, browser softphone, and push — first accept wins.
- **Real routing engine**: round-robin / percentage, availability & calendar aware,
  with automatic re-routing and dead-end handling.
- **Analytics from an event-sourced spine** — every metric is real, filterable, drillable.
- **Booking alerts + follow-up reminder calls**, **Stripe billing**, a **marketing site**.
- Built on production infrastructure — **Neon Postgres, Upstash Redis, Twilio** —
  with rate limiting and **httpOnly-cookie auth**. ~1–2 weeks from a soft launch.

## If you need to re-seed the demo data
```bash
node --env-file=apps/api/.env scripts/seed-demo.mjs
```
