# LeadArrow Extension

Lightweight Chrome softphone (Manifest V3). When a lead is routed to a rep, their
paired browser **rings** alongside their phone: the popup shows the incoming lead
with **Accept / Decline**, accepting opens the CRM record, and the phone leg is
cancelled. Realtime signaling runs over Socket.IO; the persistent connection
lives in an **offscreen document** (MV3 service workers are ephemeral).

> Scope: this is a *lightweight* softphone — it rings + accepts + opens the CRM.
> Full WebRTC audio (talking to the lead through the browser via the Twilio Voice
> SDK) is a future enhancement.

## Build & load

```bash
pnpm --filter @leadarrow/extension build   # → apps/extension/dist
```
Then at `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select **`apps/extension/dist`**.

## Pair a rep

1. In the dashboard: **Team → expand a rep (Hours) → Generate pairing code** → copy.
2. Open the extension popup → paste the code → **Connect**.
3. The status dot turns green. The browser now rings when a lead routes to that rep.

## Layout

```
public/
  manifest.json          # MV3 manifest (storage, notifications, offscreen)
  service-worker.js      # coordinator: pairing, offscreen lifecycle, notifications, tabs
  offscreen.html/js      # persistent Socket.IO connection + ring tone
  popup.html/css/js      # pair / incoming-lead / idle views
scripts/build.mjs        # copies public/ → dist/, vendors socket.io, generates icon
```

The Socket.IO browser client is vendored into `dist/vendor/` at build time.
