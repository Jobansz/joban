// The Morning Paper, drawn exactly as the e-ink board shows it:
// Waveshare ESP32-S3-ePaper-3.97 standing up (portrait): 480 x 800 pixels, black and white,
// with two greys for pictures (the panel's 4-grey mode). The firmware draws the same layout.
// Pages turn with the dial: The paper, Today's work, Right now.
// Parts not wired up yet (weather, shifts, daily corner, now playing) use sample content, marked SAMPLE.
(function () {
  const W = 480, H = 800, M = 22;
  // Literata was drawn for e-readers; Atkinson Hyperlegible for legibility at small sizes.
  const SERIF = 'Literata, Georgia, serif', SANS = '"Atkinson Hyperlegible", Arial, sans-serif';
  const PAGES = ["The paper", "Today's work", "Right now"];

  const SAMPLE = {
    shift: { where: "Timberline", time: "10:00 AM - 6:00 PM" },
    daily: { kind: "WORD OF THE DAY", title: "Sonder", text: "The realisation that each passer-by has a life as vivid and complex as your own." },
    weather: { now: "-6", hi: "-2", lo: "-11", sky: "Light snow", dress: "Parka, toque and gloves. Boots with grip: the walk to class will be icy." },
    playing: { song: "Aruarian Dance", artist: "Nujabes", liked: false },
  };

  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width <= maxW) { line = t; continue; }
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.join(" ").split(/\s+/).length < words.length && lines.length) {
      let last = lines[lines.length - 1];
      while (last && ctx.measureText(last + "...").width > maxW) last = last.replace(/\s*\S+$/, "");
      lines[lines.length - 1] = last + "...";
    }
    return lines;
  }
  function para(ctx, text, x, y, maxW, maxLines, lh) { for (const l of wrap(ctx, text, maxW, maxLines)) { ctx.fillText(l, x, y); y += lh; } return y; }
  const ascii = (s) => String(s || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...");
  const rule = (ctx, y, h = 1) => ctx.fillRect(M, y, W - 2 * M, h);
  const label = (ctx, t, y) => { ctx.font = `bold 14px ${SANS}`; ctx.fillText(t, M, y); };
  const sample = (ctx, x, y) => { ctx.font = `bold 10px ${SANS}`; ctx.lineWidth = 1; const w = ctx.measureText("SAMPLE").width + 8; ctx.strokeRect(x - w, y - 10, w, 13); ctx.fillText("SAMPLE", x - w + 4, y); };
  function statusIcons(ctx, y) { // wifi + battery, top right
    const x = W - M;
    ctx.lineWidth = 1.5; ctx.strokeRect(x - 26, y - 10, 22, 11); ctx.fillRect(x - 4, y - 7, 2, 5); ctx.fillRect(x - 24, y - 8, 15, 7);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 44, y + 1, 4 + i * 4, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); }
    ctx.fillRect(x - 45.5, y - 0.5, 3, 3);
  }
  function footer(ctx, page) {
    rule(ctx, H - 40);
    ctx.font = `14px ${SANS}`; ctx.fillText(page === 2 ? "Turn: skip  -  Press: like" : "Turn the dial for more", M, H - 16);
    for (let i = 0; i < PAGES.length; i++) {
      const x = W - M - (PAGES.length - 1 - i) * 18 - 5;
      ctx.beginPath(); ctx.arc(x, H - 21, 5, 0, Math.PI * 2);
      if (i === page) ctx.fill(); else { ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  }

  // ---- page 1: the paper ----
  function paper(ctx, ed) {
    ctx.font = `bold 40px ${SERIF}`; ctx.fillText("The Paper", M, 58);
    statusIcons(ctx, 30);
    rule(ctx, 72, 3); rule(ctx, 78);
    ctx.font = `bold 14px ${SANS}`; ctx.fillText(ascii((ed.date || "").toUpperCase()), M, 100);
    ctx.textAlign = "right"; ctx.font = `14px ${SANS}`; ctx.fillText(ed.updated ? "Printed " + ed.updated : "", W - M, 100); ctx.textAlign = "left";
    ctx.font = `bold 30px ${SERIF}`;
    let y = para(ctx, ascii(ed.headline || "No edition yet"), M, 146, W - 2 * M, 2, 36);
    ctx.font = `20px ${SERIF}`;
    y = para(ctx, ascii(ed.summary), M, y + 10, W - 2 * M, 9, 29);
    // shift today
    const sh = ed.shift || SAMPLE.shift;
    y = Math.max(y + 14, 470);
    rule(ctx, y - 6);
    label(ctx, "WORK TODAY", y + 18); if (!ed.shift) sample(ctx, W - M, y + 17);
    ctx.font = `bold 22px ${SERIF}`; ctx.fillText(ascii(sh.where), M, y + 48);
    ctx.font = `20px ${SANS}`; ctx.textAlign = "right"; ctx.fillText(ascii(sh.time), W - M, y + 48); ctx.textAlign = "left";
    // the daily corner
    const d = ed.daily || SAMPLE.daily, top = H - 220;
    rule(ctx, top, 3);
    label(ctx, ascii(d.kind), top + 26); if (!ed.daily) sample(ctx, W - M, top + 25);
    ctx.font = `bold italic 34px ${SERIF}`; ctx.fillText(ascii(d.title), M, top + 72);
    ctx.font = `italic 19px ${SERIF}`; para(ctx, ascii(d.text), M, top + 104, W - 2 * M, 3, 26);
  }

  // ---- page 2: today's work ----
  function work(ctx, ed) {
    ctx.font = `bold 36px ${SERIF}`; ctx.fillText("Today's work", M, 56);
    statusIcons(ctx, 30); rule(ctx, 72, 3); rule(ctx, 78);
    let y = 112;
    label(ctx, "IMPORTANT", y);
    const mails = (ed.emails || []).slice(0, 3);
    y += 30;
    if (!mails.length) { ctx.font = `italic 19px ${SERIF}`; ctx.fillText("Nothing waiting on you.", M, y); y += 30; }
    for (const e of mails) {
      ctx.fillRect(M, y - 9, 6, 6);
      ctx.font = `bold 19px ${SERIF}`; ctx.fillText(wrap(ctx, ascii(e.subject), W - 2 * M - 18, 1)[0] || "", M + 18, y);
      ctx.font = `16px ${SANS}`; ctx.fillText(wrap(ctx, ascii(e.from) + (e.why ? " - " + ascii(e.why) : ""), W - 2 * M - 18, 1)[0] || "", M + 18, y + 22);
      y += 54;
    }
    rule(ctx, y - 12);
    label(ctx, "DUE THIS WEEK", y + 14); y += 44;
    const due = (ed.due || []).slice(0, 5);
    if (!due.length) { ctx.font = `italic 19px ${SERIF}`; ctx.fillText("Nothing due. Enjoy it.", M, y); y += 30; }
    for (const d of due) {
      const m = String(d.when || "").match(/^(\w{3}),?\s+\w+\s+(\d{1,2})/);
      ctx.font = `bold 17px ${SANS}`; ctx.fillText(m ? `${m[1]} ${m[2]}` : "", M, y);
      ctx.font = `17px ${SANS}`; ctx.fillText(wrap(ctx, ascii((d.course ? d.course + ": " : "") + d.title), W - 2 * M - 70, 1)[0] || "", M + 70, y);
      y += 30;
    }
    rule(ctx, y - 8);
    label(ctx, "TO DO", y + 18); y += 48;
    // to-dos that just repeat a deadline are left out: the list above already has them
    const dueWords = (ed.due || []).map((d) => String(d.title).toLowerCase().split(/\W+/).filter((w) => w.length > 4));
    const todos = (ed.todos || []).filter((t) => !dueWords.some((ws) => ws.filter((w) => t.toLowerCase().includes(w)).length >= 2)).slice(0, 5);
    if (!todos.length) { ctx.font = `italic 19px ${SERIF}`; ctx.fillText("Nothing else on the list.", M, y); }
    for (const t of todos) {
      if (y > H - 60) break;
      ctx.lineWidth = 2; ctx.strokeRect(M, y - 14, 15, 15);
      ctx.font = `17px ${SANS}`; ctx.fillText(wrap(ctx, ascii(t), W - 2 * M - 26, 1)[0] || "", M + 26, y);
      y += 32;
    }
  }

  // ---- page 3: right now ----
  function nextAlarm(ed) {
    const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], now = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      const v = (ed.alarm || {})[keys[d.getDay()]];
      if (!v || v === "off") continue;
      const [h, m] = v.split(":").map(Number); d.setHours(h, m, 0, 0);
      if (d > now) return d;
    }
    return null;
  }
  const hm = (d) => `${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")}`;
  function now(ctx, ed, artBox) {
    const t = new Date();
    statusIcons(ctx, 30);
    ctx.font = `bold 96px ${SERIF}`; const tw = ctx.measureText(hm(t)).width;
    ctx.fillText(hm(t), M - 4, 120);
    ctx.font = `bold 26px ${SERIF}`; ctx.fillText(t.getHours() < 12 ? "AM" : "PM", M + tw + 6, 120);
    const al = nextAlarm(ed);
    ctx.textAlign = "right";
    ctx.font = `bold 13px ${SANS}`; ctx.fillText("ALARM", W - M, 72);
    ctx.font = `bold 22px ${SANS}`; ctx.fillText(al ? hm(al) + (al.getHours() < 12 ? " AM" : " PM") : "OFF", W - M, 98);
    ctx.font = `14px ${SANS}`; ctx.fillText(t.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }).toUpperCase(), W - M, 120);
    ctx.textAlign = "left";
    rule(ctx, 142, 3);
    // weather and what to wear
    const w = ed.weather || SAMPLE.weather;
    label(ctx, "WEATHER  -  PRINCE GEORGE", 170); if (!ed.weather) sample(ctx, W - M, 169);
    ctx.font = `bold 44px ${SERIF}`; ctx.fillText(`${w.now}°`, M, 220);
    ctx.font = `18px ${SANS}`; ctx.fillText(`${ascii(w.sky)}  -  H ${w.hi}°  L ${w.lo}°`, M + 96, 212);
    ctx.font = `italic 18px ${SERIF}`; para(ctx, ascii(w.dress), M, 252, W - 2 * M, 2, 24);
    rule(ctx, 302);
    // now playing
    const p = ed.playing || SAMPLE.playing;
    label(ctx, "NOW PLAYING", 330); if (!ed.playing) sample(ctx, W - M, 329);
    const S = 300, ax = (W - S) / 2, ay = 348;
    artBox.push([ax, ay, S, S]);
    ctx.lineWidth = 2; ctx.strokeRect(ax - 1, ay - 1, S + 2, S + 2);
    ctx.font = `bold 34px ${SANS}`; ctx.fillText("<", M, ay + S / 2 + 12); ctx.textAlign = "right"; ctx.fillText(">", W - M, ay + S / 2 + 12);
    ctx.textAlign = "center";
    ctx.font = `bold 21px ${SERIF}`; ctx.fillText(wrap(ctx, ascii(p.song), W - 2 * M, 1)[0] || "", W / 2, ay + S + 30);
    ctx.font = `16px ${SANS}`; ctx.fillText(ascii(p.artist), W / 2, ay + S + 52);
    ctx.textAlign = "left";
    heart(ctx, W / 2, ay + S + 72, p.liked);
  }
  function heart(ctx, x, y, filled) {
    ctx.beginPath(); ctx.moveTo(x, y + 14);
    ctx.bezierCurveTo(x - 20, y + 2, x - 12, y - 10, x, y - 2);
    ctx.bezierCurveTo(x + 12, y - 10, x + 20, y + 2, x, y + 14);
    ctx.lineWidth = 2; if (filled) ctx.fill(); else ctx.stroke();
  }
  // a stand-in cover, until Spotify is wired up: soft shapes that show off the grey dithering
  function sampleArt(ctx, [x, y, s]) {
    const g = ctx.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, "#d8d8d8"); g.addColorStop(1, "#3a3a3a");
    ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
    const r = ctx.createRadialGradient(x + s * .62, y + s * .4, 4, x + s * .62, y + s * .4, s * .34); r.addColorStop(0, "#fff"); r.addColorStop(1, "#555");
    ctx.fillStyle = r; ctx.beginPath(); ctx.arc(x + s * .62, y + s * .4, s * .3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.fillRect(x, y + s * .78, s, s * .22);
    ctx.fillStyle = "#000";
  }

  // draw a page, then make it look like the panel: pure black/white text, 4-grey dithered pictures
  function draw(canvas, ed, page) {
    const ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#000"; ctx.strokeStyle = "#000"; ctx.textBaseline = "alphabetic";
    ed = ed || {};
    const art = [];
    [paper, work, (c, e) => now(c, e, art)][page](ctx, ed);
    footer(ctx, page);
    for (const box of art) sampleArt(ctx, box);
    const img = ctx.getImageData(0, 0, W, H), p = img.data;
    const inArt = (x, y) => art.some(([ax, ay, s]) => x >= ax && x < ax + s && y >= ay && y < ay + s);
    const lum = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) lum[i] = p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v;
      if (inArt(x, y)) { // Floyd-Steinberg to the panel's 4 greys
        const old = lum[i]; v = Math.max(0, Math.min(255, Math.round(old / 85) * 85)); const e = old - v;
        if (x + 1 < W) lum[i + 1] += e * 7 / 16;
        if (y + 1 < H) { if (x) lum[i + W - 1] += e * 3 / 16; lum[i + W] += e * 5 / 16; if (x + 1 < W) lum[i + W + 1] += e / 16; }
      } else v = lum[i] < 190 ? 0 : 255;
      p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v; p[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const fontsReady = document.fonts ? Promise.all([
    "bold 40px Literata", "20px Literata", "italic 18px Literata", "bold italic 34px Literata", "17px \"Atkinson Hyperlegible\"", "bold 14px \"Atkinson Hyperlegible\"",
  ].map((f) => document.fonts.load(f))).catch(() => {}) : Promise.resolve();
  // the e-ink full refresh: a black flash, then the new page
  function refresh(canvas, ed, page, flash) {
    if (!flash) { draw(canvas, ed, page); fontsReady.then(() => draw(canvas, ed, page)); return; }
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    setTimeout(() => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }, 180);
    setTimeout(() => fontsReady.then(() => draw(canvas, ed, page)), 380);
  }
  window.Eink = { W, H, PAGES, draw, refresh };
})();
