// Copy a game into its iOS app folder. The site copies in /shopfloor and /zombies
// stay untouched. Run from apps/<folder>: node ../sync-www.mjs <shopfloor|deadacre>
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appsDir, "..");
const ids = JSON.parse(readFileSync(join(appsDir, "app-ids.json"), "utf8"));
const key = process.argv[2];
const meta = ids[key];

if (!meta) {
  console.error("Usage: node sync-www.mjs <shopfloor|deadacre>");
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
  const snippet = `
<!-- native-shell: iOS app copy only. The website file is not modified. -->
<style id="native-shell">
  html, body, * {
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  input, textarea {
    -webkit-user-select: text;
    user-select: text;
  }
</style>
<script id="native-shell">
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturechange", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
</script>
`;
  if (!html.includes("</head>")) {
    throw new Error(`${indexPath} has no </head>`);
  }
  html = html.replace("</head>", `${snippet}</head>`);
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
