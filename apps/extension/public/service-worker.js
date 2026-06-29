// LeadArrow extension background service worker (Manifest V3).
// Phase 0: lifecycle scaffold only. Phase 4 wires the realtime channel to the
// API and the Twilio Voice SDK so the browser becomes a softphone endpoint.

const STATE = { connected: false };

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LeadArrow] extension installed');
});

chrome.runtime.onStartup?.addListener(() => {
  console.log('[LeadArrow] service worker started');
});

// Simple message bridge the popup can talk to today; expanded in Phase 4.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_STATUS') {
    sendResponse({ connected: STATE.connected });
  }
  return true;
});
