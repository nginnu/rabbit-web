#!/usr/bin/env node
// Builds e2e-report/index.html from e2e/report/flow-report.json.
//
// Everything — CSS, script, and every screenshot base64-embedded — lands in
// that one file, so it can be sent to anyone and opened offline. Run via
// `npm run test:e2e:canary` (test run → this builder → open), or standalone
// after a run: `node e2e/report/build-report.mjs`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const REPORT_JSON = path.join(ROOT, "e2e/report/flow-report.json");
const OUT_FILE = path.join(ROOT, "e2e-report/index.html");

const STEPS = [
  { key: "landing", label: "Landing" },
  { key: "login", label: "Sign in" },
  { key: "shop", label: "Shop" },
  { key: "buy", label: "Buy" },
  { key: "pay", label: "Pay" },
  { key: "result", label: "Result" },
];

const SHOTS = [
  { name: "01-landing", caption: "Landing", step: "landing" },
  { name: "02-login", caption: "Login", step: "login" },
  { name: "03-shop", caption: "Shop", step: "shop" },
  { name: "04-checkout", caption: "Checkout", step: "buy" },
  { name: "05-result", caption: "Result", step: "result" },
];

const ROLES = [
  { key: "qa", icon: "🧪", label: "QA", color: "#b45309", bg: "#fffbeb", border: "#fcd34d" },
  { key: "admin", icon: "👑", label: "Admin", color: "#4338ca", bg: "#eef2ff", border: "#c7d2fe" },
  { key: "member", icon: "👤", label: "Member", color: "#047857", bg: "#ecfdf5", border: "#6ee7b7" },
];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const sec = (ms) => `${(ms / 1000).toFixed(1)}s`;

// Cards render in a random order — role grouping is not the story here,
// and a shuffled board reads more like the real, mixed traffic it is.
const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const readReport = () => JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));

// Prefer the path the reporter recorded (Playwright copies attachments under
// test-results/ with hashed names); fall back to the stable artifacts copy
// the spec writes itself, so the report can be rebuilt after test-results/
// has been cleaned.
const imgDataUri = (user, shotName) => {
  const shot = user.shots.find((s) => s.name === shotName);
  const candidates = shot
    ? [path.resolve(ROOT, shot.path)]
    : [];
  candidates.push(
    path.join(ROOT, "e2e/report/artifacts", user.user, `${shotName}.png`)
  );
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
  }
  return null;
};

function stepPills(user) {
  return STEPS.map((s) => {
    const step = user.steps.find((x) => x.name === s.key);
    if (!step) {
      return `<span class="pill pill-skip" title="not reached">${s.label} · –</span>`;
    }
    return step.ok
      ? `<span class="pill pill-ok" title="${s.label} ${sec(step.durationMs)}">${s.label} ✓</span>`
      : `<span class="pill pill-bad" title="${s.label} failed">${s.label} ✗</span>`;
  }).join("");
}

function filmstrip(user) {
  return SHOTS.map((shot) => {
    const uri = imgDataUri(user, shot.name);
    const step = user.steps.find((s) => s.name === shot.step);
    const time = step ? sec(step.durationMs) : "";
    const img = uri
      ? `<img class="shot" src="${uri}" alt="${esc(user.user)} ${esc(shot.caption)}" loading="lazy" data-caption="${esc(user.user)} · ${esc(shot.caption)}">`
      : `<div class="shot shot-missing">no image</div>`;
    return `<figure class="frame">${img}<figcaption>${esc(shot.caption)}${time ? ` <span class="frame-time">${time}</span>` : ""}</figcaption></figure>`;
  }).join('<div class="frame-arrow">→</div>');
}

function userCards(users) {
  return users
    .map((user) => {
      const role = ROLES.find((r) => r.key === user.expectedRole);
      const failed = user.status !== "passed";
      const errorBox = user.error
        ? `<pre class="errbox">${esc(user.error)}</pre>`
        : "";
      return `
      <div class="usercard${failed ? " usercard-failed" : ""}">
        <div class="usercard-head">
          <span class="username mono">${esc(user.user)}</span>
          <span class="rolebadge" style="--rc:${role?.color};--rbg:${role?.bg};--rbd:${role?.border}">${role?.icon} ${role?.label}</span>
          <span class="head-sep"></span>
          <span class="steps">${stepPills(user)}</span>
          <span class="head-time${failed ? " bad" : ""}">${failed ? "✗ failed" : "✓ passed"} · ${sec(user.durationMs)}</span>
        </div>
        <div class="filmstrip">${filmstrip(user)}</div>
        ${errorBox}
      </div>`;
    })
    .join("");
}

function build() {
  const report = readReport();
  const users = shuffle(report.users ?? []);
  const passed = users.filter((u) => u.status === "passed").length;
  const shotCount = users.reduce((n, u) => n + u.shots.length, 0);
  const when = new Date(report.startedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rabbit Shop — User Flow Report</title>
<style>
  :root {
    --ink: #0f172a; --ink-2: #475569; --ink-3: #94a3b8;
    --sky: #0284c7; --line: #e2e8f0;
    --ok: #059669; --okbg: #ecfdf5; --okbd: #a7f3d0;
    --bad: #e11d48; --badbg: #fff1f2; --badbd: #fecdd3;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: var(--ink);
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background:
      radial-gradient(1000px 500px at 80% -10%, #e0f2fe 0%, transparent 60%),
      radial-gradient(800px 400px at 10% 0%, #f8fafc 0%, transparent 50%),
      #f1f5f9;
    min-height: 100vh;
  }
  .mono { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 28px 20px 60px; }

  .hero {
    background: rgba(255,255,255,.75); backdrop-filter: blur(12px);
    border: 1px solid rgba(226,232,240,.9); border-radius: 22px;
    box-shadow: 0 20px 50px -25px rgba(2,132,199,.35);
    padding: 26px 30px;
  }
  .hero h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.02em; }
  .hero h1 span { color: var(--sky); }
  .hero-sub { margin-top: 6px; color: var(--ink-2); font-size: 13px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12.5px; font-weight: 600; color: var(--ink-2);
    background: #fff; border: 1px solid var(--line); border-radius: 999px;
    padding: 5px 12px;
  }
  .chip .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--ok); }
  .chip.bad .dot { background: var(--bad); }

  h2 {
    font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
    color: var(--ink-2); margin: 34px 0 6px;
  }
  .section-note { color: var(--ink-3); font-size: 13px; margin: 0 0 14px; }

  .usercard {
    background: rgba(255,255,255,.8); backdrop-filter: blur(10px);
    border: 1px solid var(--line); border-radius: 18px;
    box-shadow: 0 14px 35px -22px rgba(15,23,42,.35);
    padding: 16px 18px 18px; margin-bottom: 14px;
  }
  .usercard-failed { border-color: var(--badbd); background: rgba(255,241,242,.75); }
  .usercard-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .username { font-size: 15px; font-weight: 700; }
  .rolebadge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 13.5px; font-weight: 800; letter-spacing: .02em;
    color: var(--rc, var(--ink-2));
    background: var(--rbg, #f8fafc); border: 1.5px solid var(--rbd, var(--line));
    border-radius: 999px; padding: 4px 14px; white-space: nowrap;
  }
  .head-sep { flex: 1 1 auto; }
  .steps { display: inline-flex; flex-wrap: wrap; gap: 5px; }
  .pill {
    font-size: 11.5px; font-weight: 700; border-radius: 999px; padding: 3px 9px;
    border: 1px solid transparent; white-space: nowrap;
  }
  .pill-ok { color: var(--ok); background: var(--okbg); border-color: var(--okbd); }
  .pill-bad { color: var(--bad); background: var(--badbg); border-color: var(--badbd); }
  .pill-skip { color: var(--ink-3); background: #f8fafc; border-color: var(--line); }
  .head-time { font-size: 12.5px; font-weight: 700; color: var(--ok); font-variant-numeric: tabular-nums; }
  .head-time.bad { color: var(--bad); }

  .filmstrip { display: flex; align-items: flex-start; gap: 6px; flex-wrap: nowrap; }
  /* Frames share the row equally (min-width:0 lets them shrink past their
     content) so all five shots + arrows always sit on a single line; the
     lightbox is the zoom, the thumbnails are just the storyboard. */
  .frame { margin: 0; flex: 1 1 0; min-width: 0; }
  .frame-arrow { color: var(--ink-3); align-self: center; flex: 0 0 auto; margin-top: -22px; font-size: 12px; }
  .frame figcaption { text-align: center; font-size: 11.5px; color: var(--ink-2); margin-top: 6px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .frame-time { color: var(--ink-3); font-weight: 400; }
  .shot {
    display: block; width: 100%; border-radius: 10px; cursor: zoom-in;
    border: 1px solid var(--line); box-shadow: 0 6px 18px -10px rgba(15,23,42,.35);
    background: #fff;
  }
  .shot-missing {
    display: flex; align-items: center; justify-content: center;
    height: 125px; color: var(--ink-3); font-size: 12px;
    border: 1px dashed #cbd5e1; border-radius: 10px; background: #fff; cursor: default;
  }
  .errbox {
    margin: 14px 0 0; padding: 12px 14px; border-radius: 10px;
    background: var(--badbg); border: 1px solid var(--badbd); color: var(--bad);
    font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; max-height: 220px; overflow: auto;
  }

  #lightbox {
    position: fixed; inset: 0; display: none; z-index: 50;
    background: rgba(15,23,42,.85); backdrop-filter: blur(4px);
    align-items: center; justify-content: center; flex-direction: column; gap: 14px;
    cursor: zoom-out; padding: 30px;
  }
  #lightbox.show { display: flex; }
  #lightbox img { max-width: min(1200px, 95vw); max-height: 82vh; border-radius: 12px; box-shadow: 0 30px 80px -20px rgba(0,0,0,.6); }
  #lightbox .lb-caption { color: #e2e8f0; font-size: 14px; font-weight: 600; }
</style>
</head>
<body>
<div class="wrap">

  <header class="hero">
    <h1>🛍 Rabbit Shop — <span>User Flow Report</span></h1>
    <div class="hero-sub">${esc(when)} · ${esc(report.baseURL)} · total run ${sec(report.durationMs)}</div>
    <div class="chips">
      <span class="chip ${passed === users.length ? "" : "bad"}"><span class="dot"></span>${passed}/${users.length} passed</span>
      ${ROLES.map((r) => {
        const n = users.filter((u) => u.expectedRole === r.key).length;
        return n ? `<span class="chip">${r.icon} ${r.label} ${n}</span>` : "";
      }).join("")}
      <span class="chip">📸 ${shotCount} screenshots</span>
    </div>
  </header>

  <section>
    <h2>User × Flow Matrix</h2>
    <p class="section-note">Every user's full journey — landing · sign in · shop · buy · pay · payment result — screenshots inline, nothing to expand. Click a screenshot to zoom.</p>
    ${userCards(users)}
  </section>
</div>

<div id="lightbox"><img alt=""><div class="lb-caption"></div></div>

<script>
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector("img");
  const lbCap = lb.querySelector(".lb-caption");
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img.shot");
    if (img) {
      lbImg.src = img.src;
      lbCap.textContent = img.dataset.caption || "";
      lb.classList.add("show");
    } else if (e.target === lb) {
      lb.classList.remove("show");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") lb.classList.remove("show");
  });
</script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  const sizeMb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
  process.stdout.write(
    `report → ${path.relative(process.cwd(), OUT_FILE)} (${sizeMb} MB, ${users.length} users, ${shotCount} screenshots)\n`
  );
}

build();
