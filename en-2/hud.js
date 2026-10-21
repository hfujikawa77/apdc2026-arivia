// reveal.js-independent HUD widget: a Leaflet map and an attitude / speed / altitude readout,
// fixed in the bottom-right of every slide. Telemetry comes from serve.py (GET /api/telemetry).
// Hidden by default: it appears only with ?hud (map + instruments), ?hud=compact / ?hud=top, or ?demo.
//   ?demo   show a simulated vehicle when no live telemetry arrives (labelled DEMO)
//   ?hud=compact  instruments only (no map), bottom-right;  ?hud=top  the same, top-right
//   ?ghost[=0.5]  fade the whole widget so it reads as background
//   data-hud="off" on a <section> hides the widget on that slide
document.addEventListener('DOMContentLoaded', () => {  // after the deck's inline Reveal.initialize()
  const POLL_MS = 100;
  const STALE_MS = 3000;   // telemetry older than this counts as no link
  const CENTER = [35.6812, 139.7671];  // demo position only
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');                  // used only while no live telemetry arrives
  const FORCE_DEMO = params.get('demo') === 'force'; // ?demo=force: always the simulated vehicle
  if (!params.has('hud') && !params.has('demo')) return;  // off unless asked for in the URL

  const host = document.querySelector('.reveal .slides');
  if (!host || typeof L === 'undefined') return;

  // roll scale along the top of the attitude ball: fixed ticks, a pointer that tilts with the bank (update())
  function rollScale() {
    let svg = '';
    for (const a of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
      const len = a % 30 === 0 ? 8 : 5;
      svg += `<line x1="60" y1="6" x2="60" y2="${6 + len}" stroke="#fff" stroke-width="2" transform="rotate(${a} 60 60)"/>`;
    }
    return svg;
  }

  // compass rose: a tick every 30 degrees and N/E/S/W labels (N in red). Fixed, it does not turn.
  function compassCard() {
    const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    let svg = '';
    for (let a = 0; a < 360; a += 30) {
      const len = a % 90 === 0 ? 8 : 5;
      svg += `<line x1="60" y1="6" x2="60" y2="${6 + len}" stroke="#fff" stroke-width="2" transform="rotate(${a} 60 60)"/>`;
      if (names[a]) svg += `<text x="60" y="28" text-anchor="middle" font-size="13" font-weight="700" fill="${a === 0 ? '#ff5252' : '#fff'}" transform="rotate(${a} 60 60)">${names[a]}</text>`;
    }
    return svg;
  }

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="hud-map" id="hud-map"></div>
    <div class="hud-body">
      <svg class="hud-att" viewBox="0 0 120 120">
        <defs><clipPath id="hud-clip"><circle cx="60" cy="60" r="54"/></clipPath></defs>
        <g clip-path="url(#hud-clip)"><g id="hud-ai">
          <rect x="-60" y="-120" width="240" height="180" fill="#2f6db0"/>
          <rect x="-60" y="60" width="240" height="180" fill="#4c9a3c"/>
          <line x1="-60" y1="60" x2="180" y2="60" stroke="#fff" stroke-width="2"/>
          <line x1="48" y1="48" x2="72" y2="48" stroke="#fff" stroke-width="1.5"/>
          <line x1="42" y1="36" x2="78" y2="36" stroke="#fff" stroke-width="1.5"/>
          <line x1="48" y1="72" x2="72" y2="72" stroke="#fff" stroke-width="1.5"/>
          <line x1="42" y1="84" x2="78" y2="84" stroke="#fff" stroke-width="1.5"/>
        </g></g>
        <circle cx="60" cy="60" r="54" fill="none" stroke="#ddd" stroke-width="2"/>
        ${rollScale()}
        <g id="hud-roll"><path d="M60 3 L56 11 L64 11 Z" fill="#ffb347"/></g>
        <path d="M40 60 L52 60 L60 66 L68 60 L80 60 M60 56 L60 60" stroke="#ffb347" stroke-width="3" fill="none"/>
      </svg>
      <div class="hud-hdg">
        <svg class="hud-compass" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="56" fill="#111" stroke="#ddd" stroke-width="2"/>
          ${compassCard()}
          <g id="hud-card"><path d="M60 8 L82 74 L60 62 L38 74 Z" fill="#ff3b30" fill-opacity=".85"/></g>
          <rect x="38" y="52" width="44" height="16" rx="2" fill="#000" stroke="#ddd"/>
          <text id="hud-hdg" x="60" y="64" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">---</text>
        </svg>
      </div>
      <div class="hud-nums">
        <div><b id="hud-spd">--</b> m/s</div>
        <div><b id="hud-alt">--</b> m ALT</div>
      </div>
    </div>
    <div class="hud-status">
      <span>MODE <b id="hud-mode">--</b></span>
      <span class="hud-arm" id="hud-arm">DISARMED</span>
      <span class="hud-ic" title="Battery"><svg class="ic" viewBox="0 0 24 14"><rect x="1" y="2" width="19" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="21" y="5" width="2" height="4" fill="currentColor"/><rect id="hud-batfill" x="3" y="4" width="15" height="6" fill="currentColor"/></svg> <b id="hud-bat">--</b>%</span>
      <span class="hud-ic" title="Signal (RSSI)"><svg class="ic" viewBox="0 0 24 18"><rect class="bar" data-lvl="1" x="2" y="12" width="3" height="5" fill="currentColor"/><rect class="bar" data-lvl="2" x="7" y="9" width="3" height="8" fill="currentColor"/><rect class="bar" data-lvl="3" x="12" y="6" width="3" height="11" fill="currentColor"/><rect class="bar" data-lvl="4" x="17" y="2" width="3" height="15" fill="currentColor"/></svg> <b id="hud-rssi">--</b>%</span>
      <span class="hud-link none" id="hud-link" title="NO LINK"><svg class="ic" viewBox="0 0 24 24"><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </div>`;
  host.appendChild(hud);
  const layout = params.get('hud');
  if (layout === 'compact' || layout === 'top') hud.classList.add('compact');
  if (layout === 'top') hud.classList.add('top');
  if (params.has('ghost')) {  // opacity from the URL, e.g. ?ghost=0.3 (default 0.5)
    hud.classList.add('ghost');
    hud.style.opacity = params.get('ghost') || '0.5';
  }

  // ---- position and size: saved per viewer in localStorage ----
  // ?edit: drag the widget to move it, drag the corner grip to resize, double-click to reset.
  // Without ?edit the widget ignores the pointer, so it never gets in the way while presenting.
  // ?reset: forget the saved position and size.
  const BASE_WIDTH = hud.classList.contains('compact') ? 220 : 360;
  const LAYOUT_KEY = 'hud-layout';
  const applyLayout = l => {
    hud.style.left = l.left + 'px';
    hud.style.top = l.top + 'px';
    hud.style.right = 'auto';
    hud.style.bottom = 'auto';
    hud.style.zoom = l.zoom;
  };
  const saveLayout = () => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ left: hud.offsetLeft, top: hud.offsetTop, zoom: parseFloat(hud.style.zoom) || 1 })); } catch (e) {}
  };
  if (params.has('reset')) { try { localStorage.removeItem(LAYOUT_KEY); } catch (e) {} }
  try { const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); if (saved) applyLayout(saved); } catch (e) {}

  if (params.has('edit')) {
    hud.classList.add('editable');
    const grip = document.createElement('div');
    grip.className = 'hud-grip';
    hud.appendChild(grip);
    // pointer position in slide-canvas units (the canvas is scaled to fit the window)
    const canvasPoint = e => {
      const r = host.getBoundingClientRect();
      const s = r.width / host.offsetWidth;
      return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
    };
    let drag = null;
    hud.addEventListener('pointerdown', e => {
      const p = canvasPoint(e);
      if (!hud.style.left) applyLayout({ left: hud.offsetLeft, top: hud.offsetTop, zoom: 1 });
      drag = { resizing: e.target === grip, p, left: hud.offsetLeft, top: hud.offsetTop, zoom: parseFloat(hud.style.zoom) || 1 };
      hud.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    hud.addEventListener('pointermove', e => {
      if (!drag) return;
      const p = canvasPoint(e);
      const dx = p.x - drag.p.x;
      const dy = p.y - drag.p.y;
      if (drag.resizing) {
        hud.style.zoom = Math.min(2.5, Math.max(0.5, (BASE_WIDTH * drag.zoom + dx) / BASE_WIDTH));
      } else {
        hud.style.left = (drag.left + dx) + 'px';
        hud.style.top = (drag.top + dy) + 'px';
      }
    });
    const endDrag = () => { if (drag) { saveLayout(); drag = null; } };
    hud.addEventListener('pointerup', endDrag);
    hud.addEventListener('pointercancel', endDrag);
    hud.addEventListener('dblclick', () => {
      ['left', 'top', 'right', 'bottom', 'zoom'].forEach(k => { hud.style[k] = ''; });
      try { localStorage.removeItem(LAYOUT_KEY); } catch (e) {}
    });
  }

  const $ = id => document.getElementById(id);
  const map = L.map('hud-map', {
    zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false
  }).setView(CENTER, 18);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  const marker = L.circleMarker(CENTER, { radius: 6, color: '#ffb347', fillColor: '#ffb347', fillOpacity: 1 }).addTo(map);

  function update(d) {
    $('hud-ai').setAttribute('transform', `rotate(${-d.roll} 60 60) translate(0 ${d.pitch * 1.2})`);
    $('hud-roll').setAttribute('transform', `rotate(${-d.roll} 60 60)`);
    $('hud-spd').textContent = d.spd.toFixed(1);
    $('hud-alt').textContent = Math.round(d.alt);
    $('hud-card').setAttribute('transform', `rotate(${d.hdg} 60 60)`);  // the red marker turns to the heading; N/E/S/W stay fixed
    $('hud-hdg').textContent = String(Math.round(d.hdg) % 360).padStart(3, '0');
    $('hud-mode').textContent = d.mode;
    const batt = Math.max(0, Math.min(100, Math.round(d.batt)));
    $('hud-bat').textContent = batt;
    $('hud-batfill').setAttribute('width', (15 * batt / 100).toFixed(2));
    $('hud-batfill').parentNode.style.color = batt > 50 ? '#4caf50' : batt > 20 ? '#ffb347' : '#ff5252';
    const rssi = d.rssi == null ? null : Math.max(0, Math.min(100, Math.round(d.rssi)));
    $('hud-rssi').textContent = rssi == null ? '--' : rssi;
    const lit = rssi == null ? 0 : Math.ceil(rssi / 25);  // 1 to 4 bars
    hud.querySelectorAll('.bar').forEach(b => { b.style.opacity = +b.dataset.lvl <= lit ? 1 : 0.25; });
    const arm = $('hud-arm');
    arm.textContent = d.armed ? 'ARMED' : 'DISARMED';
    arm.classList.toggle('on', !!d.armed);
    marker.setLatLng([d.lat, d.lon]);
    map.panTo([d.lat, d.lon], { animate: false });
  }

  // simulated vehicle: slow circle with matching heading and attitude (demo only)
  function demoFrame(now) {
    const a = now / 4000;
    return {
      roll: 12 * Math.sin(a), pitch: 6 * Math.sin(a * 0.7), hdg: (a * 57.3) % 360,
      spd: 0.5 + 0.4 * Math.sin(a), alt: 2 + Math.sin(a * 0.5), mode: 'GUIDED', armed: true, batt: 87, rssi: 78,
      lat: CENTER[0] + 0.00005 * Math.sin(a), lon: CENTER[1] + 0.00005 * Math.cos(a)
    };
  }

  function setLink(kind, text) {
    const el = $('hud-link');
    el.className = 'hud-link ' + kind;
    el.title = text;
  }

  async function poll() {
    let d = null;
    try { d = await (await fetch('../api/telemetry', { cache: 'no-store' })).json(); } catch (e) {}
    if (FORCE_DEMO) { update(demoFrame(Date.now())); setLink('demo', 'DEMO'); }
    else if (d && d.t && Date.now() - d.t < STALE_MS) { update(d); setLink('live', 'LIVE'); }
    else if (DEMO) { update(demoFrame(Date.now())); setLink('demo', 'DEMO'); }
    else setLink('none', 'NO LINK');
  }

  // hide on slides marked data-hud="off"; Leaflet needs a size refresh when it reappears
  function syncVisibility() {
    const s = Reveal.getCurrentSlide();
    const off = !!s && s.dataset.hud === 'off';
    hud.classList.toggle('off', off);
    if (!off) map.invalidateSize();
  }
  Reveal.on('ready', syncVisibility);
  Reveal.on('slidechanged', syncVisibility);

  poll();
  setInterval(poll, POLL_MS);
});
