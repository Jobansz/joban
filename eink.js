// The Morning Paper, drawn exactly as the e-ink board shows it:
// Waveshare ESP32-S3-ePaper-3.97, 800 x 480 pixels, black and white only, landscape.
// The firmware draws the same layout (same pixel positions), so this is the real form factor.
// Pages turn with the rotary switch on the board: Front page, Mail, Alarm.
(function () {
  const W = 800, H = 480, M = 26;
  const SERIF = 'Georgia, "Times New Roman", serif', SANS = '"Helvetica Neue", Arial, sans-serif';
  const PAGES = ["Front page", "Mail", "Alarm"];

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
    const used = lines.join(" ").split(/\s+/).length;
    if (used < words.length && lines.length) { // ran out of room: end with an ellipsis
      let last = lines[lines.length - 1];
      while (last && ctx.measureText(last + "...").width > maxW) last = last.replace(/\s*\S+$/, "");
      lines[lines.length - 1] = last + "...";
    }
    return lines;
  }
  function fit(ctx, text, maxW) {
    let t = String(text || "");
    if (ctx.measureText(t).width <= maxW) return t;
    while (t && ctx.measureText(t + "...").width > maxW) t = t.slice(0, -1);
    return t.trimEnd() + "...";
  }
  const ascii = (s) => String(s || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...");

  function masthead(ctx, ed, page) {
    ctx.font = `bold 30px ${SERIF}`; ctx.textBaseline = "alphabetic";
    ctx.fillText("THE MORNING PAPER", M, 46);
    ctx.font = `13px ${SANS}`; ctx.textAlign = "right";
    ctx.fillText(ascii((ed.date || "").toUpperCase()), W - M, 30);
    ctx.fillText(page === 0 ? (ed.updated ? "PRINTED " + ed.updated : "") : PAGES[page].toUpperCase(), W - M, 48);
    ctx.textAlign = "left";
    ctx.fillRect(M, 58, W - 2 * M, 3); ctx.fillRect(M, 64, W - 2 * M, 1);
  }
  function footer(ctx, ed, page) {
    ctx.fillRect(M, H - 34, W - 2 * M, 1);
    ctx.font = `13px ${SANS}`;
    const n = (ed.emails || []).length;
    const left = page === 0 ? (n ? `${n} email${n > 1 ? "s" : ""} waiting  >  turn the dial` : "Inbox clear") : "Turn the dial for more";
    ctx.fillText(left, M, H - 13);
    for (let i = 0; i < PAGES.length; i++) { // page dots
      const x = W - M - (PAGES.length - 1 - i) * 18 - 5;
      ctx.beginPath(); ctx.arc(x, H - 18, 5, 0, Math.PI * 2);
      if (i === page) ctx.fill(); else { ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  }
  function front(ctx, ed) {
    ctx.font = `bold 38px ${SERIF}`;
    let y = 108;
    for (const l of wrap(ctx, ascii(ed.headline || "No edition yet"), W - 2 * M, 2)) { ctx.fillText(l, M, y); y += 42; }
    ctx.font = `19px ${SERIF}`; y += 2;
    for (const l of wrap(ctx, ascii(ed.summary), W - 2 * M, 2)) { ctx.fillText(l, M, y); y += 25; }
    const top = Math.max(y + 10, 214), mid = W / 2;
    ctx.fillRect(M, top - 14, W - 2 * M, 1);
    ctx.fillRect(mid, top, 1, H - 48 - top);
    // left: due this week
    ctx.font = `bold 13px ${SANS}`; ctx.fillText("DUE THIS WEEK", M, top + 12);
    let ly = top + 40;
    const due = (ed.due || []).slice(0, 5);
    if (!due.length) { ctx.font = `italic 17px ${SERIF}`; ctx.fillText("Nothing due. Enjoy it.", M, ly); }
    for (const d of due) {
      if (ly > H - 60) break;
      // "Wed, Nov 25 8:00 AM" -> "Wed 25"
      const m = String(d.when || "").match(/^(\w{3}),?\s+\w+\s+(\d{1,2})/);
      ctx.font = `bold 15px ${SANS}`; ctx.fillText(m ? `${m[1]} ${m[2]}` : ascii(d.when).slice(0, 7), M, ly);
      ctx.font = `17px ${SERIF}`;
      ctx.fillText(fit(ctx, ascii((d.course ? d.course + ": " : "") + d.title), mid - M - 20 - 66), M + 66, ly);
      ly += 30;
    }
    // right: to do, with tick boxes
    ctx.font = `bold 13px ${SANS}`; ctx.fillText("TO DO", mid + 22, top + 12);
    let ry = top + 40;
    const todos = (ed.todos || []).slice(0, 6);
    if (!todos.length) { ctx.font = `italic 17px ${SERIF}`; ctx.fillText("Nothing on the list.", mid + 22, ry); }
    for (const t of todos) {
      if (ry > H - 60) break;
      ctx.lineWidth = 2; ctx.strokeRect(mid + 22, ry - 13, 14, 14);
      ctx.font = `17px ${SERIF}`; ctx.fillText(fit(ctx, ascii(t), W - M - (mid + 46)), mid + 46, ry);
      ry += 30;
    }
  }
  function mail(ctx, ed) {
    const list = (ed.emails || []).slice(0, 5);
    let y = 108;
    if (!list.length) { ctx.font = `italic 28px ${SERIF}`; ctx.fillText("Nothing waiting on you.", M, 160); return; }
    for (const e of list) {
      ctx.font = `bold 20px ${SERIF}`; ctx.fillText(fit(ctx, ascii(e.subject), W - 2 * M), M, y);
      ctx.font = `15px ${SANS}`; ctx.fillText(fit(ctx, ascii(e.from) + (e.why ? "  -  " + ascii(e.why) : ""), W - 2 * M), M, y + 22);
      y += 66; if (y > H - 50) break;
      ctx.fillRect(M, y - 26, W - 2 * M, 1);
    }
  }
  function alarm(ctx, ed) {
    const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], names = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const now = new Date(); let next = null;
    for (let i = 0; i < 8 && !next; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      const v = (ed.alarm || {})[keys[d.getDay()]];
      if (!v || v === "off") continue;
      const [h, m] = v.split(":").map(Number); d.setHours(h, m, 0, 0);
      if (d > now) next = { d, v, day: i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : names[d.getDay()] };
    }
    ctx.textAlign = "center";
    ctx.font = `bold 14px ${SANS}`; ctx.fillText(next ? "NEXT ALARM  -  " + next.day : "NO ALARM SET", W / 2, 140);
    if (next) {
      const h = next.d.getHours(), t = `${((h + 11) % 12) + 1}:${String(next.d.getMinutes()).padStart(2, "0")}`;
      ctx.font = `bold 150px ${SERIF}`; const tw = ctx.measureText(t).width;
      ctx.font = `bold 36px ${SERIF}`; const aw = ctx.measureText("AM").width, x0 = W / 2 - (tw + 14 + aw) / 2;
      ctx.textAlign = "left";
      ctx.font = `bold 150px ${SERIF}`; ctx.fillText(t, x0, 300);
      ctx.font = `bold 36px ${SERIF}`; ctx.fillText(h < 12 ? "AM" : "PM", x0 + tw + 14, 300);
      ctx.textAlign = "center";
    }
    const c = ed.chime || {};
    ctx.font = `17px ${SERIF}`;
    ctx.fillText(`Chime: ${c.sound || "bells"}  ·  volume ${c.volume ?? 6}  ·  snooze ${ed.snooze_minutes || 9} min`.replace("·", "-").replace("·", "-"), W / 2, 372);
    ctx.textAlign = "left";
  }

  // draw a page, then force every pixel to pure black or white like the real panel
  function draw(canvas, ed, page) {
    const ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#000"; ctx.strokeStyle = "#000";
    ed = ed || {};
    masthead(ctx, ed, page);
    [front, mail, alarm][page](ctx, ed);
    footer(ctx, ed, page);
    const img = ctx.getImageData(0, 0, W, H), p = img.data;
    for (let i = 0; i < p.length; i += 4) { const v = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11 < 150 ? 0 : 255; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
  }
  // the e-ink full refresh: a black flash, then the new page
  function refresh(canvas, ed, page, flash) {
    if (!flash) return draw(canvas, ed, page);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    setTimeout(() => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }, 180);
    setTimeout(() => draw(canvas, ed, page), 380);
  }
  window.Eink = { W, H, PAGES, draw, refresh };
})();
