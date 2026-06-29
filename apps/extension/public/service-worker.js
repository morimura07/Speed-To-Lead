// LeadArrow background service worker (MV3).
//
// The service worker is ephemeral, so the persistent realtime connection lives
// in an offscreen document. This worker coordinates: it owns pairing storage,
// spins up the offscreen doc, relays accept/decline, shows notifications, opens
// CRM tabs, and exposes state to the popup.

const STATE_KEY = 'la_state';
const PAIRING_KEY = 'la_pairing';

async function getPairing() {
  const v = await chrome.storage.local.get(PAIRING_KEY);
  return v[PAIRING_KEY] ?? null;
}

async function setState(patch) {
  const cur = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY] ?? {};
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ [STATE_KEY]: next });
  chrome.runtime.sendMessage({ type: 'state-changed' }).catch(() => {});
  return next;
}

async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument?.().catch(() => false);
  if (has) return;
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Maintain the realtime lead connection and play the ring tone.',
    });
  } catch (err) {
    // Another caller may have created it first — ignore the race.
    if (!String(err).includes('Only a single offscreen')) console.error(err);
  }
}

async function connect() {
  const pairing = await getPairing();
  if (!pairing) return;
  await ensureOffscreen();
  chrome.runtime.sendMessage({ target: 'offscreen', type: 'connect', ...pairing }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => void connect());
chrome.runtime.onStartup?.addListener(() => void connect());

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Messages addressed to the offscreen document are handled there, not here.
  if (msg?.target === 'offscreen') return;

  (async () => {
    switch (msg?.type) {
      case 'pair': {
        try {
          const decoded = JSON.parse(atob(msg.code));
          if (!decoded.url || !decoded.token) throw new Error('bad code');
          await chrome.storage.local.set({ [PAIRING_KEY]: { url: decoded.url, token: decoded.token } });
          await connect();
          sendResponse({ ok: true });
        } catch {
          sendResponse({ ok: false, error: 'Invalid pairing code' });
        }
        break;
      }
      case 'unpair': {
        await chrome.storage.local.remove(PAIRING_KEY);
        await setState({ connected: false, incoming: null });
        chrome.runtime.sendMessage({ target: 'offscreen', type: 'disconnect' }).catch(() => {});
        sendResponse({ ok: true });
        break;
      }
      case 'getState': {
        const pairing = await getPairing();
        const state = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY] ?? {};
        if (pairing) await connect(); // (re)establish if the SW was asleep
        sendResponse({ paired: Boolean(pairing), ...state });
        break;
      }
      case 'respond': {
        chrome.runtime
          .sendMessage({ target: 'offscreen', type: msg.action, attemptId: msg.attemptId })
          .catch(() => {});
        await setState({ incoming: null });
        sendResponse({ ok: true });
        break;
      }

      // ── From the offscreen document ─────────────────────────────────────────
      case 'status':
        await setState({ connected: Boolean(msg.connected) });
        break;
      case 'incoming-lead':
        await setState({ incoming: msg.payload });
        chrome.notifications.create(`lead-${msg.payload.attemptId}`, {
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'New lead',
          message: `${msg.payload.name} from ${msg.payload.source}. Open LeadArrow to accept.`,
          priority: 2,
        });
        break;
      case 'lead-resolved':
        await setState({ incoming: null });
        break;
      case 'open-crm':
        if (msg.url) chrome.tabs.create({ url: msg.url });
        break;
    }
  })();

  return true; // keep the message channel open for async sendResponse
});
