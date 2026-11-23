// The Conversation Pit's bar: mix an espresso martini to become a member.
// Shared by pit.html (in front of the wall) and lounge.html (the guest half of the door).
// Usage: PitBar.mount(element, { say(text, isError), onJoin(member, pass), compact })
(function () {
  const API = "https://lounge.jobanxy.workers.dev";

  const css = `
  .pbar { position: relative; border-radius: 4px; overflow: hidden; text-align: left; color: #efe3cf; font-family: "Inter", system-ui, sans-serif;
    box-shadow: 0 30px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(201,164,106,.25); }
  .pbar button { font: inherit; cursor: pointer; }
  .pbar .pb-back { padding: 22px 18px 0; background: radial-gradient(ellipse 70% 80% at 50% 0%, rgba(255,190,110,.12), transparent 70%), linear-gradient(180deg, #3a080c, #4b0b11 60%, #3a080c); }
  .pbar .pb-shelf { display: flex; justify-content: center; align-items: flex-end; flex-wrap: wrap; gap: 12px 14px; min-height: 150px; }
  .pbar .pb-board { height: 10px; margin: 0 -18px; background: linear-gradient(180deg, #6b3f22, #3a1f0f); box-shadow: 0 6px 10px rgba(0,0,0,.4); }
  .pbar .pb-bottle { display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; color: inherit; padding: 0 2px 8px; transition: transform .2s; }
  .pbar .pb-bottle:hover, .pbar .pb-bottle:focus-visible { transform: translateY(-6px); outline: none; }
  .pbar .pb-bottle svg { width: 46px; height: 112px; filter: drop-shadow(0 6px 6px rgba(0,0,0,.45)); }
  .pbar .pb-bottle span, .pbar .pb-tool span { font-size: .6rem; letter-spacing: .12em; text-transform: uppercase; color: #a8957c; white-space: nowrap; }
  .pbar .pb-bottle.used span { color: #c9a46a; }
  .pbar .pb-counter { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 16px; padding: 22px 18px 18px;
    background: repeating-linear-gradient(90deg, rgba(0,0,0,.14) 0 1px, transparent 1px 5px, rgba(255,230,190,.03) 5px 6px, transparent 6px 13px), linear-gradient(180deg, #5e2a14, #48210f); }
  .pbar .pb-tools { display: flex; gap: 14px; align-items: flex-end; justify-content: flex-end; flex-wrap: wrap; }
  .pbar .pb-tool { display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; color: inherit; }
  .pbar .pb-tool:disabled { opacity: .35; cursor: default; }
  .pbar .pb-tool svg { transition: transform .2s; filter: drop-shadow(0 6px 6px rgba(0,0,0,.45)); }
  .pbar .pb-tool:hover:not(:disabled) svg { transform: translateY(-4px); }
  .pbar .pb-tool.shaking svg { animation: pb-shake .12s linear infinite; }
  @keyframes pb-shake { 0%,100% { transform: rotate(-10deg) translateY(-6px); } 50% { transform: rotate(10deg) translateY(2px); } }
  .pbar .pb-glass { display: flex; justify-content: center; }
  .pbar .pb-recipe { font-size: .78rem; color: #a8957c; min-height: 3em; }
  .pbar .pb-recipe b { color: #efe3cf; font-weight: 500; }
  .pbar .pb-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 12px 18px 16px; background: #2c140a; border-top: 1px solid rgba(201,164,106,.25); }
  .pbar .pb-serve { background: #c9a46a; color: #0f0b09; border: 1px solid #c9a46a; padding: 10px 20px; letter-spacing: .22em; text-transform: uppercase; font-size: .7rem; }
  .pbar .pb-serve:disabled { opacity: .35; cursor: default; }
  .pbar .pb-link { background: none; border: 0; color: #a8957c; font-size: .7rem; letter-spacing: .2em; text-transform: uppercase; }
  .pbar .pb-link:hover { color: #c9a46a; }
  .pbar.compact .pb-bottle svg { width: 34px; height: 84px; }
  .pbar.compact .pb-shelf { gap: 8px 8px; min-height: 110px; }
  .pbar.compact .pb-counter { grid-template-columns: 1fr auto; }
  .pbar.compact .pb-recipe { grid-column: 1 / -1; min-height: 0; }
  .pbar.compact .pb-tools { justify-content: flex-start; }
  @media (max-width: 760px) {
    .pbar .pb-counter { grid-template-columns: 1fr auto; }
    .pbar .pb-recipe { grid-column: 1 / -1; min-height: 0; }
    .pbar .pb-tools { justify-content: flex-start; }
    .pbar .pb-bottle svg { width: 34px; height: 84px; }
    .pbar .pb-shelf { gap: 8px 10px; min-height: 110px; }
  }`;

  function bottleSVG(b) {
    const neck = `<rect x="18" y="2" width="10" height="26" rx="2" fill="${b.glass}"/><rect x="17" y="0" width="12" height="6" rx="1.5" fill="${b.cap}"/>`;
    const body = b.shape === "cup"
      ? `<path d="M8 60h30l-3 40H11z" fill="#f4efe6"/><path d="M38 68c8 0 8 14 0 14" fill="none" stroke="#f4efe6" stroke-width="4"/><ellipse cx="23" cy="61" rx="15" ry="3" fill="#2a1408"/><path d="M14 46c2-6 6-6 8-12M24 46c2-6 6-6 8-12" stroke="#d9c9b0" stroke-width="1.5" fill="none" opacity=".6"/><ellipse cx="23" cy="104" rx="20" ry="4" fill="#f4efe6"/>`
      : b.shape === "carton"
      ? `<path d="M9 30h28v80H9z" fill="${b.glass}"/><path d="M9 30l14-14 14 14z" fill="${b.cap}"/><rect x="12" y="56" width="22" height="26" fill="#fff" opacity=".85"/><text x="23" y="73" text-anchor="middle" font-size="7" font-family="Inter" fill="#333">${b.short}</text>`
      : `${neck}<path d="M18 26c-10 6-12 12-12 22v58a6 6 0 0 0 6 6h22a6 6 0 0 0 6-6V48c0-10-2-16-12-22z" fill="${b.glass}"/>
         <path d="M8 60v42a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V60z" fill="${b.liquid}" opacity=".9"/>
         <rect x="11" y="62" width="24" height="24" rx="2" fill="${b.label}"/><text x="23" y="77" text-anchor="middle" font-size="6.5" font-family="Fraunces, Georgia, serif" fill="${b.ink}">${b.short}</text>
         <rect x="11" y="30" width="3" height="76" rx="1.5" fill="#fff" opacity=".25"/>`;
    return `<svg viewBox="0 0 46 114">${body}</svg>`;
  }
  function martiniSVG(level, beans, w, h) {
    const fill = level ? `<path d="M10 14 L86 14 L48 58 Z" fill="#2a1408"/><path d="M12 14 L84 14 L80 19 L16 19 Z" fill="#d9b98a"/><path d="M14 16 L82 16" stroke="#f0dcb6" stroke-width="2" opacity=".7"/>` : "";
    const b = [[38, 15], [48, 13], [58, 15]].slice(0, beans).map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4.2" ry="2.8" fill="#3b2012"/><path d="M${x - 3} ${y} q3 -1 6 0" stroke="#1a0d06" stroke-width="1" fill="none"/>`).join("");
    return `<svg viewBox="0 0 96 132" width="${w}" height="${h}" aria-hidden="true">${fill}${b}
      <path d="M6 10 L90 10 L48 60 Z" fill="rgba(220,235,240,.10)" stroke="rgba(235,245,250,.85)" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M14 13 L30 32" stroke="#fff" stroke-width="2" opacity=".35"/>
      <rect x="46.5" y="60" width="3" height="56" fill="rgba(235,245,250,.85)"/>
      <ellipse cx="48" cy="120" rx="22" ry="5" fill="rgba(235,245,250,.75)"/></svg>`;
  }

  const BOTTLES = [
    { id: "vodka", name: "Vodka", short: "VODKA", glass: "rgba(225,240,245,.55)", liquid: "rgba(235,245,250,.35)", label: "#f4efe6", ink: "#1d1d1b", cap: "#9ea3a6" },
    { id: "gin", name: "Gin", short: "GIN", glass: "rgba(150,200,190,.55)", liquid: "rgba(210,235,230,.3)", label: "#2e6a6c", ink: "#f4efe6", cap: "#c9a46a" },
    { id: "coffee-liqueur", name: "Coffee liqueur", short: "CAFÉ", glass: "#2a1408", liquid: "#1a0b04", label: "#c9932c", ink: "#2a1408", cap: "#8c1c1e" },
    { id: "tequila", name: "Tequila", short: "AGAVE", glass: "rgba(230,200,140,.6)", liquid: "rgba(220,170,90,.5)", label: "#b4532a", ink: "#fff", cap: "#3a1d0e" },
    { id: "espresso", name: "Espresso", short: "", shape: "cup", glass: "#f4efe6", cap: "#f4efe6" },
    { id: "syrup", name: "Simple syrup", short: "SYRUP", glass: "rgba(240,235,220,.6)", liquid: "rgba(245,240,225,.5)", label: "#4a2a17", ink: "#f4efe6", cap: "#c9a46a" },
    { id: "tonic", name: "Tonic", short: "TONIC", glass: "rgba(200,225,235,.5)", liquid: "rgba(220,240,250,.3)", label: "#1f3350", ink: "#fff", cap: "#c0392b" },
    { id: "orange-juice", name: "Orange juice", short: "OJ", shape: "carton", glass: "#f0a33a", cap: "#e07a1a" },
    { id: "milk", name: "Milk", short: "MILK", shape: "carton", glass: "#f4f4f2", cap: "#2e6a9c" },
  ];
  const LINES = {
    vodka: "Vodka. Good start.", "coffee-liqueur": "Coffee liqueur. Getting warmer.", espresso: "Freshly pulled. Mr. Singh would approve.",
    syrup: "A touch of sweetness. Optional, but civilised.", ice: "Ice. Every good drink starts cold.",
    gin: "Gin? Bold choice.", tequila: "Tequila. Hm.", tonic: "Tonic? In this?", "orange-juice": "Orange juice… are we making brunch?", milk: "Milk. Interesting.",
  };
  const NAMES = { ice: "ice", vodka: "vodka", "coffee-liqueur": "coffee liqueur", espresso: "espresso", syrup: "syrup", gin: "gin", tequila: "tequila", tonic: "tonic", "orange-juice": "orange juice", milk: "milk" };
  const HINTS = [
    "Every good drink starts cold.",
    "Three things go in: something clear, something dark and sweet, and something freshly pulled.",
    "Shake it like you mean it, strain it into the glass, then the garnish.",
    "Three coffee beans on top. Health, wealth and happiness.",
  ];
  const TOOL = {
    ice: '<svg viewBox="0 0 54 50" width="54" height="50"><path d="M4 14h46l-5 34H9z" fill="#b9bcbf"/><path d="M4 14h46l-1 6H5z" fill="#e8eaeb"/><g fill="#eaf6fb" opacity=".95"><rect x="12" y="6" width="11" height="11" rx="2" transform="rotate(-12 17 11)"/><rect x="24" y="3" width="12" height="12" rx="2" transform="rotate(8 30 9)"/><rect x="34" y="7" width="10" height="10" rx="2" transform="rotate(-6 39 12)"/></g></svg>',
    shake: '<svg viewBox="0 0 40 74" width="34" height="62"><path d="M12 2h16l2 10H10z" fill="#d9dcde"/><path d="M8 12h24l-3 58H11z" fill="#b9bcbf"/><path d="M8 12h24l-1 6H9z" fill="#eef0f1"/><rect x="13" y="16" width="3" height="50" fill="#fff" opacity=".35"/></svg>',
    strain: '<svg viewBox="0 0 44 40" width="44" height="40"><circle cx="18" cy="18" r="14" fill="none" stroke="#c9cccf" stroke-width="4"/><circle cx="18" cy="18" r="8" fill="none" stroke="#9ea3a6" stroke-width="2" stroke-dasharray="2 2"/><path d="M30 26l12 12" stroke="#c9cccf" stroke-width="4" stroke-linecap="round"/></svg>',
    bean: '<svg viewBox="0 0 44 54" width="40" height="50"><path d="M6 14h32v34a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="rgba(220,235,240,.35)" stroke="#d9e4e8" stroke-width="1.5"/><rect x="4" y="8" width="36" height="7" rx="2" fill="#8c6a30"/><g fill="#3b2012"><ellipse cx="14" cy="40" rx="4" ry="5.5"/><ellipse cx="24" cy="44" rx="4" ry="5.5"/><ellipse cx="31" cy="37" rx="4" ry="5.5"/><ellipse cx="19" cy="31" rx="4" ry="5.5"/><ellipse cx="29" cy="27" rx="4" ry="5.5"/></g></svg>',
  };

  // the same rules as Bernard's, for members mixing one just for fun
  function practiceCheck(steps) {
    const bad = steps.find((s) => ["gin", "tonic", "orange-juice", "milk", "tequila"].includes(s));
    if (bad) return NAMES[bad][0].toUpperCase() + NAMES[bad].slice(1) + " doesn't belong in an espresso martini.";
    const at = (s) => steps.indexOf(s), last = (s) => steps.lastIndexOf(s);
    if (["vodka", "coffee-liqueur", "espresso"].some((n) => at(n) < 0)) return "Something's missing from the shaker.";
    if (at("ice") < 0) return "A warm martini? It needs ice.";
    if (Math.max(...["vodka", "coffee-liqueur", "espresso", "syrup", "ice"].map(last)) > at("shake")) return "Everything goes in before you shake.";
    const beans = steps.filter((s) => s === "bean").length;
    if (beans !== 3) return beans < 3 ? "The garnish isn't quite right." : "Tradition says three beans.";
    return null;
  }

  function mount(root, opts) {
    if (!document.getElementById("pbar-css")) { const st = document.createElement("style"); st.id = "pbar-css"; st.textContent = css; document.head.appendChild(st); }
    const say = opts.say || (() => {});
    root.innerHTML = `<div class="pbar${opts.compact ? " compact" : ""}">
      <div class="pb-back"><div class="pb-shelf">${BOTTLES.map((b) => `<button type="button" class="pb-bottle" data-id="${b.id}" aria-label="Add ${b.name}">${bottleSVG(b)}<span>${b.name}</span></button>`).join("")}</div><div class="pb-board"></div></div>
      <div class="pb-counter">
        <div class="pb-recipe">The shaker's empty.</div>
        <div class="pb-glass"></div>
        <div class="pb-tools">
          <button type="button" class="pb-tool" data-t="ice" aria-label="Add ice">${TOOL.ice}<span>Ice</span></button>
          <button type="button" class="pb-tool" data-t="shake" aria-label="Shake">${TOOL.shake}<span>Shake</span></button>
          <button type="button" class="pb-tool" data-t="strain" aria-label="Strain into the glass">${TOOL.strain}<span>Strain</span></button>
          <button type="button" class="pb-tool" data-t="bean" aria-label="Add a coffee bean">${TOOL.bean}<span>Beans</span></button>
        </div>
      </div>
      <div class="pb-actions">
        <button type="button" class="pb-serve" disabled>Serve to Bernard</button>
        <div style="display:flex;gap:16px"><button type="button" class="pb-link" data-a="hint">Hint</button><button type="button" class="pb-link" data-a="reset">Start over</button></div>
      </div></div>`;
    const q = (s) => root.querySelector(s), tool = (t) => q(`.pb-tool[data-t="${t}"]`);
    let steps = [], shaken = false, strained = false, beans = 0, hintN = 0;
    const big = opts.compact ? [64, 88] : [96, 132];

    function draw() {
      const inShaker = [...new Set(steps.filter((s) => NAMES[s]))].map((s) => NAMES[s]);
      q(".pb-recipe").innerHTML = inShaker.length ? `<b>In the shaker:</b> ${inShaker.join(", ")}${shaken ? " · shaken" : ""}${strained ? " · strained" : ""}${beans ? ` · ${beans} bean${beans > 1 ? "s" : ""}` : ""}` : "The shaker's empty.";
      q(".pb-glass").innerHTML = martiniSVG(strained ? 1 : 0, beans, big[0], big[1]);
      q(".pb-serve").disabled = !strained;
      tool("strain").disabled = !shaken || strained;
      tool("bean").disabled = !strained;
      tool("shake").disabled = shaken || !steps.length;
    }
    function add(id) {
      if (shaken) return say("It's already been shaken. Start over to add more.", true);
      steps.push(id);
      q(`.pb-bottle[data-id="${id}"]`)?.classList.add("used");
      say(LINES[id] || "Noted."); draw();
    }
    function reset(msg) {
      steps = []; shaken = strained = false; beans = 0;
      root.querySelectorAll(".pb-bottle.used").forEach((b) => b.classList.remove("used"));
      draw(); if (msg) say(msg);
    }
    root.querySelectorAll(".pb-bottle").forEach((el) => el.addEventListener("click", () => add(el.dataset.id)));
    tool("ice").addEventListener("click", () => add("ice"));
    tool("shake").addEventListener("click", () => {
      steps.push("shake"); tool("shake").classList.add("shaking"); say("Shaking…");
      setTimeout(() => { tool("shake").classList.remove("shaking"); shaken = true; say("Lovely and cold. Now strain it."); draw(); }, 1300);
    });
    tool("strain").addEventListener("click", () => { steps.push("strain"); strained = true; say("Into the glass. It needs a garnish."); draw(); });
    tool("bean").addEventListener("click", () => {
      steps.push("bean"); beans++;
      say(["One bean.", "Two.", "Three: health, wealth and happiness.", "Four is a lot of beans."][Math.min(beans, 4) - 1]); draw();
    });
    q('[data-a="hint"]').addEventListener("click", () => say(HINTS[hintN++ % HINTS.length]));
    q('[data-a="reset"]').addEventListener("click", () => reset("A fresh shaker. Take your time."));
    q(".pb-serve").addEventListener("click", async () => {
      q(".pb-serve").disabled = true; say("Bernard takes a sip…");
      if (opts.practice) {
        const bad = practiceCheck(steps);
        setTimeout(() => { if (bad) { reset(); say(bad + " Try again.", true); } else { say("Perfect, as ever. Bernard raises the glass to you."); setTimeout(() => reset(), 2500); } }, 700);
        return;
      }
      try {
        const r = await fetch(API + "/pit/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steps }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { reset(); return say((d.error || "Not quite.") + " Try again.", true); }
        try { localStorage.setItem("pitPass", d.pass); localStorage.setItem("pitMember", d.member); } catch {}
        say("Perfect. Welcome, member.");
        opts.onJoin && opts.onJoin(d.member, d.pass);
      } catch { say("Bernard couldn't reach the bar. Try again in a moment.", true); q(".pb-serve").disabled = false; }
    });
    draw();
    return { reset };
  }

  window.PitBar = { mount, martiniSVG };
})();
