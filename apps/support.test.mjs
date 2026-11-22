import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadSupport, renderTree } from "./render-support.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("public pages match apps/support.json", () => {
  const support = loadSupport();
  assert.equal(support.email, "smilenbseen@hotmail.com");
  assert.equal(support.url, "https://floridacnc.com/support.html");
  const rendered = renderTree(support);
  for (const [rel, text] of Object.entries(rendered)) {
    const disk = readFileSync(join(root, rel), "utf8");
    assert.equal(disk, text, `${rel} is stale. Run: node apps/render-support.mjs`);
    assert.match(disk, new RegExp(support.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const supportPage = rendered["support.html"];
  const pastriesPolicy = rendered["privacy/pastries.html"];
  assert.match(supportPage, /mailto:smilenbseen@hotmail.com/);
  assert.match(supportPage, /Shop Floor/);
  assert.match(supportPage, /Dead Acre/);
  assert.match(supportPage, /Pastries and more!/);
  assert.match(pastriesPolicy, /does not collect data/i);
  assert.match(pastriesPolicy, /no account/i);
  assert.match(pastriesPolicy, /no ads/i);
  assert.match(pastriesPolicy, /no tracking/i);
  assert.match(pastriesPolicy, /network calls/i);
  assert.match(pastriesPolicy, /baker name/i);
  assert.match(pastriesPolicy, /mailto:smilenbseen@hotmail.com/);
  const doc = rendered["docs/IOS_RELEASE.md"];
  assert.match(doc, /com\.joshbutz\.pastries/);
  assert.match(doc, /Made for Kids/);
  assert.match(doc, /iconLogo/);
});
