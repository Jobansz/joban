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
    weather: {
      dress: "Parka, toque and gloves. Boots with grip: the walk to class will be icy.",
      hours: [
        { t: "Now", icon: "cloud", temp: -6 }, { t: "2AM", icon: "night", temp: -7 }, { t: "4AM", icon: "snow", temp: -8, pop: 20 },
        { t: "6AM", icon: "snow", temp: -8, pop: 40 }, { t: "8:57", icon: "sunrise", temp: null }, { t: "11AM", icon: "sun", temp: -4 },
      ],
    },
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
  function footer(ctx, page, sub, count) {
    rule(ctx, H - 40);
    ctx.font = `14px ${SANS}`;
    ctx.fillText(sub != null ? "Turn: next  -  Press: back" : page === 2 ? "Turn: skip  -  Press: like" : "Turn: page  -  Press: read in full", M, H - 16);
    const n = sub != null ? count : PAGES.length, cur = sub != null ? sub : page;
    for (let i = 0; i < n; i++) {
      const x = W - M - (n - 1 - i) * 18 - 5;
      if (sub != null) { ctx.lineWidth = 1.5; i === cur ? ctx.fillRect(x - 5, H - 26, 10, 10) : ctx.strokeRect(x - 4.5, H - 25.5, 9, 9); continue; } // squares inside a full view
      ctx.beginPath(); ctx.arc(x, H - 21, 5, 0, Math.PI * 2);
      if (i === cur) ctx.fill(); else { ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  }

  // ---- full versions: press the dial on page 1 or 2, turn to move between them ----
  function head(ctx, title, kicker) {
    statusIcons(ctx, 30);
    ctx.font = `bold 13px ${SANS}`; ctx.fillText(kicker, M, 34);
    ctx.font = `bold 32px ${SERIF}`; ctx.fillText(title, M, 70);
    rule(ctx, 84, 3);
  }
  // a paragraph that never runs off the page: shrinks a step if it has to
  function fill(ctx, text, y, bottom, font, sizes) {
    for (const size of sizes) {
      ctx.font = font(size); const lh = Math.round(size * 1.45);
      const lines = wrap(ctx, text, W - 2 * M, Math.floor((bottom - y) / lh));
      if (!lines.join(" ").endsWith("...") || size === sizes[sizes.length - 1]) { for (const l of lines) { ctx.fillText(l, M, y); y += lh; } return y; }
    }
  }
  function list(ctx, items, y, draw1) { for (const it of items) { if (y > H - 70) break; y = draw1(it, y); } return y; }
  const DETAILS = {
    0: (ed) => {
      const d = ed.daily || SAMPLE.daily;
      return [
        (ctx) => { head(ctx, "The whole story", ascii((ed.date || "").toUpperCase())); ctx.font = `bold 26px ${SERIF}`;
          const y = para(ctx, ascii(ed.headline || ""), M, 128, W - 2 * M, 3, 32);
          fill(ctx, ascii(ed.summary), y + 16, H - 60, (z) => `${z}px ${SERIF}`, [22, 20, 18]); },
        (ctx) => {
          head(ctx, ascii(d.title), ascii(d.kind));
          if (d.art) { // the whole painting, uncropped, as big as the page allows
            const img = artCache.get(d.art), maxW = W - 2 * M, maxH = 520;
            let w = maxW, h = img ? maxW * img.height / img.width : maxW * 0.7;
            if (h > maxH) { h = maxH; w = img ? h * img.width / img.height : maxW; }
            const x = (W - w) / 2;
            pics.push({ box: [x, 110, w, h], img, contain: true });
            ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, 109.5, w + 1, h + 1);
            ctx.font = `bold italic 22px ${SERIF}`; let y = para(ctx, ascii(d.title), M, 110 + h + 40, W - 2 * M, 2, 28);
            ctx.font = `17px ${SANS}`; ctx.fillText(ascii(d.text), M, y + 4);
            return;
          }
          const yy = fill(ctx, ascii(d.text), 132, H - 140, (z) => `italic ${z}px ${SERIF}`, [26, 22, 19]);
          if (d.prev_answer) { ctx.font = `bold 15px ${SANS}`; ctx.fillText("YESTERDAY'S ANSWER", M, yy + 30); ctx.font = `19px ${SERIF}`; para(ctx, ascii(d.prev_answer), M, yy + 56, W - 2 * M, 2, 24); }
        },
      ];
    },
    1: (ed) => ed.light ? [] : [
      (ctx) => { head(ctx, "Important", "EVERY EMAIL WAITING ON YOU");
        const mails = ed.emails || [];
        if (!mails.length) { ctx.font = `italic 20px ${SERIF}`; ctx.fillText("Nothing waiting on you.", M, 130); return; }
        list(ctx, mails, 126, (e, y) => {
          ctx.font = `bold 20px ${SERIF}`; y = para(ctx, ascii(e.subject), M, y, W - 2 * M, 2, 25);
          ctx.font = `16px ${SANS}`; ctx.fillText(wrap(ctx, ascii(e.from), W - 2 * M, 1)[0] || "", M, y);
          if (e.why) { ctx.font = `italic 17px ${SERIF}`; y = para(ctx, ascii(e.why), M, y + 22, W - 2 * M, 2, 22) - 22; }
          rule(ctx, y + 14); return y + 44;
        }); },
      (ctx) => { head(ctx, "Due this week", "FROM MOODLE");
        const due = ed.due || [];
        if (!due.length) { ctx.font = `italic 20px ${SERIF}`; ctx.fillText("Nothing due. Enjoy it.", M, 130); return; }
        list(ctx, due, 128, (d, y) => {
          ctx.font = `bold 15px ${SANS}`; ctx.fillText(ascii(d.when).toUpperCase() + (d.course ? "  -  " + ascii(d.course).toUpperCase() : ""), M, y);
          ctx.font = `19px ${SERIF}`; y = para(ctx, ascii(d.title), M, y + 26, W - 2 * M, 3, 25);
          rule(ctx, y - 8); return y + 22;
        }); },
      (ctx) => { head(ctx, "To do", "EVERYTHING ON THE LIST");
        const todos = ed.todos || [];
        if (!todos.length) { ctx.font = `italic 20px ${SERIF}`; ctx.fillText("Nothing on the list.", M, 130); return; }
        list(ctx, todos, 132, (t, y) => {
          ctx.lineWidth = 2; ctx.strokeRect(M, y - 15, 16, 16);
          ctx.font = `19px ${SANS}`; ctx.save(); const out = para(ctx, ascii(t), M + 28, y, W - 2 * M - 28, 3, 25); ctx.restore();
          return out + 14;
        }); },
    ],
  };
  const detailCount = (ed, page) => (DETAILS[page] ? DETAILS[page](ed || {}).length : 0);

  // ---- page 1: the paper ----
  function paper(ctx, ed) {
    ctx.font = `bold 40px ${SERIF}`; ctx.fillText(ed.edition === "evening" ? "Evening Paper" : "The Paper", M, 58);
    statusIcons(ctx, 30);
    rule(ctx, 72, 3); rule(ctx, 78);
    ctx.font = `bold 14px ${SANS}`; ctx.fillText(ascii((ed.date || "").toUpperCase()), M, 100);
    ctx.textAlign = "right"; ctx.font = `14px ${SANS}`; ctx.fillText(ed.updated ? "Printed " + ed.updated : "", W - M, 100); ctx.textAlign = "left";
    ctx.font = `bold 30px ${SERIF}`;
    let y = para(ctx, ascii(ed.headline || "No edition yet"), M, 146, W - 2 * M, 2, 36);
    ctx.font = `20px ${SERIF}`;
    y = para(ctx, ascii(ed.summary), M, y + 10, W - 2 * M, 9, 29);
    // shift today
    const known = "shift" in ed, sh = known ? ed.shift : SAMPLE.shift;
    y = Math.max(y + 14, 470);
    rule(ctx, y - 6);
    label(ctx, ed.edition === "evening" ? "WORK TOMORROW" : "WORK TODAY", y + 18); if (!known) sample(ctx, W - M, y + 17);
    if (sh) {
      ctx.font = `bold 22px ${SERIF}`; ctx.fillText(ascii(sh.where), M, y + 48);
      ctx.font = `20px ${SANS}`; ctx.textAlign = "right"; ctx.fillText(ascii(sh.time), W - M, y + 48); ctx.textAlign = "left";
    } else { ctx.font = `italic 20px ${SERIF}`; ctx.fillText("No shift. The day is yours.", M, y + 48); }
    if (ed.shift_tomorrow && ed.edition !== "evening") { ctx.font = `14px ${SANS}`; ctx.fillText("Tomorrow: " + ascii(ed.shift_tomorrow.where) + ", " + ascii(ed.shift_tomorrow.time), M, y + 70); }
    // the daily corner: a word, a prediction, or a piece of art (rotates through the week)
    const d = ed.daily || SAMPLE.daily, top = H - 220;
    rule(ctx, top, 3);
    label(ctx, ascii(d.kind), top + 26); if (!ed.daily || d.sample) sample(ctx, W - M, top + 25);
    if (d.art) { // a 436 x 110 strip, already cropped to shape by the museum's image server
      pics.push({ box: [M, top + 38, W - 2 * M, 110], img: artCache.get(d.art) });
      ctx.lineWidth = 1; ctx.strokeRect(M - 0.5, top + 37.5, W - 2 * M + 1, 111);
      // one caption line under the picture: title, then artist and date
      ctx.font = `bold italic 17px ${SERIF}`;
      const t = wrap(ctx, ascii(d.title), (W - 2 * M) * 0.62, 1)[0] || "";
      ctx.fillText(t, M, top + 172);
      const tw = ctx.measureText(t).width;
      ctx.font = `14px ${SANS}`; ctx.fillText(wrap(ctx, ascii(d.text), W - 2 * M - tw - 14, 1)[0] || "", M + tw + 14, top + 172);
      return;
    }
    ctx.font = `bold italic 34px ${SERIF}`; ctx.fillText(ascii(d.title), M, top + 72);
    ctx.font = `italic 19px ${SERIF}`; para(ctx, ascii(d.text), M, top + 104, W - 2 * M, d.prev_answer ? 2 : 3, 26);
    if (d.prev_answer) { ctx.font = `bold 14px ${SANS}`; ctx.fillText(wrap(ctx, "Yesterday's riddle: " + ascii(d.prev_answer), W - 2 * M, 1)[0] || "", M, top + 172); }
  }

  // ---- page 2: today's work ----
  function work(ctx, ed) {
    if (ed.light) {
      ctx.font = `bold 36px ${SERIF}`; ctx.fillText("Today's work", M, 56);
      statusIcons(ctx, 30); rule(ctx, 72, 3); rule(ctx, 78);
      ctx.font = `bold italic 40px ${SERIF}`; ctx.fillText("Day off.", M, 200);
      ctx.font = `italic 21px ${SERIF}`; para(ctx, "No emails, no deadlines, no list. Everything will still be here tomorrow.", M, 250, W - 2 * M, 4, 30);
      return;
    }
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
  function now(ctx, ed) {
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
    // weather: an hour-by-hour strip, then what to wear
    const w = ed.weather?.hourly ? strip(ed.weather) : SAMPLE.weather;
    label(ctx, "WEATHER  -  " + ascii((ed.weather?.place || "Prince George").split(",")[0]).toUpperCase(), 168); if (!ed.weather) sample(ctx, W - M, 167);
    const hrs = (w.hours || []).slice(0, 6), cw = (W - 2 * M) / Math.max(1, hrs.length);
    ctx.textAlign = "center";
    hrs.forEach((h, i) => {
      const cx = M + cw * i + cw / 2;
      ctx.font = `bold 16px ${SANS}`; ctx.fillText(h.t, cx, 194);
      icon(ctx, h.icon, cx, 222);
      if (h.pop) { ctx.font = `bold 13px ${SANS}`; ctx.fillText(h.pop + "%", cx, 254); }
      ctx.font = h.temp == null ? `bold 15px ${SANS}` : `bold 22px ${SERIF}`;
      ctx.fillText(h.temp == null ? "Sunrise" : `${h.temp}°`, cx, 280);
    });
    ctx.textAlign = "left";
    ctx.font = `italic 18px ${SERIF}`; para(ctx, ascii(w.dress), M, 306, W - 2 * M, 2, 23);
    rule(ctx, 342);
    // now playing
    const p = ed.playing || SAMPLE.playing;
    label(ctx, "NOW PLAYING", 368); if (!ed.playing) sample(ctx, W - M, 367);
    const S = 266, ax = (W - S) / 2, ay = 384;
    pics.push({ box: [ax, ay, S, S], img: p.art ? artCache.get(p.art) : null });
    ctx.lineWidth = 2; ctx.strokeRect(ax - 1, ay - 1, S + 2, S + 2);
    ctx.font = `bold 34px ${SANS}`; ctx.fillText("<", M, ay + S / 2 + 12); ctx.textAlign = "right"; ctx.fillText(">", W - M, ay + S / 2 + 12);
    ctx.textAlign = "center";
    ctx.font = `bold 21px ${SERIF}`; ctx.fillText(wrap(ctx, ascii(p.song), W - 2 * M, 1)[0] || "", W / 2, ay + S + 30);
    ctx.font = `16px ${SANS}`; ctx.fillText(ascii(p.artist), W / 2, ay + S + 52);
    ctx.textAlign = "left";
    heart(ctx, W / 2, ay + S + 72, p.liked);
  }
  // the hour-by-hour strip from the paper's forecast: now, then every 2 hours, with sunrise slotted in
  function strip(wx) {
    const now = new Date(), stamp = (d) => d.toLocaleString("sv-SE", { timeZone: "America/Vancouver" }).slice(0, 13); // "YYYY-MM-DD HH"
    const at = new Map(wx.hourly.map((h) => [h.t.slice(0, 13).replace("T", " "), h]));
    const kind = (h) => { const c = h.code; return c <= 1 ? (h.day ? "sun" : "night") : c <= 48 ? "cloud" : c <= 67 || (c >= 80 && c <= 82) || c >= 95 ? "rain" : c <= 77 || c === 85 || c === 86 ? "snow" : "cloud"; };
    const lbl = (d) => { const h = Number(d.toLocaleString("en-US", { timeZone: "America/Vancouver", hour: "numeric", hour12: false })) % 24; return `${((h + 11) % 12) + 1}${h < 12 ? "AM" : "PM"}`; };
    const n = wx.hours || 6, out = [];
    for (let i = 0; out.length < n && i < 30; i += 2) {
      const d = new Date(now.getTime() + i * 3600000), h = at.get(stamp(d));
      if (!h) continue;
      out.push({ t: i === 0 ? "Now" : lbl(d), icon: kind(h), temp: h.temp, pop: h.pop >= 10 ? h.pop : 0, when: d });
    }
    const sr = (wx.sunrise || []).map((x) => new Date(x + ":00-07:00")).find((d) => d > now && out.length && d < out[out.length - 1].when);
    if (sr) { // swap the slot nearest sunrise for a sunrise marker
      let k = 1; for (let j = 1; j < out.length; j++) if (Math.abs(out[j].when - sr) < Math.abs(out[k].when - sr)) k = j;
      out[k] = { t: sr.toLocaleTimeString("en-US", { timeZone: "America/Vancouver", hour: "numeric", minute: "2-digit", hour12: true }).replace(/ [AP]M/, ""), icon: "sunrise", temp: null };
    }
    return { hours: out, dress: wx.dress || "" };
  }
  // weather icons, drawn in solid black so they read on e-ink
  function cloud(ctx, x, y, k = 1) {
    ctx.beginPath();
    ctx.arc(x - 8 * k, y + 2 * k, 7 * k, 0, Math.PI * 2); ctx.arc(x + 1 * k, y - 4 * k, 9 * k, 0, Math.PI * 2); ctx.arc(x + 10 * k, y + 2 * k, 7 * k, 0, Math.PI * 2);
    ctx.rect(x - 8 * k, y + 2 * k, 18 * k, 7 * k); ctx.fill();
  }
  function sunAt(ctx, x, y, r, rays) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2;
    for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3)); ctx.lineTo(x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7)); ctx.stroke(); }
  }
  function icon(ctx, kind, x, y) {
    if (kind === "sun") return sunAt(ctx, x, y, 8, 8);
    if (kind === "sunrise") {
      ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - 20, 40, 22); ctx.clip(); sunAt(ctx, x, y + 2, 8, 10); ctx.restore();
      ctx.fillRect(x - 16, y + 4, 32, 2);
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 18); ctx.moveTo(x - 4, y - 14); ctx.lineTo(x, y - 18); ctx.lineTo(x + 4, y - 14); ctx.stroke();
      return;
    }
    if (kind === "night") { // moon peeking over a cloud
      ctx.beginPath(); ctx.arc(x + 8, y - 8, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + 11, y - 11, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#000";
      return cloud(ctx, x - 2, y + 2, 0.9);
    }
    cloud(ctx, x, y - 2);
    if (kind === "rain") { ctx.lineWidth = 2; for (const dx of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(x + dx, y + 11); ctx.lineTo(x + dx - 3, y + 18); ctx.stroke(); } }
    if (kind === "snow") for (const dx of [-7, 0, 7]) { ctx.beginPath(); ctx.arc(x + dx, y + 15, 2, 0, Math.PI * 2); ctx.fill(); }
  }
  function heart(ctx, x, y, filled) {
    ctx.beginPath(); ctx.moveTo(x, y + 14);
    ctx.bezierCurveTo(x - 20, y + 2, x - 12, y - 10, x, y - 2);
    ctx.bezierCurveTo(x + 12, y - 10, x + 20, y + 2, x, y + 14);
    ctx.lineWidth = 2; if (filled) ctx.fill(); else ctx.stroke();
  }
  // a stand-in cover, until Spotify is wired up: soft shapes that show off the grey dithering
  function sampleArt(ctx, [x, y, s, hh]) {
    if (hh && hh < s) { ctx.fillStyle = "#bbb"; ctx.fillRect(x, y, s, hh); ctx.fillStyle = "#000"; return; } // art still loading
    const g = ctx.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, "#d8d8d8"); g.addColorStop(1, "#3a3a3a");
    ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
    const r = ctx.createRadialGradient(x + s * .62, y + s * .4, 4, x + s * .62, y + s * .4, s * .34); r.addColorStop(0, "#fff"); r.addColorStop(1, "#555");
    ctx.fillStyle = r; ctx.beginPath(); ctx.arc(x + s * .62, y + s * .4, s * .3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.fillRect(x, y + s * .78, s, s * .22);
    ctx.fillStyle = "#000";
  }

  // pictures are loaded once and kept; the page redraws when one arrives
  const artCache = new Map();
  let pics = [];
  function loadArt(url, onload) {
    if (!url || artCache.has(url)) return;
    const img = new Image(); img.crossOrigin = "anonymous";
    artCache.set(url, null);
    img.onload = () => { artCache.set(url, img); onload(); };
    img.onerror = () => artCache.delete(url);
    // museum pictures come through Bernard so the page is allowed to dither them
    img.src = window.EINK_PROXY && /^https:\/\/www\.artic\.edu\//.test(url) ? window.EINK_PROXY + encodeURIComponent(url) : url;
  }
  // draw a page, then make it look like the panel: pure black/white text, 4-grey dithered pictures
  function draw(canvas, ed, page, sub) {
    const ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#000"; ctx.strokeStyle = "#000"; ctx.textBaseline = "alphabetic";
    ed = ed || {};
    pics = [];
    const views = DETAILS[page] ? DETAILS[page](ed) : null;
    if (sub != null && views) { sub = Math.min(sub, views.length - 1); views[sub](ctx); footer(ctx, page, sub, views.length); }
    else { [paper, work, now][page](ctx, ed); footer(ctx, page); }
    for (const { box: [x, y, w, h], img, contain } of pics) {
      if (!img) { sampleArt(ctx, [x, y, w, h]); continue; }
      if (contain) { ctx.drawImage(img, x, y, w, h); continue; } // the whole picture
      const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s; // cover, centred
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
    }
    const art = pics.map((p) => p.box);
    let img;
    try { img = ctx.getImageData(0, 0, W, H); } catch { return; } // a picture without permission to read: show it undithered
    const p = img.data;
    const inArt = (x, y) => art.some(([ax, ay, s, hh]) => x >= ax && x < ax + s && y >= ay && y < ay + (hh || s));
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
  function refresh(canvas, ed, page, flash, sub) {
    for (const url of [ed && ed.daily && ed.daily.art, ed && ed.playing && ed.playing.art]) loadArt(url, () => draw(canvas, ed, page, sub));
    if (!flash) { draw(canvas, ed, page, sub); fontsReady.then(() => draw(canvas, ed, page, sub)); return; }
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    setTimeout(() => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }, 180);
    setTimeout(() => fontsReady.then(() => draw(canvas, ed, page, sub)), 380);
  }
  async function previewArt(seed) {
    const q = ["hiroshige", "hokusai", "seascape", "winter landscape", "harbor", "mountain landscape", "river landscape", "panorama"][seed % 8];
    const r = await fetch("https://api.artic.edu/api/v1/artworks/search?" + new URLSearchParams({ q, limit: "60", fields: "id,title,artist_title,date_display,image_id,thumbnail,is_public_domain" }));
    const wide = ((await r.json()).data || []).filter((a) => a.is_public_domain && a.image_id && a.thumbnail?.width && a.thumbnail.width / a.thumbnail.height >= 1.35);
    const a = wide[seed % wide.length], ratio = 436 / 110, aspect = a.thumbnail.width / a.thumbnail.height;
    let region;
    if (aspect > ratio) { const w = (ratio / aspect) * 100; region = `pct:${((100 - w) / 2).toFixed(2)},0,${w.toFixed(2)},100`; }
    else { const h = (aspect / ratio) * 100; region = `pct:0,${((100 - h) / 2).toFixed(2)},100,${h.toFixed(2)}`; }
    return { kind: "ART OF THE DAY", title: a.title, text: [a.artist_title, a.date_display].filter(Boolean).join(", "), art: `https://www.artic.edu/iiif/2/${a.image_id}/${region}/843,/0/default.jpg`, sample: true };
  }
  const SAMPLE_DAILY = {
    word: SAMPLE.daily,
    prediction: { kind: "TODAY'S PREDICTION", title: "Fortune favours", text: "Ethics gets finished before lunch. Someone at work asks to swap a shift. You say yes to the second coffee." },
  };
  window.Eink = { W, H, PAGES, draw, refresh, previewArt, SAMPLE_DAILY, detailCount };
})();
