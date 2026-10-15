// Rebuilds share/index.html and foundations/index.html from whatever is sitting
// in those folders. Netlify runs this on every deploy. Nothing to install.
//
// share/index.html        lists share/ and foundations/ (every page sent to anyone)
// foundations/index.html  lists foundations/ only (Foundation Method pages)
// Both sit behind the same PIN. The same rules apply in each folder:
//
// Counts as a page:
//   share/solar-map.html            ->  /share/solar-map.html
//   share/solar-map/index.html      ->  /share/solar-map/
// Ignored: share/index.html itself, anything starting with "_" or "."
//
// Label = the page's <title>, falling back to a tidied filename.
// Date  = <meta name="date" content="2026-09-22"> if present,
//         else the date the file was first committed to git.
// Group = <meta name="category" content="standing"> pins a page to the top;
//         otherwise pages group under <meta name="client">, groups ordered by
//         their newest page; pages with neither go in "Other" at the bottom.
//         Inside a group, the "Client - " part of the title is dropped.
// Badge = the category tag (discovery, proposal, feedback, approval, audit,
//         foundation, standing). Rules for each: standards/shared-pages.md.
// Code  = set SHARE_PIN in Netlify > Site configuration > Environment variables.
//         The list is encrypted with it (AES-256-GCM, key from PBKDF2-SHA256,
//         600,000 rounds, random salt each build). Neither the code nor the list
//         is in the page; only the right code can unscramble it in the browser.
//         Use a long code (four random words, 20+ characters): a short PIN can be
//         guessed offline against the scrambled list.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

// One entry per index page. "from" is the folders it lists.
const INDEXES = [
  { dir: "share", heading: "Shared Pages", tag: "Shared pages", from: ["share", "foundations"] },
  { dir: "foundations", heading: "Foundation Pages", tag: "Foundation pages", from: ["foundations"] },
];

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

function metaOf(html, name) {
  const m = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i"));
  return m ? m[1].trim() : "";
}

const CATEGORY_LABELS = {
  discovery: "Discovery", proposal: "Proposal", feedback: "Feedback", approval: "Approval",
  audit: "Audit", foundation: "Foundation", standing: "Standing",
};

// Pinned (standing) first, then one group per client ordered by its newest page,
// then "Other". Pages arrive newest first, so each group stays newest first.
function groupPages(pages) {
  const pinned = { name: "Pinned", pages: [], pinned: true };
  const other = { name: "Other", pages: [] };
  const byClient = new Map();
  for (const p of pages) {
    if (p.category === "standing") pinned.pages.push(p);
    else if (p.client) {
      if (!byClient.has(p.client)) byClient.set(p.client, { name: p.client, pages: [] });
      byClient.get(p.client).pages.push(p);
    } else other.pages.push(p);
  }
  return [pinned, ...byClient.values(), other].filter((g) => g.pages.length);
}

// Inside a client group the header names the client, so drop "Client - " from the title.
function shortTitle(title, group) {
  if (group.pinned || group.name === "Other") return title;
  const i = title.indexOf(" - ");
  return i > 0 ? title.slice(i + 3) : title;
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

// Pages in one folder. "prefix" is how the index page reaches that folder:
// "" for its own folder, "../foundations/" for a neighbour.
function collectDir(dirName, prefix) {
  const SHARE_DIR = path.join(ROOT, dirName);
  if (!fs.existsSync(SHARE_DIR)) return [];
  const found = [];
  for (const e of fs.readdirSync(SHARE_DIR, { withFileTypes: true })) {
    const n = e.name;
    if (n.startsWith("_") || n.startsWith(".")) continue;
    if (e.isFile() && /\.html?$/i.test(n) && n.toLowerCase() !== "index.html") {
      found.push({ href: prefix + n, file: path.join(SHARE_DIR, n), fallback: tidy(n) });
    } else if (e.isDirectory()) {
      const f = path.join(SHARE_DIR, n, "index.html");
      if (fs.existsSync(f)) found.push({ href: prefix + n + "/", file: f, fallback: tidy(n) });
    }
  }
  return found.map((p) => {
    const html = readHtml(p.file);
    return {
      href: p.href, title: titleOf(html, p.fallback), date: dateOf(html, p.file),
      client: metaOf(html, "client"), category: metaOf(html, "category").toLowerCase(),
    };
  });
}

function collect(ix) {
  let all = [];
  for (const d of ix.from) all = all.concat(collectDir(d, d === ix.dir ? "" : "../" + d + "/"));
  return all.sort((a, b) => b.date - a.date);
}

const KDF_ROUNDS = 600000;

// Encrypts the list so the browser can open it with the code. WebCrypto's AES-GCM
// expects the auth tag on the end of the ciphertext, so it's appended here.
function seal(text, code) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(code, salt, KDF_ROUNDS, 32, "sha256");
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(text, "utf8"), c.final(), c.getAuthTag()]);
  return { salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") };
}

function render(pages, code, ix) {
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Chicago" });

  const row = (p, g) => {
    const cat = CATEGORY_LABELS[p.category];
    return `      <li>
        <div class="info">
          <a href="${esc(p.href)}" target="_blank" rel="noopener">${esc(shortTitle(p.title, g))}</a>
          <span class="date">${cat ? `<span class="badge">${esc(cat)}</span>` : ""}${esc(fmt(p.date))}</span>
        </div>
        <button class="copy" data-href="${esc(p.href)}">Copy</button>
      </li>`;
  };
  const rows = groupPages(pages).map((g) => `  <section class="group${g.pinned ? " pinned" : ""}">
    <h2>${esc(g.name)}${g.pinned ? "" : ` <span class="count">&middot; ${g.pages.length}</span>`}</h2>
    <ul>
${g.pages.map((p) => row(p, g)).join("\n")}
    </ul>
  </section>`).join("\n");

  const listHtml = `  <h1>${esc(ix.heading)}</h1>
  <p class="sub">${pages.length} page${pages.length === 1 ? "" : "s"} &middot; grouped by client, newest first &middot; Copy puts the link on your clipboard</p>
  ${pages.length ? rows : `<p class="empty">Nothing in ${esc(ix.dir)}/ yet.</p>`}`;
  const sealed = code ? JSON.stringify(seal(listHtml, code)) : "null";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(ix.heading)} · Forward Solutions</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500&display=swap" rel="stylesheet">
<style>
  /* Forward Solutions brand tokens, matched to css/styles.css */
  :root {
    --bg:#F7F6F2; --card:#FFFFFF; --ink:#1A1D24; --muted:#5B6470;
    --line:rgba(26,29,36,0.10); --accent:#1E5BBA; --accent-ink:#FFFFFF; --signal:#F5A524;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:#14161B; --card:#1D2028; --ink:#F1F1EE; --muted:#9AA1AB;
      --line:rgba(255,255,255,0.09); --accent:#3FA9F5; --accent-ink:#0F1A2B; --signal:#F5A524;
    }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font:16px/1.55 'Inter', system-ui, -apple-system, sans-serif;
         -webkit-font-smoothing:antialiased; }
  .brand { display:flex; align-items:center; gap:10px; color:var(--ink); text-decoration:none;
           font-weight:600; font-size:15px; letter-spacing:-0.01em; }
  .brand img { width:28px; height:auto; }
  header.bar { border-bottom:1px solid var(--line); }
  header.bar .inner { max-width:680px; margin:0 auto; padding:16px; display:flex;
                      align-items:center; justify-content:space-between; }
  .tag { font-size:12px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); }
  main { max-width:680px; margin:0 auto; padding:40px 16px 64px; }
  h1 { font-family:'Fraunces', Georgia, serif; font-weight:500; letter-spacing:-0.02em;
       font-size:32px; line-height:1.1; margin:0 0 6px; }
  .sub { color:var(--muted); margin:0 0 28px; font-size:14px; }
  ul { list-style:none; padding:0; margin:0; }
  li { display:flex; align-items:center; gap:12px; background:var(--card);
       border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:12px;
       padding:14px 16px; margin-bottom:10px; }
  .info { flex:1; min-width:0; }
  .info a { color:var(--ink); font-weight:600; text-decoration:none; display:block; overflow-wrap:anywhere; }
  .info a:hover { color:var(--accent); }
  .date { color:var(--muted); font-size:13px; }
  .group { margin-bottom:28px; }
  .group h2 { font-size:12px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;
              color:var(--muted); margin:0 0 10px; }
  .group h2 .count { font-weight:500; }
  .group.pinned li { border-left-color:#3FA9F5; }
  .badge { display:inline-block; font-size:11px; font-weight:600; letter-spacing:0.04em;
           text-transform:uppercase; color:var(--accent); border:1px solid var(--line);
           border-radius:999px; padding:1px 8px; margin-right:8px; }
  button { font:inherit; font-size:14px; font-weight:500; border:1px solid var(--line); background:transparent;
           color:var(--ink); border-radius:8px; padding:7px 14px; cursor:pointer; }
  button:hover { border-color:var(--accent); color:var(--accent); }
  button.primary { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); width:100%; padding:10px 14px; }
  button.primary:hover { filter:brightness(1.08); color:var(--accent-ink); }
  #gate { max-width:340px; margin:14vh auto 0; padding:0 16px; text-align:center; }
  #gate .brand { justify-content:center; margin-bottom:28px; font-size:17px; }
  #gate .brand img { width:40px; }
  #gate h1 { font-size:26px; }
  #gate input { font:inherit; width:100%; padding:11px 12px; border:1px solid var(--line);
                border-radius:8px; background:var(--card); color:var(--ink); margin:16px 0 10px;
                text-align:center; letter-spacing:1px; }
  #gate input:focus { outline:2px solid var(--accent); outline-offset:1px; }
  #err { color:#c0392b; font-size:14px; min-height:20px; margin-top:10px; }
  .hidden { display:none; }
  .empty { color:var(--muted); }
  footer { color:var(--muted); font-size:12px; text-align:center; padding:0 16px 32px; }
</style>
</head>
<body>
<div id="gate">
  <a class="brand" href="/"><img src="/images/logo-mark.png" alt="">Forward Solutions</a>
  <h1>${esc(ix.heading)}</h1>
  <form id="pinForm">
    <input id="pin" type="password" autocomplete="current-password" placeholder="Code" autofocus>
    <button type="submit" class="primary">Open</button>
  </form>
  <div id="err">${code ? "" : "SHARE_PIN is not set in Netlify yet."}</div>
</div>

<div id="list" class="hidden">
<header class="bar"><div class="inner">
  <a class="brand" href="/"><img src="/images/logo-mark.png" alt="">Forward Solutions</a>
  <span class="tag">${esc(ix.tag)}</span>
</div></header>
<main id="main"></main>
<footer>Forward Solutions &middot; gottamoveforward.com</footer>
</div>

<script>
  // The list is encrypted; only the right code turns it back into the page list.
  var SEALED = ${sealed};
  var ROUNDS = ${KDF_ROUNDS};
  var STORE = "shareKey:${esc(ix.dir)}";
  var gate = document.getElementById("gate");
  var list = document.getElementById("list");
  var err = document.getElementById("err");

  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function toB64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }

  async function keyFromCode(code) {
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64(SEALED.salt), iterations: ROUNDS, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }

  async function unlockWith(key) {
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(SEALED.iv) }, key, b64(SEALED.ct));
    document.getElementById("main").innerHTML = new TextDecoder().decode(plain);
    wireCopy();
    gate.classList.add("hidden");
    list.classList.remove("hidden");
  }

  // Stay open for this tab: keep the derived key (not the code), tied to this build's salt.
  (async function () {
    try {
      var saved = sessionStorage.getItem(STORE);
      if (SEALED && saved && saved.indexOf(SEALED.salt + "|") === 0) {
        var raw = b64(saved.slice(SEALED.salt.length + 1));
        await unlockWith(await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]));
      }
    } catch (e) {}
  })();

  document.getElementById("pinForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!SEALED) return;
    var btn = e.target.querySelector("button");
    btn.disabled = true; err.textContent = "";
    try {
      var key = await keyFromCode(document.getElementById("pin").value.trim());
      await unlockWith(key);
      try { sessionStorage.setItem(STORE, SEALED.salt + "|" + toB64(await crypto.subtle.exportKey("raw", key))); } catch (e2) {}
    } catch (e3) {
      err.textContent = "Wrong code.";
    }
    btn.disabled = false;
  });

  function wireCopy() {
    Array.prototype.forEach.call(document.querySelectorAll("button.copy"), function (btn) {
      btn.addEventListener("click", async function () {
        var url = new URL(btn.dataset.href, location.href).href;
        try { await navigator.clipboard.writeText(url); btn.textContent = "Copied"; }
        catch (e) { btn.textContent = "Copy failed"; }
        setTimeout(function () { btn.textContent = "Copy"; }, 1500);
      });
    });
  }
</script>
</body>
</html>
`;
}

const code = (process.env.SHARE_PIN || "").trim();
if (code && code.length < 16) console.log("WARNING: SHARE_PIN is short; use four random words (20+ characters).");
for (const ix of INDEXES) {
  const dir = path.join(ROOT, ix.dir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const pages = collect(ix);
  fs.writeFileSync(path.join(dir, "index.html"), render(pages, code, ix));
  console.log(ix.dir + "/index.html built with " + pages.length + " page(s)" + (code ? "" : " -- WARNING: SHARE_PIN not set, list left out"));
}
