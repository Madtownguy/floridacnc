import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { appViewController, uiColorLiteral } from "./patch-ios.mjs";

const appsDir = dirname(fileURLToPath(import.meta.url));
const ids = JSON.parse(readFileSync(join(appsDir, "app-ids.json"), "utf8"));

for (const [key, meta] of Object.entries(ids)) {
  test(`${key} keeps the patched native shell`, () => {
    const appDir = join(appsDir, meta.folder, "ios", "App", "App");
    const color = uiColorLiteral(meta.background);
    const swift = readFileSync(join(appDir, "AppViewController.swift"), "utf8");
    assert.equal(swift, appViewController(color, meta.statusBar));
    const scene = readFileSync(join(appDir, "SceneDelegate.swift"), "utf8");
    assert.match(scene, new RegExp(`window\\?\\.backgroundColor = ${color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(scene, /AppViewController\(\)/);
    assert.doesNotMatch(scene, /CAPBridgeViewController\(\)/);
    const plist = readFileSync(join(appDir, "Info.plist"), "utf8");
    assert.match(plist, new RegExp(`<string>${meta.appName}</string>`));
    assert.match(plist, /UIInterfaceOrientationPortrait/);
    assert.doesNotMatch(plist, /UIInterfaceOrientationLandscape/);
    const status = meta.statusBar === "darkContent" ? "UIStatusBarStyleDarkContent" : "UIStatusBarStyleLightContent";
    assert.match(plist, new RegExp(`<string>${status}</string>`));
    const pbx = readFileSync(join(appsDir, meta.folder, "ios", "App", "App.xcodeproj", "project.pbxproj"), "utf8");
    assert.match(pbx, new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = ${meta.appId};`));
    assert.doesNotMatch(pbx, /TARGETED_DEVICE_FAMILY = "1,2"/);
  });
}
