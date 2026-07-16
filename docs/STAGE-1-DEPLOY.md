# Stage-1 Deploy — Public site → getleadarrow.com (unblocks Twilio A2P)

Goal: publish the **web front-end only** at `getleadarrow.com` so Twilio's A2P 10DLC
reviewers can see the public landing, Privacy, Terms, and SMS-consent pages. **No provider
credentials are needed for this stage** — the API/backend comes later in stage-2.

The compliance edits are committed as `dd40b4c` on branch `manage-panel`.

---

## Step 1 — Push the commit (your action)

This shell has no GitHub auth. Push from VSCode instead:

- Open the **Source Control** panel (left sidebar) → click **Sync / Push**.
- This pushes branch `manage-panel` (commit `dd40b4c`) to `github.com/morimura07/Speed-To-Lead`.

(Or from a terminal where your GitHub SSH/token is configured: `git push -u origin manage-panel`.)

---

## Step 2 — Create the Vercel project

1. Go to **vercel.com** → sign in **with GitHub** (the `morimura07` account).
2. **Add New → Project** → import the **`Speed-To-Lead`** repo.
3. In the import screen, set:
   - **Root Directory:** `apps/web`  ← *important*. This makes Vercel read `apps/web/vercel.json`,
     which already contains the correct monorepo install/build commands.
   - **Framework Preset:** Next.js (auto-detected — leave it).
   - **Build/Install commands:** leave default — `vercel.json` overrides them.
   - **Node.js Version:** 22.x (or 20.x — both fine for Next 15).
4. **Environment Variables:** none required for stage-1. (Leave `NEXT_PUBLIC_API_URL` unset for now;
   it gets set in stage-2 when the API is live.)
5. Click **Deploy**. First build takes ~1–2 min. You'll get a `*.vercel.app` preview URL — open it
   and confirm `/`, `/privacy`, `/terms`, `/signup` all load.

---

## Step 3 — Point getleadarrow.com at Vercel

1. Vercel project → **Settings → Domains** → add **`getleadarrow.com`** and **`www.getleadarrow.com`**.
2. Vercel shows the exact DNS records. At your **domain registrar** (where you bought the domain),
   add what Vercel displays — typically:
   - Apex `getleadarrow.com` → **A record** → `76.76.21.21`
   - `www` → **CNAME** → `cname.vercel-dns.com`
   - *(Alternatively, switch the domain's nameservers to Vercel's — simpler, but moves all DNS there.)*
3. Wait for DNS propagation + automatic SSL (usually minutes, up to ~1 hour).

---

## Step 4 — Make this branch the production one

The custom domain serves Vercel's **Production Branch**. Since the work is on `manage-panel`:

- Vercel project → **Settings → Git → Production Branch** → set to **`manage-panel`**, then redeploy.
- *(Or merge `manage-panel` → `main` and keep `main` as production — cleaner long-term, do later.)*

---

## Step 5 — Verify (what Twilio checks)

Open in a **logged-out / incognito** browser:

- [ ] `https://getleadarrow.com` — LeadArrow name + short description, loads (no "Coming soon")
- [ ] `https://getleadarrow.com/privacy` — public, no login; states **Eliot Samurin, sole proprietor**
      and **"we do not sell or share mobile numbers / SMS consent for marketing"**
- [ ] `https://getleadarrow.com/terms` — public, no login
- [ ] `https://getleadarrow.com/signup` — shows the **unchecked** SMS consent checkbox + disclosure
      (frequency, rates, STOP/HELP, links to Privacy & Terms)

Then the client submits the Twilio A2P registration with these URLs.

---

## Notes

- **Signup form won't complete yet** (the API isn't deployed). That's expected and fine for A2P —
  reviewers only view the page; they don't submit it. Full signup works after stage-2.
- **Sentry** builds without a token (no source-map upload, no failure). Add `SENTRY_AUTH_TOKEN`
  later if you want uploads.
- **Stage-2 (later):** deploy the API + worker (Render), set `NEXT_PUBLIC_API_URL` in Vercel to the
  live API URL, then wire provider webhooks. See `docs/DEPLOY-RUNBOOK.md`.
