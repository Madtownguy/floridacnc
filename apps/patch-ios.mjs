// After `cap sync`, keep the native shell settings that Capacitor does not own:
// portrait lock, light status bar, no browser zoom, iPhone-only, export compliance.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appsDir = dirname(fileURLToPath(import.meta.url));
const ids = JSON.parse(readFileSync(join(appsDir, "app-ids.json"), "utf8"));
const key = process.argv[2];
const meta = ids[key];

function main() {

if (!meta) {
  console.error("Usage: node patch-ios.mjs <shopfloor|deadacre>");
  process.exit(1);
}

const project = join(appsDir, meta.folder);
const appDir = join(project, "ios", "App", "App");
const rgb = hexToUnit(meta.background);
const color = `UIColor(red: ${rgb[0]}, green: ${rgb[1]}, blue: ${rgb[2]}, alpha: 1)`;

writeFileSync(join(appDir, "AppViewController.swift"), appViewController(color));
writeFileSync(join(appDir, "PrivacyInfo.xcprivacy"), PRIVACY_MANIFEST);

const plistPath = join(appDir, "Info.plist");
let plist = readFileSync(plistPath, "utf8");
plist = plist.replace(
  /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CFBundleDisplayName</key>\n        <string>${meta.appName}</string>`,
);
plist = replaceArray(plist, "UISupportedInterfaceOrientations", ["UIInterfaceOrientationPortrait"]);
plist = replaceArray(plist, "UISupportedInterfaceOrientations~ipad", ["UIInterfaceOrientationPortrait"]);
plist = ensureKey(plist, "ITSAppUsesNonExemptEncryption", "<false/>");
plist = ensureKey(plist, "LSApplicationCategoryType", "<string>public.app-category.games</string>");
plist = ensureKey(plist, "UIStatusBarStyle", "<string>UIStatusBarStyleLightContent</string>");
plist = ensureKey(plist, "UIRequiresFullScreen", "<true/>");
writeFileSync(plistPath, plist);

const storyboardPath = join(appDir, "Base.lproj", "Main.storyboard");
let storyboard = readFileSync(storyboardPath, "utf8");
storyboard = storyboard.replace(
  'customClass="CAPBridgeViewController" customModule="Capacitor"',
  'customClass="AppViewController" customModule="App"',
);
if (!storyboard.includes('customModuleProvider="target"')) {
  storyboard = storyboard.replace(
    'customClass="AppViewController" customModule="App"',
    'customClass="AppViewController" customModule="App" customModuleProvider="target"',
  );
}
writeFileSync(storyboardPath, storyboard);

const scenePath = join(appDir, "SceneDelegate.swift");
let scene = readFileSync(scenePath, "utf8");
if (scene.includes("CAPBridgeViewController()")) {
  scene = scene.replace(
    "window?.rootViewController = CAPBridgeViewController()",
    `window?.backgroundColor = ${color}\n        window?.rootViewController = AppViewController()`,
  );
}
writeFileSync(scenePath, scene);

const pbxPath = join(project, "ios", "App", "App.xcodeproj", "project.pbxproj");
let pbx = readFileSync(pbxPath, "utf8");
pbx = pbx.replaceAll('TARGETED_DEVICE_FAMILY = "1,2";', 'TARGETED_DEVICE_FAMILY = 1;');
pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${meta.version};`);
pbx = pbx.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${meta.appId};`);
pbx = ensurePbxFile(pbx, {
  name: "AppViewController.swift",
  fileId: "A1B2C3D41FED796500168601",
  buildId: "A1B2C3D41FED796500168602",
  fileType: "sourcecode.swift",
  phase: "sources",
});
pbx = ensurePbxFile(pbx, {
  name: "PrivacyInfo.xcprivacy",
  fileId: "A1B2C3D41FED796500168603",
  buildId: "A1B2C3D41FED796500168604",
  fileType: "text.plist.xml",
  phase: "resources",
});
writeFileSync(pbxPath, pbx);

const schemeDir = join(project, "ios", "App", "App.xcodeproj", "xcshareddata", "xcschemes");
mkdirSync(schemeDir, { recursive: true });
writeFileSync(join(schemeDir, "App.xcscheme"), SCHEME);
console.log(`Patched iOS project for ${meta.appName} (${meta.appId})`);
}

function hexToUnit(hex) {
  return [1, 3, 5].map((start) => (parseInt(hex.slice(start, start + 2), 16) / 255).toFixed(4));
}

function replaceArray(plist, key, values) {
  const body = values.map((value) => `\t\t<string>${value}</string>`).join("\n");
  const pattern = new RegExp(`<key>${key.replace("~", "\\~")}<\\/key>\\s*<array>[\\s\\S]*?<\\/array>`);
  return plist.replace(pattern, `<key>${key}</key>\n\t<array>\n${body}\n\t</array>`);
}

function ensureKey(plist, key, valueXml) {
  if (plist.includes(`<key>${key}</key>`)) return plist;
  return plist.replace(
    "</dict>\n</plist>",
    `\t<key>${key}</key>\n\t${valueXml}\n</dict>\n</plist>`,
  );
}

function ensurePbxFile(pbx, file) {
  if (pbx.includes(`${file.name} in ${file.phase === "sources" ? "Sources" : "Resources"}`)) return pbx;
  const buildKind = file.phase === "sources" ? "Sources" : "Resources";
  pbx = pbx.replace(
    "/* End PBXBuildFile section */",
    `\t\t${file.buildId} /* ${file.name} in ${buildKind} */ = {isa = PBXBuildFile; fileRef = ${file.fileId} /* ${file.name} */; };\n/* End PBXBuildFile section */`,
  );
  pbx = pbx.replace(
    "/* End PBXFileReference section */",
    `\t\t${file.fileId} /* ${file.name} */ = {isa = PBXFileReference; lastKnownFileType = ${file.fileType}; path = ${file.name}; sourceTree = "<group>"; };\n/* End PBXFileReference section */`,
  );
  pbx = pbx.replace(
    "504EC3071FED79650016851F /* AppDelegate.swift */,",
    `504EC3071FED79650016851F /* AppDelegate.swift */,\n\t\t\t\t${file.fileId} /* ${file.name} */,`,
  );
  const phaseEnd = file.phase === "sources" ? "/* End PBXSourcesBuildPhase section */" : "/* End PBXResourcesBuildPhase section */";
  const phaseNeedle =
    file.phase === "sources"
      ? "504EC3081FED79650016851F /* AppDelegate.swift in Sources */,"
      : "504EC30F1FED79650016851F /* Assets.xcassets in Resources */,";
  pbx = pbx.replace(phaseNeedle, `${phaseNeedle}\n\t\t\t\t${file.buildId} /* ${file.name} in ${buildKind} */,`);
  if (!pbx.includes(phaseEnd)) throw new Error(`Could not find ${phaseEnd}`);
  return pbx;
}

function appViewController(colorLiteral) {
  return `import UIKit
import WebKit
import Capacitor

// Full-screen shell around the bundled game. Pinch-zoom and double-tap zoom
// stay off so the app does not feel like Safari. Saves stay in the web view's
// persistent store (localStorage) and survive relaunch.
class AppViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ${colorLiteral}
        lockBrowserGestures()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        lockBrowserGestures()
    }

    private func lockBrowserGestures() {
        guard let scroll = webView?.scrollView else { return }
        scroll.bounces = false
        scroll.alwaysBounceVertical = false
        scroll.alwaysBounceHorizontal = false
        scroll.minimumZoomScale = 1
        scroll.maximumZoomScale = 1
        scroll.pinchGestureRecognizer?.isEnabled = false
        for gesture in scroll.gestureRecognizers ?? [] {
            if let tap = gesture as? UITapGestureRecognizer, tap.numberOfTapsRequired >= 2 {
                tap.isEnabled = false
            }
        }
    }
}
`;
}

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyTrackingDomains</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
`;

const SCHEME = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "2600"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES"
      buildArchitectures = "Automatic">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "504EC3031FED79650016851F"
               BuildableName = "App.app"
               BlueprintName = "App"
               ReferencedContainer = "container:App.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      shouldAutocreateTestPlan = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableReference
         BuildableIdentifier = "primary"
         BlueprintIdentifier = "504EC3031FED79650016851F"
         BuildableName = "App.app"
         BlueprintName = "App"
         ReferencedContainer = "container:App.xcodeproj">
      </BuildableReference>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableReference
         BuildableIdentifier = "primary"
         BlueprintIdentifier = "504EC3031FED79650016851F"
         BuildableName = "App.app"
         BlueprintName = "App"
         ReferencedContainer = "container:App.xcodeproj">
      </BuildableReference>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;

main();
