// Fill the public support page, the privacy pages, and the Support lines in
// docs/IOS_RELEASE.md from apps/support.json. Change the email there, then run:
//   node apps/render-support.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appsDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(appsDir, "..");

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

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fill(template, support) {
  return template.replaceAll("{{email}}", esc(support.email)).replaceAll("{{url}}", esc(support.url));
}

function template(name) {
  return readFileSync(join(appsDir, "templates", name), "utf8");
}

function replaceSupportLine(text, label, value) {
  return text.replace(new RegExp(`^(- )?${label}: \`[^\`]*\`$`, "gm"), (_, dash) => `${dash || ""}${label}: \`${value}\``);
}

export function renderTree(support = loadSupport()) {
  const block = fill(template("privacy-support-block.html"), support).trim();
  const privacyPath = join(root, "privacy.html");
  const privacy = readFileSync(privacyPath, "utf8");
  if (!privacy.includes("<!-- support-block -->") || !privacy.includes("<!-- /support-block -->")) {
    throw new Error("privacy.html is missing the support-block markers");
  }
  const privacyNext = privacy.replace(
    /<!-- support-block -->[\s\S]*?<!-- \/support-block -->/,
    `<!-- support-block -->\n    ${block}\n    <!-- /support-block -->`,
  );
  const docPath = join(root, "docs", "IOS_RELEASE.md");
  const doc = readFileSync(docPath, "utf8");
  const docNext = replaceSupportLine(replaceSupportLine(doc, "Support email", support.email), "Support URL", support.url);
  return {
    "support.html": `${fill(template("support.html"), support).replace(/\s*$/, "")}\n`,
    "privacy/pastries.html": `${fill(template("pastries-privacy.html"), support).replace(/\s*$/, "")}\n`,
    "privacy.html": privacyNext.endsWith("\n") ? privacyNext : `${privacyNext}\n`,
    "docs/IOS_RELEASE.md": docNext.endsWith("\n") ? docNext : `${docNext}\n`,
  };
}

export function writeRendered(support = loadSupport()) {
  const pages = renderTree(support);
  for (const [rel, text] of Object.entries(pages)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return pages;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  writeRendered();
  const support = loadSupport();
  console.log(`Support pages now use ${support.email}`);
  console.log(support.url);
}
