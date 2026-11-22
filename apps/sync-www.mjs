// Copy a game into its iOS app folder. The website copies stay untouched.
// Run from apps/<folder>: node ../sync-www.mjs <shopfloor|deadacre|pastries>
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appsDir, "..");
const ids = JSON.parse(readFileSync(join(appsDir, "app-ids.json"), "utf8"));

export function loadSupport() {
  const support = JSON.parse(readFileSync(join(appsDir, "support.json"), "utf8"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support.email || "")) {
    throw new Error("apps/support.json needs an email address");
  }
  if (!/^https:\/\/.+/.test(support.url || "")) {
    throw new Error("apps/support.json needs an https url");
  }
  return support;
}

export function nativeShell(key, support = loadSupport()) {
  const pastries = key === "pastries";
  const emailJs = JSON.stringify(support.email);
  const linkJs = pastries
    ? `p.textContent = "Support: " + SUPPORT_EMAIL;`
    : `p.append("Support: ");
    var link = document.createElement("a");
    link.href = ${JSON.stringify(`mailto:${support.email}`)};
    link.textContent = SUPPORT_EMAIL;
    p.append(link);`;
  const pastriesStyle = pastries
    ? `
  /* native-pastries: the logo picker and Add to Home Screen pages are for the website. */
  [data-act="home-screen"],
  .overlay.home-help,
  .logo-grid,
  p.name-label:has(+ p.fine + .logo-grid),
  p.fine:has(+ .logo-grid),
  [data-act="home-screen"] + .fine {
    display: none !important;
  }`
    : "";
  const pastriesScript = pastries
    ? `
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("[data-act='home-screen'], [data-act='pick-logo']");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  function hidePastriesWebOnly() {
    document.querySelectorAll("p.fine, p.name-label").forEach(function (el) {
      var text = el.textContent || "";
      if (/add to home screen/i.test(text) || /sits on the home screen/i.test(text) || /opens a page for this picture/i.test(text) || text.trim() === "Logo") {
        el.hidden = true;
      }
    });
  }`
    : "";
  const pastriesCall = pastries ? "hidePastriesWebOnly();" : "";
  return `
<!-- native-shell: iOS app copy only. The website file is not modified. -->
<style id="native-shell">
  html, body, * {
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  input, textarea, .native-support, .native-support a {
    -webkit-user-select: text;
    user-select: text;
  }
  .native-support {
    margin: 12px 0;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    pointer-events: auto;
    touch-action: manipulation;
  }
  .native-support a { color: inherit; text-decoration: underline; }${pastriesStyle}
</style>
<script id="native-shell">
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturechange", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  var SUPPORT_EMAIL = ${emailJs};
  function placeSupport() {
    function add(parent, before) {
      if (!parent || parent.querySelector(".native-support")) return;
      var p = document.createElement("p");
      p.className = "native-support";
      ${linkJs}
      if (before && before.parentNode === parent) parent.insertBefore(p, before);
      else parent.appendChild(p);
    }
    var menuCard = document.getElementById("menu-card");
    add(menuCard, menuCard && menuCard.querySelector("#close-menu"));
    add(document.querySelector("#menu .sheet"), null);
    add(document.querySelector('[data-screen="settings"]'), null);
  }
  ${pastriesScript}
  document.addEventListener("DOMContentLoaded", function () {
    placeSupport();
    ${pastriesCall}
    new MutationObserver(function () {
      placeSupport();
      ${pastriesCall}
    }).observe(document.body, { childList: true, subtree: true });
  });
</script>
`;
}

function main() {
  const key = process.argv[2];
  const meta = ids[key];
  if (!meta) {
    console.error(`Usage: node sync-www.mjs <${Object.keys(ids).join("|")}>`);
    process.exit(1);
  }

  const project = join(appsDir, meta.folder);
  const www = join(project, "www");
  const source = join(repoRoot, meta.webDir);

  rmSync(www, { recursive: true, force: true });
  mkdirSync(www, { recursive: true });
  cpSync(source, www, { recursive: true });

  const indexPath = join(www, "index.html");
  let html = readFileSync(indexPath, "utf8");
  if (!html.includes('id="native-shell"')) {
    if (!html.includes("</head>")) throw new Error(`${indexPath} has no </head>`);
    html = html.replace("</head>", `${nativeShell(key)}</head>`);
    writeFileSync(indexPath, html);
  }

  const config = {
    appId: meta.appId,
    appName: meta.appName,
    webDir: "www",
    backgroundColor: meta.background,
    ios: {
      contentInset: "never",
      scrollEnabled: true,
      zoomEnabled: false,
      allowsLinkPreview: false,
      backgroundColor: meta.background,
      preferredContentMode: "mobile",
    },
  };

  writeFileSync(join(project, "capacitor.config.json"), `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Bundled ${meta.webDir}/ into apps/${meta.folder}/www`);
  console.log(`appId=${meta.appId} appName=${meta.appName}`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
