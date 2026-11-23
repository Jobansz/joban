// "What I'm building" — refreshed every Monday by .github/workflows/weekly.yml
// Reads the past week's commits in Joban's public GitHub repos, asks Claude for a
// short note in Joban's voice, and writes weekly.json for the homepage.
// Without ANTHROPIC_API_KEY it still writes a plain list of what changed.

import { writeFileSync, readFileSync } from "node:fs";

const USER = "Jobansz";
const env = process.env;
const since = new Date(Date.now() - 7 * 86400000);
const gh = async (path) => {
  const res = await fetch("https://api.github.com" + path, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "joban-weekly", ...(env.GITHUB_TOKEN ? { Authorization: "Bearer " + env.GITHUB_TOKEN } : {}) },
  });
  if (!res.ok) throw new Error(path + " " + res.status);
  return res.json();
};

async function main() {
  const repos = (await gh(`/users/${USER}/repos?sort=pushed&per_page=30&type=owner`))
    .filter((r) => !r.private && !r.fork && new Date(r.pushed_at) > since);
  const projects = [];
  for (const r of repos) {
    const commits = await gh(`/repos/${r.full_name}/commits?since=${since.toISOString()}&per_page=100`).catch(() => []);
    const messages = commits
      .map((c) => (c.commit?.message || "").split("\n")[0].trim())
      .filter((m) => m && !/^(edition|weekly update|merge)\b/i.test(m));
    if (messages.length) projects.push({ repo: r.name, description: r.description || "", commits: messages.length, messages: messages.slice(0, 40) });
  }
  const total = projects.reduce((n, p) => n + p.commits, 0);
  const pages = await newPages();

  let note = { headline: "A quiet week in the workshop", body: "Nothing new shipped this week. Probably exams or shifts. Back at it soon.", items: [] };
  if (total || pages.length) {
    note = {
      headline: "This week in the workshop",
      body: `${total} change${total === 1 ? "" : "s"} across ${projects.map((p) => p.repo).join(", ")}.`,
      items: [], // raw commit messages can mention private rooms, so the plain version lists none
    };
    if (env.ANTHROPIC_API_KEY) {
      try { note = await askClaude(projects); } catch (e) { console.log("Claude:", e.message); }
    }
  }

  const out = {
    week_of: new Date().toLocaleDateString("en-CA", { timeZone: "Etc/GMT+7", month: "long", day: "numeric" }),
    updated: new Date().toISOString(),
    changes: total,
    projects: projects.map((p) => p.repo),
    new_pages: pages,
    ...note,
  };
  writeFileSync("weekly.json", JSON.stringify(out, null, 2) + "\n");
  console.log("weekly.json:", out.headline, `(${total} changes)`);
}

// Pages added to the website this week that visitors can try (skips private/noindex pages)
async function newPages() {
  const commits = await gh(`/repos/${USER}/joban/commits?since=${since.toISOString()}&per_page=60`).catch(() => []);
  const added = new Set();
  for (const c of commits) {
    const full = await gh(`/repos/${USER}/joban/commits/${c.sha}`).catch(() => null);
    for (const f of full?.files || []) if (f.status === "added" && /^[^/]+\.html$/.test(f.filename)) added.add(f.filename);
  }
  const out = [];
  for (const file of added) {
    let html = "";
    try { html = readFileSync(file, "utf8"); } catch { continue; } // deleted since
    if (/name=["']robots["'][^>]*noindex/i.test(html) || /http-equiv=["']refresh/i.test(html)) continue;
    const title = ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || file).split(/[·—|-]/)[0].trim();
    out.push({ title, href: file });
  }
  return out.slice(0, 4);
}

async function askClaude(projects) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": String(env.ANTHROPIC_API_KEY).replace(/\s+/g, ""), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 500,
      system:
        "You write the 'What I'm building' note at the top of Joban Singh's personal website, joban.me. Joban is a CS student at UNBC who builds apps, " +
        "ESP32 gadgets (Reach, a desk clock; Away, a train display; an e-ink morning paper) and shoots film. Write in his voice: first person, casual, warm, a little proud, never salesy. " +
        "Keep his private members' area secret: never mention the Lounge, its doors, the desk, the cellar, the trapdoor, alarms or anything password-protected. Public pages like Reach and the guestbook are fine. " +
        "From the commit messages below, pick out what a visitor would find interesting and describe it in plain words (no jargon, no file names, no commit hashes, no secrets or keys). " +
        'Reply with JSON only: {"headline":"max 7 words","body":"2-3 short sentences","items":["up to 4 short bullet points, max 9 words each"]}',
      messages: [{ role: "user", content: JSON.stringify(projects) }],
    }),
  });
  if (!res.ok) throw new Error(String(res.status));
  const text = (await res.json()).content.map((c) => c.text || "").join("");
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return { headline: String(j.headline || "This week in the workshop"), body: String(j.body || ""), items: (j.items || []).slice(0, 4).map(String) };
}

main().catch((e) => { console.error(e); process.exit(1); });
