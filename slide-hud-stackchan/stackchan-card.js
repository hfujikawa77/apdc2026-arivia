// Stack-chan card: shows what the robot does on the current slide (expression, motion, LED).
// It reads the same data-stackchan-* attributes that stackchan-bridge.js sends, so the card and the robot agree.
// Shown on every slide. data-stk-card="off" on a <section> hides it on that slide.
// ?edit: drag the card to move it (saved per viewer in localStorage). Double-click to reset.
// ?reset: forget the saved position. Without ?edit the card ignores the pointer, so it never gets in the way.
(function () {
  const MOTION = { nod: 'うなずき', shake: 'いやいや', spin: '一回転', none: 'なし' };
  // same names and order as the firmware (examples/HermesLLM/src/main.cpp slide_apply_tick)
  const EXPR = { neutral: '普通', happy: 'うれしい', doubt: '疑い', sad: '悲しい', angry: '怒り', sleepy: '眠い' };
  const CYCLE = ['neutral', 'happy', 'doubt', 'sad', 'angry', 'sleepy'];  // used when no attribute: by indexh, every 6 slides
  const LAYOUT_KEY = 'stk-card-layout';
  const params = new URLSearchParams(location.search);
  let lastHadLed = false;   // the bridge clears a held LED on the next slide; mirror that here

  const card = document.createElement('div');
  card.className = 'stk-card';
  card.innerHTML = `
    <div class="row"><span class="lbl">表情</span><span class="val" id="stk-expr">--</span></div>
    <div class="row"><span class="lbl">動き</span><span class="val" id="stk-motion">--</span></div>
    <div class="row"><span class="lbl">LED</span><span class="dot" id="stk-dot"></span><span class="val" id="stk-led">--</span></div>`;

  function ledOf(el) {
    const attr = el.dataset.stackchanLed;
    if (!attr) return null;
    try { return attr.trim().startsWith('{') ? JSON.parse(attr) : { preset: attr.trim() }; }
    catch (e) { return null; }
  }

  function update() {
    const el = Reveal.getCurrentSlide();
    if (!el) return;
    card.classList.toggle('off', el.dataset.stkCard === 'off');

    const attr = el.dataset.stackchanExpression;
    const exprEl = document.getElementById('stk-expr');
    if (EXPR[attr]) {
      exprEl.textContent = EXPR[attr];
      exprEl.className = 'val';
    } else {
      // no (or unknown) attribute: the firmware shows the per-index cycle, so show what it will show
      const h = Reveal.getIndices().h;
      exprEl.textContent = EXPR[CYCLE[h % 6]] + '（循環）';
      exprEl.className = 'val def';
    }

    const motion = el.dataset.stackchanMotion;
    const motionEl = document.getElementById('stk-motion');
    motionEl.textContent = MOTION[motion] ? MOTION[motion] : 'うなずき（既定）';
    motionEl.className = 'val' + (MOTION[motion] ? '' : ' def');

    const led = ledOf(el);
    const dot = document.getElementById('stk-dot');
    const ledEl = document.getElementById('stk-led');
    if (led) {
      dot.style.background = led.color || 'var(--line)';  // a preset name has no color here: grey dot
      dot.style.display = '';
      ledEl.textContent = led.pattern || led.preset || '';
      ledEl.className = 'val name';
      lastHadLed = true;
    } else if (lastHadLed) {
      dot.style.display = 'none';
      ledEl.textContent = '消灯';
      ledEl.className = 'val def';
      lastHadLed = false;
    } else {
      dot.style.display = 'none';
      ledEl.textContent = '--';
      ledEl.className = 'val def';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const host = document.querySelector('.reveal .slides');
    host.appendChild(card);  // inside .slides: scales with the 1280x720 canvas

    // ---- position: saved per viewer in localStorage (canvas units, like hud.js) ----
    if (params.has('reset')) { try { localStorage.removeItem(LAYOUT_KEY); } catch (e) {} }
    const applyLayout = l => {
      card.style.left = l.left + 'px';
      card.style.top = l.top + 'px';
      card.style.right = 'auto';
      card.style.bottom = 'auto';
    };
    try { const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); if (saved) applyLayout(saved); } catch (e) {}

    if (params.has('edit')) {
      card.classList.add('editable');
      // pointer position in slide-canvas units (the canvas is scaled to fit the window)
      const canvasPoint = e => {
        const r = host.getBoundingClientRect();
        const s = r.width / host.offsetWidth;
        return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
      };
      let drag = null;
      card.addEventListener('pointerdown', e => {
        drag = { p: canvasPoint(e), left: card.offsetLeft, top: card.offsetTop };
        card.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      card.addEventListener('pointermove', e => {
        if (!drag) return;
        const p = canvasPoint(e);
        applyLayout({ left: drag.left + p.x - drag.p.x, top: drag.top + p.y - drag.p.y });
      });
      const endDrag = () => {
        if (!drag) return;
        drag = null;
        try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ left: card.offsetLeft, top: card.offsetTop })); } catch (e) {}
      };
      card.addEventListener('pointerup', endDrag);
      card.addEventListener('pointercancel', endDrag);
      card.addEventListener('dblclick', () => {
        ['left', 'top', 'right', 'bottom'].forEach(k => { card.style[k] = ''; });
        try { localStorage.removeItem(LAYOUT_KEY); } catch (e) {}
      });
    }

    Reveal.on('ready', update);
    Reveal.on('slidechanged', update);
    if (Reveal.isReady && Reveal.isReady()) update();
  });
})();
