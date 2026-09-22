// Rebuilds share/index.html from whatever is sitting in the share/ folder.
// Netlify runs this on every deploy. Nothing to install.
//
// Counts as a page:
//   share/solar-map.html            ->  /share/solar-map.html
//   share/solar-map/index.html      ->  /share/solar-map/
// Ignored: share/index.html itself, anything starting with "_" or "."
//
// Label = the page's <title>, falling back to a tidied filename.
// Date  = <meta name="date" content="2026-09-22"> if present,
//         else the date the file was first committed to git.
// PIN   = set SHARE_PIN in Netlify > Site configuration > Environment variables.
//         Only its SHA-256 hash is written into the page, never the PIN.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SHARE_DIR = path.join(ROOT, "share");
const OUT = path.join(SHARE_DIR, "index.html");

const tidy = (n) =>
  n.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function readHtml(file) {
  try { return fs.readFileSync(file, "utf8"); } catch (e) { return ""; }
}

function titleOf(html, fallback) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m || !m[1].trim()) return fallback;
  return m[1].trim().replace(/\s+/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function dateOf(html, file) {
  const m = html.match(/<meta\s+name=["']date["']\s+content=["']([^"']+)["']/i);
  if (m) {
    // A bare YYYY-MM-DD parses as UTC midnight, which can slip back a day
    // once formatted in Central time, so anchor it at midday.
    const raw = /^\d{4}-\d{2}-\d{2}$/.test(m[1].trim()) ? m[1].trim() + "T12:00:00" : m[1];
    const d = new Date(raw);
    if (!isNaN(d)) return d;
  }
  try {
    const rel = path.relative(ROOT, file);
    const log = execSync(`git log --diff-filter=A --format=%aI -- "${rel}"`, {
      cwd: ROOT, stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim().split("\n").filter(Boolean);
    if (log.length) return new Date(log[log.length - 1]);
  } catch (e) {}
  return new Date();
}

function collect() {
  if (!fs.existsSync(SHARE_DIR)) return [];
  const found = [];
  for (const e of fs.readdirSync(SHARE_DIR, { withFileTypes: true })) {
    const n = e.name;
    if (n.startsWith("_") || n.startsWith(".")) continue;
    if (e.isFile() && /\.html?$/i.test(n) && n.toLowerCase() !== "index.html") {
      found.push({ href: n, file: path.join(SHARE_DIR, n), fallback: tidy(n) });
    } else if (e.isDirectory()) {
      const f = path.join(SHARE_DIR, n, "index.html");
      if (fs.existsSync(f)) found.push({ href: n + "/", file: f, fallback: tidy(n) });
    }
  }
  return found
    .map((p) => {
      const html = readHtml(p.file);
      return { href: p.href, title: titleOf(html, p.fallback), date: dateOf(html, p.file) };
    })
    .sort((a, b) => b.date - a.date);
}

function render(pages, pinHash) {
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Chicago" });

  const rows = pages.map((p) => `      <li>
        <div class="info">
          <a href="${esc(p.href)}" target="_blank" rel="noopener">${esc(p.title)}</a>
          <span class="date">${esc(fmt(p.date))}</span>
        </div>
        <button class="copy" data-href="${esc(p.href)}" data-title="${esc(p.title)}">Copy</button>
      </li>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Shared Pages</title>
<style>
  :root { --bg:#f7f6f3; --card:#fff; --ink:#1d1d1f; --muted:#6b6b70; --line:#e4e2dc; --accent:#2f5d50; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#141414; --card:#1e1e1e; --ink:#f1f1f1; --muted:#9a9aa0; --line:#2e2e2e; --accent:#7fb8a4; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font:16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main { max-width:640px; margin:0 auto; padding:40px 16px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; font-size:14px; }
  ul { list-style:none; padding:0; margin:0; }
  li { display:flex; align-items:center; gap:12px; background:var(--card);
       border:1px solid var(--line); border-radius:10px; padding:12px 14px; margin-bottom:8px; }
  .info { flex:1; min-width:0; }
  .info a { color:var(--ink); font-weight:600; text-decoration:none; display:block; overflow-wrap:anywhere; }
  .info a:hover { color:var(--accent); }
  .date { color:var(--muted); font-size:13px; }
  button { font:inherit; font-size:14px; border:1px solid var(--line); background:var(--bg);
           color:var(--ink); border-radius:8px; padding:6px 12px; cursor:pointer; }
  button:hover { border-color:var(--accent); }
  #gate { max-width:320px; margin:18vh auto 0; padding:0 16px; text-align:center; }
  #gate input { font:inherit; width:100%; padding:10px 12px; border:1px solid var(--line);
                border-radius:8px; background:var(--card); color:var(--ink); margin:12px 0;
                text-align:center; letter-spacing:4px; }
  #err { color:#c0392b; font-size:14px; min-height:20px; }
  .hidden { display:none; }
  .empty { color:var(--muted); }
</style>
</head>
<body>
<div id="gate">
  <h1>Shared Pages</h1>
  <form id="pinForm">
    <input id="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" autofocus>
    <button type="submit">Open</button>
  </form>
  <div id="err">${pinHash ? "" : "SHARE_PIN is not set in Netlify yet."}</div>
</div>

<main id="list" class="hidden">
  <h1>Shared Pages</h1>
  <p class="sub">${pages.length} page${pages.length === 1 ? "" : "s"} &middot; newest first &middot; Copy puts the title and link on your clipboard</p>
  ${pages.length ? `<ul>\n${rows}\n  </ul>` : `<p class="empty">Nothing in share/ yet.</p>`}
</main>

<script>
  var PIN_HASH = "${pinHash}";
  var gate = document.getElementById("gate");
  var list = document.getElementById("list");

  function unlock() {
    gate.classList.add("hidden");
    list.classList.remove("hidden");
    try { sessionStorage.setItem("shareUnlocked", PIN_HASH); } catch (e) {}
  }
  try { if (PIN_HASH && sessionStorage.getItem("shareUnlocked") === PIN_HASH) unlock(); } catch (e) {}

  async function sha256(text) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  document.getElementById("pinForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var val = document.getElementById("pin").value.trim();
    if (PIN_HASH && (await sha256(val)) === PIN_HASH) unlock();
    else document.getElementById("err").textContent = "Wrong PIN.";
  });

  Array.prototype.forEach.call(document.querySelectorAll("button.copy"), function (btn) {
    btn.addEventListener("click", async function () {
      var url = new URL(btn.dataset.href, location.href).href;
      var text = btn.dataset.title + "\\n" + url;
      try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
      catch (e) { prompt("Copy this:", text); }
      setTimeout(function () { btn.textContent = "Copy"; }, 1500);
    });
  });
</script>
</body>
</html>
`;
}

const pin = (process.env.SHARE_PIN || "").trim();
const pinHash = pin ? crypto.createHash("sha256").update(pin).digest("hex") : "";
if (!fs.existsSync(SHARE_DIR)) fs.mkdirSync(SHARE_DIR, { recursive: true });
const pages = collect();
fs.writeFileSync(OUT, render(pages, pinHash));
console.log("share/index.html built with " + pages.length + " page(s)" + (pinHash ? "" : " -- WARNING: SHARE_PIN not set"));
