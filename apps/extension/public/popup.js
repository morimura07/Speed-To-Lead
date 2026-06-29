// Popup controller. Renders one of three views based on state from the service
// worker: pair (not yet paired), incoming lead (accept/decline), or idle.
const $ = (id) => document.getElementById(id);

function show(view) {
  for (const v of ['pairView', 'leadView', 'idleView']) $(v).classList.toggle('hidden', v !== view);
}

function render(state) {
  const connected = Boolean(state.connected);
  $('dot').classList.toggle('online', connected);
  $('statusText').textContent = !state.paired ? 'Not paired' : connected ? 'Connected' : 'Connecting…';

  if (!state.paired) {
    show('pairView');
  } else if (state.incoming) {
    $('leadName').textContent = state.incoming.name;
    $('leadMeta').textContent = `from ${state.incoming.source}`;
    show('leadView');
  } else {
    show('idleView');
  }
}

async function refresh() {
  const state = await chrome.runtime.sendMessage({ type: 'getState' }).catch(() => null);
  if (state) render(state);
}

$('pairBtn').addEventListener('click', async () => {
  const code = $('code').value.trim();
  if (!code) return;
  const res = await chrome.runtime.sendMessage({ type: 'pair', code });
  if (res?.ok) refresh();
  else $('pairErr').textContent = res?.error ?? 'Could not pair';
});

$('acceptBtn').addEventListener('click', async () => {
  const state = await chrome.runtime.sendMessage({ type: 'getState' });
  if (state?.incoming) {
    await chrome.runtime.sendMessage({ type: 'respond', action: 'accept', attemptId: state.incoming.attemptId });
    refresh();
  }
});

$('declineBtn').addEventListener('click', async () => {
  const state = await chrome.runtime.sendMessage({ type: 'getState' });
  if (state?.incoming) {
    await chrome.runtime.sendMessage({ type: 'respond', action: 'decline', attemptId: state.incoming.attemptId });
    refresh();
  }
});

$('unpairBtn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'unpair' });
  refresh();
});

// Live updates while the popup is open.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'state-changed') refresh();
});

refresh();
