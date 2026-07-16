# Sharing the LeadArrow Softphone with the Client

The Chrome softphone lets the client's **own browser ring** when a lead is routed
to a rep. It's been rebuilt to connect to your demo server at `103.179.45.26` and
packaged for sharing. **Verified working end-to-end over your IP.**

## The file to send

**`C:\PROJECT\Speed to Lead\leadarrow-softphone.zip`** — send this to the client
(email, chat, file share). ~21 KB.

---

## Client: install it (Chrome or Edge)

1. **Unzip** `leadarrow-softphone.zip` → you get a `leadarrow-softphone` folder.
2. Open **`chrome://extensions`** (or `edge://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** → select the **`leadarrow-softphone`** folder.
5. (Optional) Click the puzzle-piece icon in the toolbar and **pin** "LeadArrow Softphone".
6. Click the extension icon — it shows **"Not paired."**

> Chrome will note the extension can connect to `103.179.45.26` — that's expected;
> it's how the softphone reaches the demo server. Developer mode is required
> because this is a demo build (not from the Chrome Web Store).

---

## Pair it (you generate a code, the client pastes it)

1. **You** (in the demo dashboard, signed in as `demo@leadarrow.com`):
   **Team → the rep "Jordan Rivera" → Hours → Generate pairing code → Copy.**
   Send that code to the client.
2. **Client:** click the extension icon → paste the code → **Connect**.
   The status dot turns **green ("Connected")**.

The pairing code embeds your server address, so it only works while your machine
is running and reachable.

---

## Make it ring (the payoff)

1. **You — route leads to the paired rep:** in **Team**, click **Pause** on the
   other three reps (Sam, Alex, Priya). Now every lead goes to **Jordan Rivera**,
   the rep the client paired. *(Un-pause them afterwards.)*
2. **You — send a lead:** go to **Integrations → Connect → Close**, copy the
   **Webhook URL** and **Signing secret**, then in your terminal run:
   ```bash
   node scripts/send-test-lead.mjs "<WEBHOOK_URL>" "<SIGNING_SECRET>" "Client Live Lead"
   ```
3. **Client:** their browser **rings** — the extension popup shows the incoming
   lead with **Accept / Decline**. They click **Accept** → a **CRM tab opens** to
   the lead record. 🎉

That's the full speed-to-lead loop, happening in the client's own browser.

---

## Notes
- Works in **Chrome / Edge** (Chromium). Not Firefox.
- If the dot stays grey ("Connecting…"), the client's network can't reach
  `103.179.45.26:4000` — the same reachability check as the web app.
- To reset, click the extension → **Disconnect**, or remove it from
  `chrome://extensions`.
