// Fail if an iOS bundle would load the live site, or if the website copies changed.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appsDir, "..");
const ids = JSON.parse(readFileSync(join(appsDir, "app-ids.json"), "utf8"));
const key = process.argv[2];
const meta = ids[key];
const errors = [];

function fail(message) {
  errors.push(message);
}

function remoteLoads(dir) {
  const hits = [];
  const files = walkText(dir);
  const pattern = /https?:\/\/(?!www\.w3\.org\/)/gi;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (text.includes("floridacnc.com")) hits.push(`${file} mentions floridacnc.com`);
    const found = text.match(pattern);
    if (found) hits.push(`${file} ${found[0]}`);
  }
  return hits;
}

function walkText(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkText(path, acc);
    else if (/\.(html|js|css|svg|json|webmanifest|txt)$/.test(entry.name)) acc.push(path);
  }
  return acc;
}

const support = JSON.parse(readFileSync(join(appsDir, "support.json"), "utf8"));

if (!meta) {
  console.error(`Usage: node verify-bundle.mjs <${Object.keys(ids).join("|")}>`);
  process.exit(1);
}

const project = join(appsDir, meta.folder);
const config = JSON.parse(readFileSync(join(project, "capacitor.config.json"), "utf8"));
const html = readFileSync(join(project, "www", "index.html"), "utf8");
const source = readFileSync(join(repoRoot, meta.webDir, "index.html"), "utf8");

if (config.appId !== meta.appId) fail(`appId is ${config.appId}, expected ${meta.appId}`);
if (config.appName !== meta.appName) fail(`appName is ${config.appName}, expected ${meta.appName}`);
if (config.webDir !== "www") fail("webDir must be www");
if (config.server?.url) fail("server.url is set. The app would load a remote site.");
if (config.server?.hostname && config.server.hostname !== "localhost") {
  fail(`server.hostname is ${config.server.hostname}`);
}
if (!html.includes('id="native-shell"')) fail("native shell was not injected into the app copy");
if (!html.includes(support.email)) fail("support email was not copied into the app");
if (!html.includes("native-support")) fail("support line was not added to the app copy");
if (source.includes(support.email)) fail("website index.html contains the support email");

const stripped = html.replace(/\n<!-- native-shell:[\s\S]*?<script id="native-shell">[\s\S]*?<\/script>\n/, "");
if (stripped !== source) fail("app index.html is not the website file plus the native shell");

if (key === "pastries") {
  if (!html.includes("native-pastries")) fail("pastries app copy is missing the home-screen hide rules");
  if (source.includes("native-pastries") || source.includes("native-shell")) {
    fail("website index.html contains the native app shell");
  }
  if (html.includes(`mailto:${support.email}`)) fail("pastries app copy must not open Mail");
  const remote = remoteLoads(join(project, "www"));
  if (remote.length) fail(`pastries bundle loads a remote address: ${remote.slice(0, 5).join(", ")}`);
} else if (!html.includes(`mailto:${support.email}`)) {
  fail("support mailto link was not added to the app copy");
}

if (key === "shopfloor") {
  const manifest = readFileSync(join(project, "www", "models", "available.json"), "utf8");
  if (manifest !== readFileSync(join(repoRoot, "shopfloor", "models", "available.json"), "utf8")) {
    fail("models/available.json was not copied");
  }
}

const icon = readFileSync(join(project, "resources", "icon.png"));
if (icon.toString("ascii", 1, 4) !== "PNG") fail("resources/icon.png is not a PNG");
const width = icon.readUInt32BE(16);
const height = icon.readUInt32BE(20);
if (width !== 1024 || height !== 1024) fail(`icon is ${width}x${height}, expected 1024x1024`);
const colorType = icon[25];
if (colorType !== 2) fail("icon must be RGB with no transparency (color type 2)");

const diff = execFileSync("git", ["diff", "--name-only", "--", meta.webDir], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();
if (diff) fail(`website folder ${meta.webDir} has uncommitted edits: ${diff}`);

const plist = readFileSync(join(project, "ios", "App", "App", "Info.plist"), "utf8");
if (!plist.includes("UIInterfaceOrientationPortrait")) fail("Info.plist is missing portrait orientation");
if (plist.includes("UIInterfaceOrientationLandscape")) fail("Info.plist still allows landscape");
if (!plist.includes("<key>ITSAppUsesNonExemptEncryption</key>")) fail("Info.plist is missing the export-compliance flag");

const storyboard = readFileSync(join(project, "ios", "App", "App", "Base.lproj", "Main.storyboard"), "utf8");
if (!storyboard.includes('customClass="AppViewController"')) {
  fail("Main.storyboard is not using AppViewController");
}
const scene = readFileSync(join(project, "ios", "App", "App", "SceneDelegate.swift"), "utf8");
if (!scene.includes("AppViewController()")) fail("SceneDelegate is not using AppViewController");
if (scene.includes("CAPBridgeViewController()")) fail("SceneDelegate still constructs CAPBridgeViewController");
const pbx = readFileSync(join(project, "ios", "App", "App.xcodeproj", "project.pbxproj"), "utf8");
if (!pbx.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${meta.appId};`)) fail("Xcode bundle id does not match app-ids.json");
if (pbx.includes('TARGETED_DEVICE_FAMILY = "1,2"')) fail("app still targets iPad as a native device");

if (errors.length) {
  console.error(`Bundle check failed for ${key}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const bytes = statSync(join(project, "www", "index.html")).size;
console.log(`${key}: offline bundle ok (${bytes} byte index, ${meta.appId})`);
