/* Swarm cursors — a little crew of agent cursors that "edit" the page.
   Plays once on load, replay with the Tour button. On desktop the
   swarm then follows your mouse. Respects prefers-reduced-motion. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const N = innerWidth < 760 ? 10 : 18;
  const TOUR_MS = 14000;
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
  const IBEAM = c => `<svg width="18" height="22" viewBox="0 0 18 22"><path d="M5 2 Q9 2 9 5 L9 17 Q9 20 5 20 M13 2 Q9 2 9 5 M9 17 Q9 20 13 20 M6.5 11 H11.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M5 2 Q9 2 9 5 L9 17 Q9 20 5 20 M13 2 Q9 2 9 5 M9 17 Q9 20 13 20 M6.5 11 H11.5" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  const layer = document.createElement('div');
  layer.className = 'sw-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const targets = [...document.querySelectorAll(
    'nav .logo, nav li a, section h1, section h2, section .eyebrow, section p, section .chip, section .btn, section .photo, footer .display'
  )];
  const isText = el => /^(H1|H2|P|A)$/.test(el.tagName) && !el.classList.contains('btn') || el.classList.contains('eyebrow') || el.classList.contains('display');

  // ---- control bar ----
  const bar = document.createElement('div');
  bar.className = 'sw-bar';
  bar.innerHTML = `<span class="sw-dots">${COLORS.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join('')}</span>
    <span><b>${N}</b> agents · <b class="sw-n">0</b> / ${targets.length} layers</span>
    <button class="sw-tour" type="button">Tour</button><button class="sw-x" type="button" aria-label="Turn off cursors">×</button>`;
  document.body.appendChild(bar);
  const countEl = bar.querySelector('.sw-n');

  // ---- state ----
  let enabled = true, touring = false, tourEnd = 0, running = false, last = 0, frame = 0;
  let hasMouse = false, cx = innerWidth / 2, cy = innerHeight / 2;
  const claimed = new Set(), touched = new Set();
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const pageRect = el => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, top: r.top, bottom: r.bottom }; };
  const sizeLayer = () => { layer.style.height = '0px'; layer.style.height = document.documentElement.scrollHeight + 'px'; };

  const agents = Array.from({ length: N }, (_, i) => {
    const node = document.createElement('div');
    node.className = 'sw-agent';
    node.style.opacity = 0;
    layer.appendChild(node);
    const a = { i, c: COLORS[i % COLORS.length], node, x: 0, y: 0, vx: 0, vy: 0, state: 'gone', phase: rand(0, 6.28), R: rand(16, 70), shape: '' };
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

  function fadeOut(el) { if (!el) return; el.style.opacity = 0; setTimeout(() => el.remove(), 500); }

  function idleState(a) {
    setShape(a, 'arrow');
    if (enabled && fine && hasMouse) { a.state = 'swarm'; }
    else { a.state = 'exit'; a.tx = Math.random() < .5 ? -40 : innerWidth + 40; a.ty = scrollY + rand(0, innerHeight); }
  }

  function pick(a, now) {
    if (!touring) return idleState(a);
    const inView = targets.filter(el => { const r = el.getBoundingClientRect(); return r.bottom > 40 && r.top < innerHeight - 70 && r.width > 0; });
    const free = inView.filter(el => !claimed.has(el));
    const pool = free.length ? free : [];
    setShape(a, 'arrow');
    if (!pool.length) { a.el = null; a.tx = scrollX + rand(40, innerWidth - 40); a.ty = scrollY + rand(60, innerHeight - 100); a.state = 'seek'; a.t0 = now; return; }
    const el = pool[Math.floor(Math.random() * pool.length)];
    const r = pageRect(el);
    a.el = el; a.r = r; claimed.add(el);
    a.text = isText(el) && Math.random() < .65;
    a.tx = r.x; a.ty = a.text ? r.y + r.h / 2 : r.y;
    a.state = 'seek'; a.t0 = now;
  }

  function beginDraw(a, now) {
    const r = a.r;
    a.x = a.tx; a.y = a.ty; a.vx = a.vy = 0;
    a.ex = r.x + r.w; a.ey = a.text ? r.y + r.h / 2 : r.y + r.h;
    a.dur = Math.min(1100, Math.max(350, 350 + Math.hypot(a.ex - a.x, a.ey - a.y) * .5));
    a.t0 = now; a.state = 'draw';
    if (a.text) {
      setShape(a, 'ibeam');
      a.box = document.createElement('div'); a.box.className = 'sw-hl';
      Object.assign(a.box.style, { left: r.x + 'px', top: r.y + 'px', height: r.h + 'px', width: '0px' });
    } else {
      a.box = document.createElement('div'); a.box.className = 'sw-box';
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
    if (a.el) claimed.delete(a.el); a.el = null;
  }

  function update(a, now, t, dt) {
    switch (a.state) {
      case 'pick': pick(a, now); break;
      case 'seek': {
        a.vx += Math.sin(t * 2.3 + a.phase) * .35 * dt; a.vy += Math.cos(t * 1.9 + a.phase) * .35 * dt;
        spring(a, a.tx, a.ty, .022, .8, 32, dt);
        const close = Math.hypot(a.tx - a.x, a.ty - a.y) < 5;
        if (close || now - a.t0 > 1800) { if (a.el) beginDraw(a, now); else a.state = 'pick'; }
        break;
      }
      case 'draw': {
        const p = Math.min(1, (now - a.t0) / a.dur), e = ease(p), r = a.r;
        a.x = a.tx + (a.ex - a.tx) * e; a.y = a.ty + (a.ey - a.ty) * e;
        a.box.style.width = Math.max(0, a.x - r.x) + 'px';
        if (!a.text) a.box.style.height = Math.max(0, a.y - r.y) + 'px';
        if (p >= 1) {
          a.state = 'hold'; a.t0 = now; a.holdEnd = now + rand(700, 1500);
          const lbl = a.box.querySelector('.sw-lbl'); if (lbl) lbl.style.opacity = 1;
          if (Math.random() < .35) addGuide(a);
          touched.add(a.el); countEl.textContent = touched.size;
        }
        break;
      }
      case 'hold':
        a.x = a.ex + Math.sin(t * 3 + a.phase) * 2.5; a.y = a.ey + Math.cos(t * 2.4 + a.phase) * 2;
        if (now > a.holdEnd) { release(a); a.state = 'pick'; }
        break;
      case 'swarm': {
        if (touring) { a.state = 'pick'; break; }
        if (!hasMouse || !enabled) { idleState(a); break; }
        const ang = t * (.8 + (a.i % 5) * .12) + a.phase;
        spring(a, cx + scrollX + Math.cos(ang) * a.R, cy + scrollY + Math.sin(ang) * a.R * .7, .006 + (a.i % 4) * .0025, .88, 40, dt);
        break;
      }
      case 'exit':
        spring(a, a.tx, a.ty, .01, .9, 36, dt);
        if (Math.hypot(a.tx - a.x, a.ty - a.y) < 30) { a.state = 'gone'; a.node.style.opacity = 0; }
        break;
    }
    if (a.state !== 'gone') a.node.style.transform = `translate3d(${a.x - a.hx}px,${a.y - a.hy}px,0)`;
  }

  function loop(now) {
    const dt = Math.min(50, now - (last || now)) / 16.67 || 1; last = now;
    if (touring && now > tourEnd) touring = false;
    if (++frame % 45 === 0) sizeLayer();
    let alive = false;
    for (const a of agents) { update(a, now, now / 1000, dt); if (a.state !== 'gone') alive = true; }
    if (alive && enabled) requestAnimationFrame(loop); else { running = false; last = 0; }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  function startTour() {
    enabled = true; bar.style.opacity = 1;
    sizeLayer(); touched.clear(); countEl.textContent = 0;
    touring = true; tourEnd = performance.now() + TOUR_MS;
    const sx = scrollX + (hasMouse ? cx : innerWidth / 2), sy = scrollY + (hasMouse ? cy : innerHeight - 60);
    agents.forEach((a, k) => {
      if (a.state === 'gone' || a.state === 'exit' || a.state === 'swarm') {
        if (a.state === 'gone') { a.x = sx + rand(-20, 20); a.y = sy + rand(-20, 20); const ang = rand(0, 6.28); a.vx = Math.cos(ang) * rand(6, 14); a.vy = Math.sin(ang) * rand(6, 14); }
        a.node.style.opacity = 1;
        a.state = 'wait'; setTimeout(() => { if (a.state === 'wait') a.state = 'pick'; }, k * 90);
      }
    });
    kick();
  }

  function stopAll() {
    enabled = false; touring = false;
    agents.forEach(a => { release(a); a.state = 'gone'; a.node.style.opacity = 0; });
    bar.style.opacity = 0; setTimeout(() => { bar.style.display = 'none'; }, 300);
  }

  bar.querySelector('.sw-tour').addEventListener('click', startTour);
  bar.querySelector('.sw-x').addEventListener('click', stopAll);
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    cx = e.clientX; cy = e.clientY;
    if (!hasMouse) { hasMouse = true; }
    if (enabled && !touring) {
      agents.forEach(a => { if (a.state === 'gone') { a.x = scrollX + cx + rand(-30, 30); a.y = scrollY + cy + rand(-30, 30); a.vx = a.vy = 0; a.node.style.opacity = 1; a.state = 'swarm'; } });
      kick();
    }
  }, { passive: true });
  addEventListener('resize', sizeLayer);

  const go = () => { sizeLayer(); if (!reduce) setTimeout(startTour, 500); };
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
