# LeadArrow Extension

Lightweight Chrome softphone. In **Phase 0** this is a Manifest V3 skeleton that
loads and shows a connection-status popup. **Phase 4** adds the realtime channel
to the API and the Twilio Voice SDK so the browser becomes a softphone endpoint
(ring → press 1/2 → open CRM record).

## Load it locally

1. Run `pnpm --filter @leadarrow/extension build` (copies `public/` → `dist/`).
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select either this app's `public/` or `dist/` folder.

## Layout

```
public/
  manifest.json       # MV3 manifest
  service-worker.js   # background lifecycle + message bridge
  popup.html/css/js   # status popup (brand-styled)
scripts/build.mjs     # Phase 0 copy step (replaced by Vite in Phase 4)
```
