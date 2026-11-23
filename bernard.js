// "Ask Bernard": the Lounge's doorman, available on every public page.
// He answers from the public notes only (lounge Worker, /ask). The Lounge itself stays members-only.
(() => {
  if (document.getElementById("bnd-bell")) return;
  const API = "https://lounge.jobanxy.workers.dev";

  const css = `
  #bnd-bell { position: fixed; right: 20px; bottom: 20px; z-index: 900; display: flex; align-items: center; gap: 10px; border: 0; cursor: pointer;
    padding: 8px 16px 8px 8px; border-radius: 99px; font: 500 .85rem "Inter", system-ui, sans-serif; color: #efe3cf;
    background: linear-gradient(100deg, #3a1d0e, #5a3019 45%, #3a1d0e); box-shadow: 0 10px 26px rgba(0,0,0,.35), inset 0 0 0 1px rgba(201,164,106,.55);
    transition: transform .2s, box-shadow .2s; }
  #bnd-bell:hover, #bnd-bell:focus-visible { transform: translateY(-2px); outline: none; box-shadow: 0 14px 30px rgba(0,0,0,.4), inset 0 0 0 1px #c9a46a; }
  #bnd-bell .dome { position: relative; width: 30px; height: 30px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fbe8b8, #c49a52 55%, #6c4e22);
    box-shadow: 0 2px 4px rgba(0,0,0,.4); }
  #bnd-bell .dome::after { content: ""; position: absolute; left: 50%; top: 4px; width: 4px; height: 5px; margin-left: -2px; border-radius: 2px; background: #6c4e22; }
  #bnd-bell.ring .dome { animation: bnd-ring .5s; }
  @keyframes bnd-ring { 20% { transform: rotate(-14deg); } 50% { transform: rotate(10deg); } 80% { transform: rotate(-5deg); } }
  #bnd { position: fixed; right: 20px; bottom: 76px; z-index: 901; width: min(370px, calc(100vw - 28px)); max-height: min(560px, calc(100vh - 110px));
    display: flex; flex-direction: column; overflow: hidden; border-radius: 6px; color: #efe3cf; font-family: "Inter", system-ui, sans-serif;
    background:
      radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,200,130,.14), transparent 70%),
      repeating-linear-gradient(90deg, rgba(0,0,0,.14) 0 1px, transparent 1px 5px, rgba(255,230,190,.025) 5px 6px, transparent 6px 13px),
      linear-gradient(100deg, #2c160b, #48250f 35%, #351b0c 65%, #452410);
    box-shadow: 0 30px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(201,164,106,.5); animation: bnd-rise .3s ease both; }
  #bnd[hidden] { display: none; }
  @keyframes bnd-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  #bnd header { display: flex; align-items: center; gap: 12px; padding: 14px 16px 12px; border-bottom: 1px solid rgba(201,164,106,.3); }
  #bnd header .seal { width: 34px; height: 34px; flex: none; border-radius: 50%; display: grid; place-items: center; border: 1px solid #c9a46a;
    font: italic 1.05rem "Fraunces", Georgia, serif; color: #c9a46a; }
  #bnd header b { display: block; font: italic 400 1.25rem/1.1 "Fraunces", Georgia, serif; }
  #bnd header small { font-size: .64rem; letter-spacing: .2em; text-transform: uppercase; color: #c9a46a; }
  #bnd header button { margin-left: auto; background: none; border: 0; color: #a8957c; font-size: 1.3rem; cursor: pointer; padding: 4px 6px; }
  #bnd .talk { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; min-height: 140px; }
  #bnd .talk p { margin: 0; max-width: 90%; line-height: 1.45; font-size: .9rem; }
  #bnd .talk .b { align-self: flex-start; font: italic 1rem/1.45 "Fraunces", Georgia, serif; }
  #bnd .talk .u { align-self: flex-end; padding: 7px 11px; border-radius: 12px 12px 2px 12px; background: rgba(201,164,106,.18); }
  #bnd .talk .err { color: #e39a8f; font-style: normal; font-family: "Inter", sans-serif; font-size: .85rem; }
  #bnd .sugg[hidden] { display: none; }
  #bnd .sugg { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 10px; }
  #bnd .sugg button { font: inherit; font-size: .74rem; color: #efe3cf; background: rgba(0,0,0,.22); border: 1px solid rgba(201,164,106,.35); border-radius: 99px; padding: 5px 10px; cursor: pointer; }
  #bnd .sugg button:hover { border-color: #c9a46a; }
  #bnd form { display: flex; gap: 8px; padding: 10px 14px 12px; border-top: 1px solid rgba(201,164,106,.3); }
  #bnd input { flex: 1; min-width: 0; background: transparent; border: 0; border-bottom: 1px solid #7d6743; color: #efe3cf; font: inherit; font-size: 16px; padding: 7px 2px; outline: none; }
  #bnd input:focus { border-color: #c9a46a; }
  #bnd form button { background: none; color: #c9a46a; border: 1px solid #c9a46a; padding: 7px 14px; font: inherit; font-size: .7rem; letter-spacing: .22em; text-transform: uppercase; cursor: pointer; }
  #bnd form button:hover { background: #c9a46a; color: #1b0e06; }
  #bnd .pit-link { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 0 10px; padding: 10px 16px 11px; text-decoration: none; color: #efe3cf;
    border-top: 1px solid rgba(201,164,106,.3); background: rgba(180,83,42,.18); }
  #bnd .pit-link small { grid-column: 1; font-size: .62rem; letter-spacing: .22em; text-transform: uppercase; color: #c9a46a; }
  #bnd .pit-link span { grid-column: 1; font: italic 1rem "Fraunces", Georgia, serif; }
  #bnd .pit-link em { grid-column: 2; grid-row: 1 / span 2; font-style: normal; font-size: .72rem; letter-spacing: .12em; color: #c9a46a; }
  #bnd .pit-link:hover { background: rgba(180,83,42,.3); }
  #bnd .lounge-tease { display: block; width: 100%; text-align: left; border: 0; cursor: pointer; padding: 11px 16px 13px; color: #efe3cf;
    background: linear-gradient(180deg, rgba(90,15,22,.55), rgba(58,8,12,.75)); border-top: 1px solid rgba(201,164,106,.3); font: inherit; }
  #bnd .lounge-tease small { display: block; font-size: .62rem; letter-spacing: .22em; text-transform: uppercase; color: #c9a46a; }
  #bnd .lounge-tease span { font: italic 1rem "Fraunces", Georgia, serif; }
  #bnd .lounge-tease .more { display: none; margin-top: 6px; font: .84rem/1.5 "Inter", sans-serif; color: #d9c9b0; }
  #bnd .lounge-tease.open .more { display: block; }
  @media (max-width: 600px) { #bnd-bell { right: 14px; bottom: 14px; } #bnd-bell .label { display: none; } #bnd-bell { padding: 8px; } #bnd { right: 14px; bottom: 64px; } }
  @media (prefers-reduced-motion: reduce) { #bnd, #bnd-bell .dome { animation: none !important; } }`;

  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  const bell = document.createElement("button");
  bell.id = "bnd-bell"; bell.setAttribute("aria-label", "Ask Bernard"); bell.setAttribute("aria-expanded", "false");
  bell.innerHTML = '<span class="dome" aria-hidden="true"></span><span class="label">Ask Bernard</span>';

  const box = document.createElement("section");
  box.id = "bnd"; box.hidden = true; box.setAttribute("aria-label", "Ask Bernard");
  box.innerHTML = `
    <header><span class="seal" aria-hidden="true">B</span><div><small>The doorman</small><b>Bernard</b></div><button type="button" aria-label="Close">×</button></header>
    <div class="talk" aria-live="polite"></div>
    <div class="sugg"></div>
    <form autocomplete="off"><input maxlength="300" placeholder="Ask about Joban…" aria-label="Your question"><button type="submit">Ask</button></form>
    <a class="pit-link" href="pit.html"><small>Open to guests</small><span>The Conversation Pit</span><em>Mix your way in →</em></a>
    <button type="button" class="lounge-tease" aria-expanded="false">
      <small>Members only</small><span>What's the Lounge?</span>
      <span class="more">Somewhere on this site is a walnut door. Behind it is Joban's private Lounge, where the real work happens. Bernard keeps the door, and he's not at liberty to say what's inside. Membership is by invitation, and nobody has been invited.</span>
    </button>`;
  document.body.append(box, bell);

  const talk = box.querySelector(".talk"), input = box.querySelector("input"), sugg = box.querySelector(".sugg");
  let convo = [];
  try { convo = JSON.parse(sessionStorage.getItem("askBernard") || "[]"); } catch {}
  const save = () => { try { sessionStorage.setItem("askBernard", JSON.stringify(convo.slice(-10))); } catch {} };

  function draw(extra) {
    talk.innerHTML = "";
    const lines = convo.length ? convo : [{ role: "assistant", content: "Good evening. I keep the door for Mr. Singh. Ask me anything about him, and I'll tell you what I'm permitted to." }];
    for (const m of lines) { const p = document.createElement("p"); p.className = m.role === "user" ? "u" : "b"; p.textContent = m.content; talk.appendChild(p); }
    if (extra) talk.appendChild(extra);
    talk.scrollTop = talk.scrollHeight;
    sugg.hidden = convo.length > 0;
  }
  sugg.innerHTML = ["What's he building?", "What's his style?", "Where's he from?"].map((q) => `<button type="button">${q}</button>`).join("");
  sugg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => ask(b.textContent)));

  async function ask(q) {
    q = q.trim(); if (!q) return;
    input.value = ""; convo.push({ role: "user", content: q }); save();
    const wait = document.createElement("p"); wait.className = "b"; wait.textContent = "One moment…"; draw(wait);
    try {
      const r = await fetch(API + "/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, history: convo.slice(0, -1) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Bernard has stepped away. Try again shortly.");
      convo.push({ role: "assistant", content: d.answer }); save(); draw();
    } catch (err) {
      convo.pop(); save(); input.value = q;
      const p = document.createElement("p"); p.className = "b err"; p.textContent = err.message; draw(p);
    }
  }

  const open = (on) => {
    box.hidden = !on; bell.setAttribute("aria-expanded", String(on));
    if (on) { bell.classList.remove("ring"); void bell.offsetWidth; bell.classList.add("ring"); draw(); setTimeout(() => input.focus(), 60); }
  };
  bell.addEventListener("click", () => open(box.hidden));
  box.querySelector("header button").addEventListener("click", () => { open(false); bell.focus(); });
  box.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
  const tease = box.querySelector(".lounge-tease");
  tease.addEventListener("click", () => { const o = tease.classList.toggle("open"); tease.setAttribute("aria-expanded", String(o)); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.hidden) open(false); });
})();
