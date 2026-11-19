/* Swarm cursors — the page starts empty and a crew of agent cursors
   builds it piece by piece, then leaves. Rebuild replays it.
   Respects prefers-reduced-motion (page just shows normally). */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { root.classList.remove('sw-pre'); return; }

  const N = innerWidth < 760 ? 10 : 18;
  const FAILSAFE_MS = 35000;
  const BLUE = '#3d7bff';
  const COLORS = ['#3d7bff', '#d9452f', '#9fd36b', '#f2b134', '#ff7aa2', '#7fd3e6', '#b48cff', '#f4efe6'];

  const style = document.createElement('style');
  style.textContent = `
  .sw-layer{position:absolute;left:0;top:0;width:100%;height:0;pointer-events:none;z-index:900;overflow:hidden}
  .sw-agent{position:absolute;left:0;top:0;width:18px;height:22px;will-change:transform;transition:opacity .35s;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))}
  .sw-agent svg{display:block;overflow:visible}
  .sw-box{position:absolute;border:1.5px solid ${BLUE};transition:opacity .45s;border-radius:1px}
  .sw-box i{position:absolute;width:7px;height:7px;background:#fff;border:1.5px solid ${BLUE}}
  .sw-box i:nth-child(1){left:-4.5px;top:-4.5px}.sw-box i:nth-child(2){right:-4.5px;top:-4.5px}
  .sw-box i:nth-child(3){left:-4.5px;bottom:-4.5px}.sw-box i:nth-child(4){right:-4.5px;bottom:-4.5px}
  .sw-lbl{position:absolute;left:50%;top:100%;margin-top:7px;transform:translateX(-50%);background:${BLUE};color:#fff;font:600 10px/1 Inter,system-ui,sans-serif;padding:3px 6px;border-radius:4px;white-space:nowrap;opacity:0;transition:opacity .25s}
  .sw-hl{position:absolute;background:rgba(61,123,255,.3);border-radius:2px;transition:opacity .45s}
  .sw-guide{position:absolute;background:#ff3b6b;opacity:.7;transition:opacity .5s}
  .sw-bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1000;display:flex;align-items:center;gap:10px;background:rgba(29,29,27,.92);color:#f4efe6;font:500 12px/1 Inter,system-ui,sans-serif;padding:6px 6px 6px 12px;border-radius:99px;box-shadow:0 6px 24px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);white-space:nowrap;transition:opacity .3s}
  .sw-bar b{font-weight:600}
  .sw-dots{display:flex}.sw-dots i{width:10px;height:10px;border-radius:50%;border:1.5px solid #1d1d1b;margin-left:-4px}.sw-dots i:first-child{margin-left:0}
  .sw-bar button{background:rgba(244,239,230,.14);color:#f4efe6;border:0;border-radius:99px;padding:7px 12px;font:inherit;cursor:pointer}
  .sw-bar button:hover{background:rgba(244,239,230,.26)}
  .sw-bar .sw-x{padding:7px 10px}`;
  document.head.appendChild(style);

  const ARROW = c => `<svg width="18" height="22" viewBox="0 0 18 22"><path d="M2 1 L2 17 L6.3 13.2 L9.3 20 L12 18.8 L9.1 12.2 L14.8 12.2 Z" fill="${c}" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
  const IB = 'M5 2 Q9 2 9 5 L9 17 Q9 20 5 20 M13 2 Q9 2 9 5 M9 17 Q9 20 13 20 M6.5 11 H11.5';
  const IBEAM = c => `<svg width="18" height="22" viewBox="0 0 18 22"><path d="${IB}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="${IB}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  // ---- what gets built: containers first, then their contents ----
  const parts = [];
  const add = (el, parent, text) => { const t = { el, parent, text, built: false, claimed: false }; parts.push(t); return t; };
  const isTextEl = el => /^(H1|H2|H3|P|SPAN|A)$/.test(el.tagName) && !el.classList.contains('btn') && !el.classList.contains('chip') || el.classList.contains('display');
  document.querySelectorAll('body > nav, body > section, body > footer').forEach(box => {
    const c = add(box, null, false);
    box.querySelectorAll('.logo, li a, .eyebrow, h1, h2, h3, p, .chip, .btn, .photo, .display, .meta span')
      .forEach(el => add(el, c, isTextEl(el)));
  });

  const setClip = (t, px, py) => {
    const v = `inset(0 ${(1 - px) * 100}% ${(1 - py) * 100}% 0)`;
    t.el.style.clipPath = v; t.el.style.webkitClipPath = v;
  };
  const clearClip = t => { t.el.style.clipPath = ''; t.el.style.webkitClipPath = ''; };
  const pend = t => { t.built = false; t.claimed = false; setClip(t, 0, t.text ? 1 : 0); };
  const finish = t => { t.built = true; t.claimed = false; clearClip(t); };

  // hide everything, then un-hide the page shell
  parts.forEach(pend);
  root.classList.remove('sw-pre');

  const layer = document.createElement('div');
  layer.className = 'sw-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const bar = document.createElement('div');
  bar.className = 'sw-bar';
  bar.innerHTML = `<span class="sw-dots">${COLORS.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join('')}</span>
    <span><b>${N}</b> agents · <b class="sw-n">0</b> / ${parts.length} layers</span>
    <button class="sw-tour" type="button">Rebuild</button><button class="sw-x" type="button" aria-label="Skip animation">×</button>`;
  document.body.appendChild(bar);
  const countEl = bar.querySelector('.sw-n');
  const updateCount = () => { countEl.textContent = parts.filter(t => t.built).length; };

  // ---- state ----
  let active = false, running = false, last = 0, frame = 0, failsafe = 0;
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const pageRect = el => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
  const sizeLayer = () => { layer.style.height = '0px'; layer.style.height = document.documentElement.scrollHeight + 'px'; };

  const agents = Array.from({ length: N }, (_, i) => {
    const node = document.createElement('div');
    node.className = 'sw-agent';
    node.style.opacity = 0;
    layer.appendChild(node);
    const a = { i, c: COLORS[i % COLORS.length], node, x: 0, y: 0, vx: 0, vy: 0, state: 'gone', phase: rand(0, 6.28), shape: '' };
    setShape(a, 'arrow');
    return a;
  });

  function setShape(a, s) {
    if (a.shape === s) return;
    a.shape = s;
    a.node.innerHTML = s === 'arrow' ? ARROW(a.c) : IBEAM(a.c);
    a.hx = s === 'arrow' ? 2 : 9; a.hy = s === 'arrow' ? 1 : 11;
  }

  function spring(a, tx, ty, k, damp, max, dt) {
    a.vx += (tx - a.x) * k * dt; a.vy += (ty - a.y) * k * dt;
    const d = Math.pow(damp, dt); a.vx *= d; a.vy *= d;
    const sp = Math.hypot(a.vx, a.vy); if (sp > max) { a.vx *= max / sp; a.vy *= max / sp; }
    a.x += a.vx * dt; a.y += a.vy * dt;
  }

  const fadeOut = el => { if (!el) return; el.style.opacity = 0; setTimeout(() => el.remove(), 500); };

  function leave(a) {
    setShape(a, 'arrow');
    a.state = 'exit';
    a.tx = scrollX + (Math.random() < .5 ? -60 : innerWidth + 60);
    a.ty = scrollY + rand(0, innerHeight);
  }

  function available() {
    const list = [];
    for (const t of parts) {
      if (t.built || t.claimed) continue;
      if (t.parent && !t.parent.built) continue;
      const r = t.el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 30 || r.top > innerHeight - 60) continue;
      list.push({ t, top: r.top });
    }
    return list.sort((p, q) => p.top - q.top);
  }

  function pick(a, now) {
    setShape(a, 'arrow');
    if (parts.every(t => t.built)) return leave(a);
    const pool = available();
    if (!pool.length) { // nothing in view to build yet: hover around until you scroll
      a.t = null; a.tx = scrollX + rand(40, innerWidth - 40); a.ty = scrollY + rand(60, innerHeight - 100);
      a.state = 'seek'; a.t0 = now; return;
    }
    const t = pool[Math.floor(Math.random() * Math.min(4, pool.length))].t; // roughly top-down
    const r = pageRect(t.el);
    t.claimed = true; a.t = t; a.r = r;
    a.tx = r.x; a.ty = t.text ? r.y + r.h / 2 : r.y;
    a.state = 'seek'; a.t0 = now;
  }

  function beginDraw(a, now) {
    const r = a.r, t = a.t;
    a.x = a.tx; a.y = a.ty; a.vx = a.vy = 0;
    a.ex = r.x + r.w; a.ey = t.text ? r.y + r.h / 2 : r.y + r.h;
    const dist = Math.hypot(a.ex - a.x, a.ey - a.y);
    a.dur = Math.min(1400, Math.max(420, 380 + dist * (t.text ? 1.4 : .7)));
    a.t0 = now; a.state = 'draw';
    a.box = document.createElement('div');
    if (t.text) {
      setShape(a, 'ibeam');
      a.box.className = 'sw-hl';
      Object.assign(a.box.style, { left: r.x + 'px', top: r.y + 'px', height: r.h + 'px', width: '0px' });
    } else {
      a.box.className = 'sw-box';
      a.box.innerHTML = `<i></i><i></i><i></i><i></i><span class="sw-lbl">${Math.round(r.w)} × ${Math.round(r.h)}</span>`;
      Object.assign(a.box.style, { left: r.x + 'px', top: r.y + 'px', width: '0px', height: '0px' });
    }
    layer.appendChild(a.box);
  }

  function addGuide(a) {
    const r = a.r, g = document.createElement('div'); g.className = 'sw-guide';
    if (Math.random() < .5) Object.assign(g.style, { left: '0px', width: '100%', top: r.y + 'px', height: '1px' });
    else Object.assign(g.style, { left: r.x + 'px', width: '1px', top: Math.max(0, r.y - 500) + 'px', height: (r.h + 1000) + 'px' });
    layer.appendChild(g); a.guide = g;
  }

  function release(a) {
    fadeOut(a.box); fadeOut(a.guide); a.box = a.guide = null;
    if (a.t && !a.t.built) a.t.claimed = false;
    a.t = null;
  }

  function update(a, now, time, dt) {
    switch (a.state) {
      case 'pick': pick(a, now); break;
      case 'seek': {
        a.vx += Math.sin(time * 2.3 + a.phase) * .35 * dt; a.vy += Math.cos(time * 1.9 + a.phase) * .35 * dt;
        spring(a, a.tx, a.ty, a.t ? .022 : .008, a.t ? .8 : .9, 32, dt);
        const close = Math.hypot(a.tx - a.x, a.ty - a.y) < 5;
        if (close || now - a.t0 > (a.t ? 1800 : 1200)) { if (a.t) beginDraw(a, now); else a.state = 'pick'; }
        break;
      }
      case 'draw': {
        const p = Math.min(1, (now - a.t0) / a.dur), e = ease(p), r = a.r, t = a.t;
        a.x = a.tx + (a.ex - a.tx) * e; a.y = a.ty + (a.ey - a.ty) * e;
        const px = r.w ? (a.x - r.x) / r.w : 1, py = t.text ? 1 : (r.h ? (a.y - r.y) / r.h : 1);
        setClip(t, px, py);
        a.box.style.width = Math.max(0, a.x - r.x) + 'px';
        if (!t.text) a.box.style.height = Math.max(0, a.y - r.y) + 'px';
        if (p >= 1) {
          finish(t); updateCount();
          a.state = 'hold'; a.holdEnd = now + rand(350, 900);
          const lbl = a.box.querySelector('.sw-lbl'); if (lbl) lbl.style.opacity = 1;
          if (Math.random() < .3) addGuide(a);
        }
        break;
      }
      case 'hold':
        a.x = a.ex + Math.sin(time * 3 + a.phase) * 2.5; a.y = a.ey + Math.cos(time * 2.4 + a.phase) * 2;
        if (now > a.holdEnd) { release(a); a.state = 'pick'; }
        break;
      case 'exit':
        spring(a, a.tx, a.ty, .012, .9, 38, dt);
        if (Math.hypot(a.tx - a.x, a.ty - a.y) < 30) { a.state = 'gone'; a.node.style.opacity = 0; }
        break;
    }
    if (a.state !== 'gone') a.node.style.transform = `translate3d(${a.x - a.hx}px,${a.y - a.hy}px,0)`;
  }

  function loop(now) {
    const dt = Math.min(50, now - (last || now)) / 16.67 || 1; last = now;
    if (++frame % 45 === 0) sizeLayer();
    let alive = false;
    for (const a of agents) { update(a, now, now / 1000, dt); if (a.state !== 'gone') alive = true; }
    if (alive && active) requestAnimationFrame(loop);
    else { running = false; last = 0; if (!alive) { active = false; clearTimeout(failsafe); } }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  function revealAll() { parts.forEach(t => { if (!t.built) finish(t); }); updateCount(); }

  function build() {
    clearTimeout(failsafe);
    agents.forEach(a => { release(a); a.state = 'gone'; });
    parts.forEach(pend); updateCount();
    sizeLayer();
    active = true;
    bar.style.display = ''; bar.style.opacity = 1;
    const br = bar.getBoundingClientRect();
    const sx = scrollX + br.left + br.width / 2, sy = scrollY + br.top;
    agents.forEach((a, k) => {
      a.x = sx + rand(-30, 30); a.y = sy + rand(-10, 10);
      const ang = rand(Math.PI * 1.1, Math.PI * 1.9); a.vx = Math.cos(ang) * rand(8, 16); a.vy = Math.sin(ang) * rand(8, 16);
      a.node.style.opacity = 1; setShape(a, 'arrow');
      a.state = 'wait'; setTimeout(() => { if (a.state === 'wait') a.state = 'pick'; }, k * 70);
    });
    failsafe = setTimeout(() => { revealAll(); agents.forEach(a => { if (a.state !== 'gone') { release(a); leave(a); } }); }, FAILSAFE_MS);
    kick();
  }

  function skip() {
    clearTimeout(failsafe); active = false;
    agents.forEach(a => { release(a); a.state = 'gone'; a.node.style.opacity = 0; });
    revealAll();
    bar.style.opacity = 0; setTimeout(() => { bar.style.display = 'none'; }, 300);
  }

  bar.querySelector('.sw-tour').addEventListener('click', build);
  bar.querySelector('.sw-x').addEventListener('click', skip);
  addEventListener('resize', sizeLayer);
  addEventListener('scroll', () => { if (active) kick(); }, { passive: true });

  setTimeout(build, 350);
})();
