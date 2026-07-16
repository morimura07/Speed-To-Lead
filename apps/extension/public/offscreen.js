// Offscreen document: owns the long-lived Socket.IO connection to the LeadArrow
// API (paired as a rep), relays realtime events to the service worker, and
// plays a ring tone on an incoming lead. `io` is provided by the vendored
// socket.io client loaded in offscreen.html.

/* global io */
let socket = null;
let ringOsc = null;

function send(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function startRing() {
  try {
    stopRing();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 480;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    // Pulse the tone like a ring.
    let on = true;
    const iv = setInterval(() => {
      on = !on;
      gain.gain.value = on ? 0.05 : 0;
    }, 600);
    ringOsc = { osc, ctx, iv };
  } catch {
    /* audio not available — non-fatal */
  }
}

function stopRing() {
  if (!ringOsc) return;
  clearInterval(ringOsc.iv);
  try {
    ringOsc.osc.stop();
    void ringOsc.ctx.close();
  } catch {
    /* ignore */
  }
  ringOsc = null;
}

function connect(url, token) {
  if (socket) socket.disconnect();
  // Polling first so the connection works even if the websocket upgrade is
  // blocked by host permissions; it upgrades to websocket when allowed.
  socket = io(url, { auth: { token }, transports: ['polling', 'websocket'], reconnection: true });

  socket.on('connect', () => send({ type: 'status', connected: true }));
  socket.on('disconnect', () => send({ type: 'status', connected: false }));
  socket.on('connect_error', () => send({ type: 'status', connected: false }));

  socket.on('incoming-lead', (payload) => {
    startRing();
    send({ type: 'incoming-lead', payload });
  });
  socket.on('lead-resolved', ({ attemptId }) => {
    stopRing();
    send({ type: 'lead-resolved', attemptId });
  });
  socket.on('open-crm', ({ url: crmUrl }) => send({ type: 'open-crm', url: crmUrl }));
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.target !== 'offscreen') return;
  switch (msg.type) {
    case 'connect':
      connect(msg.url, msg.token);
      break;
    case 'disconnect':
      stopRing();
      socket?.disconnect();
      socket = null;
      break;
    case 'accept':
      stopRing();
      socket?.emit('accept', { attemptId: msg.attemptId });
      break;
    case 'decline':
      stopRing();
      socket?.emit('decline', { attemptId: msg.attemptId });
      break;
  }
});
