import assert from "node:assert/strict";
import test from "node:test";
import { nativeShell } from "./sync-www.mjs";

const support = { email: "smilenbseen@hotmail.com", url: "https://floridacnc.com/support.html" };
const strip = /\n<!-- native-shell:[\s\S]*?<script id="native-shell">[\s\S]*?<\/script>\n/;

for (const key of ["shopfloor", "deadacre", "pastries"]) {
  test(`${key} shell strips back to the website file`, () => {
    const source = "<!DOCTYPE html><html><head><title>T</title>\n</head><body></body></html>";
    const html = source.replace("</head>", `${nativeShell(key, support)}</head>`);
    assert.equal(html.replace(strip, ""), source);
    assert.match(html, new RegExp(support.email));
    assert.match(html, /native-support/);
    assert.match(html, /menu-card/);
    assert.match(html, /data-screen="settings"/);
  });
}

test("shop floor and dead acre link the support email", () => {
  for (const key of ["shopfloor", "deadacre"]) {
    const html = nativeShell(key, support);
    assert.match(html, /mailto:smilenbseen@hotmail.com/);
    assert.doesNotMatch(html, /native-pastries/);
  }
});

test("pastries hides the website home-screen tools and does not open Mail", () => {
  const html = nativeShell("pastries", support);
  assert.match(html, /native-pastries/);
  assert.match(html, /data-act="home-screen"/);
  assert.match(html, /\.logo-grid/);
  assert.match(html, /hidePastriesWebOnly/);
  assert.doesNotMatch(html, /mailto:/);
});
