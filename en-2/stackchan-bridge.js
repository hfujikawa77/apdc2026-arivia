// reveal.js plugin: two-way bridge to Stack-chan over its /servo-ws WebSocket.
//   Stack-chan -> reveal.js  {"type":"control","action":"next"|"prev"}   (head swipe)
//   reveal.js  -> Stack-chan {"type":"slide","indexh":3,"indexv":0,"title":"..."}  (every slidechanged)
// Without ?sc=<ip> (or a remembered one) it does nothing, so the deck works as usual.
(function () {
  const HEARTBEAT_MS = 10000; // firmware drops a socket that is silent for 30 s
  const RETRY_MIN_MS = 1000;
  const RETRY_MAX_MS = 5000;

  function resolveHost() {
    const q = new URLSearchParams(location.search).get('sc');
    try {
      if (q) localStorage.setItem('stackchan-host', q);
      return q || localStorage.getItem('stackchan-host') || '';
    } catch (e) {
      return q || '';
    }
  }

  window.StackchanBridge = {
    id: 'stackchan-bridge',
    init(deck) {
      const host = resolveHost();
      if (!host) {
        console.log('[stackchan] no ?sc=<ip>, bridge idle');
        return;
      }
      let ws = null;
      let retryMs = RETRY_MIN_MS;
      let heartbeat = null;

      const send = (obj) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
      };
      // Bubble text: data-stackchan-title on the slide, else its first heading. Kept short to fit one frame.
      const slideTitle = () => {
        const el = deck.getCurrentSlide();
        if (!el) return '';
        const h = el.querySelector('h1,h2,h3,h4');
        let t = (el.dataset.stackchanTitle || (h && h.textContent) || '').replace(/\s+/g, ' ').trim();
        t = Array.from(t).slice(0, 40).join('');
        return t;
      };
      const sendSlide = () => {
        const s = deck.getIndices();
        const msg = { type: 'slide', indexh: s.h, indexv: s.v || 0, title: slideTitle() };
        // data-stackchan-motion="nod|shake|spin|none" on the slide; omitted = nod (firmware default)
        const el = deck.getCurrentSlide();
        const motion = el && el.dataset.stackchanMotion;
        if (['nod', 'shake', 'spin', 'none'].includes(motion)) msg.motion = motion;
        // the firmware accepts up to 190 bytes per frame; drop characters until it fits
        while (new TextEncoder().encode(JSON.stringify(msg)).length > 180 && msg.title) {
          msg.title = Array.from(msg.title).slice(0, -1).join('');
        }
        send(msg);
      };

      function connect() {
        ws = new WebSocket('ws://' + host + '/servo-ws');
        ws.onopen = () => {
          console.log('[stackchan] connected', host);
          retryMs = RETRY_MIN_MS;
          sendSlide();
          heartbeat = setInterval(() => send({ type: 'ping' }), HEARTBEAT_MS);
        };
        ws.onmessage = (ev) => {
          let msg;
          try { msg = JSON.parse(ev.data); } catch (e) { return; }
          if (msg.type !== 'control') return;
          if (msg.action === 'next') deck.next();
          else if (msg.action === 'prev') deck.prev();
        };
        ws.onclose = () => {
          clearInterval(heartbeat);
          setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
        };
        ws.onerror = () => ws.close();
      }

      deck.on('slidechanged', sendSlide);
      connect();
    },
  };
})();
