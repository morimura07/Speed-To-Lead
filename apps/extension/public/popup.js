// Popup controller (Phase 0). Reads connection status from the service worker.
const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');

chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
  const connected = Boolean(res?.connected);
  dot.classList.toggle('online', connected);
  statusText.textContent = connected ? 'Connected' : 'Not connected';
});
