# Putting Shop Floor and Dead Acre on the iPhone

This is the checklist for after Apple approves the Apple Developer Program. You do it from Windows, in a browser. The Mac that compiles the apps is a GitHub computer. You do not need Xcode.

The two apps are:

| App | Home-screen name | Bundle ID | Game files |
| --- | --- | --- | --- |
| Shop Floor | Shop Floor | `com.joshbutz.shopfloor` | `shopfloor/` |
| Dead Acre | Dead Acre | `com.joshbutz.deadacre` | `zombies/` |

The bundle ID is the app’s permanent name inside Apple. Change it only in `apps/app-ids.json`, and only before the first upload. After an upload, Apple will not let that ID change.

The website copies at floridacnc.com/shopfloor/ and floridacnc.com/zombies/ stay as they are. An iPhone build copies those folders into the app. The installed app does not open the website.

## What already works

Every pull request that touches the games or `apps/` compiles both apps for the iOS Simulator. That check is the **iOS** workflow, job **Simulator**. A green check means the projects compile. It does not need an Apple account, and it does not put anything on your phone.

The **TestFlight** jobs in that same workflow do not run on a normal push. They run only when you start the workflow yourself and check the upload box, and only after the secrets below exist.

## 1. Gather seven values

You will paste them into GitHub, not into the code. On GitHub open the floridacnc repository, then **Settings → Secrets and variables → Actions → New repository secret**. Add one secret per row. The name has to match exactly.

### Apple Developer membership

Open [developer.apple.com/account](https://developer.apple.com/account) and sign in with the Apple ID you enrolled. Click **Membership details**.

| Secret name | What to paste | Where it is |
| --- | --- | --- |
| `APPLE_TEAM_ID` | The 10-character Team ID | Membership details, labeled Team ID |

### App Store Connect API key

Open [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** → **App Store Connect API**.

1. Copy the **Issuer ID** at the top of that page. That is secret `APP_STORE_CONNECT_ISSUER_ID`.
2. Click the **+** to make a new key. Name it `GitHub Actions`. Access **Admin**. Team keys are the ones that can sign apps. On a one-person account, the key you create here is that key.
3. Download the `.p8` file when Apple offers it. Apple will not let you download it again. Keep the file somewhere safe on your PC, outside this website folder.
4. The **Key ID** is in the table on that page. That is secret `APP_STORE_CONNECT_KEY_ID`.
5. Open the `.p8` file in Notepad. Select all of it, including the lines that say `BEGIN PRIVATE KEY` and `END PRIVATE KEY`. Paste that whole text as secret `APP_STORE_CONNECT_KEY`.

### A private repository for the signing certificate

The signing certificate has to live somewhere the GitHub build can read it back. It must not go in the public floridacnc repository.

1. On GitHub, create a **new private repository**. Name it `ios-signing`. Check **Add a README file** so the repository has a `main` branch. Do not make it public.
2. Secret `MATCH_GIT_URL` is the repository address, ending in `.git`. It looks like `https://github.com/Madtownguy/ios-signing.git`.
3. Secret `MATCH_PASSWORD` is a long password you invent. Write it in your password manager. It encrypts the certificate. GitHub never shows secret values again, so the password manager copy is the one you can look up.

### A GitHub token that can write to that private repository

The floridacnc workflow is not allowed to push to a different repository on its own. You give it a token that can only touch `ios-signing`.

1. GitHub → your profile photo → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name it `floridacnc ios signing`. Expiration: one year is fine. When it expires, TestFlight uploads stop until you make a new token and update the secret.
3. Resource owner: your user. Repository access: **Only select repositories** → `ios-signing`.
4. Permissions → **Repository permissions** → **Contents: Read and write**. Leave everything else at No access.
5. Generate the token and copy it once. Secret name: `MATCH_GIT_TOKEN`.

That is all seven:

1. `APPLE_TEAM_ID`
2. `APP_STORE_CONNECT_ISSUER_ID`
3. `APP_STORE_CONNECT_KEY_ID`
4. `APP_STORE_CONNECT_KEY`
5. `MATCH_GIT_URL`
6. `MATCH_PASSWORD`
7. `MATCH_GIT_TOKEN`

If you lose the `.p8` or the password, make a new API key, or empty the `ios-signing` repository and run the upload again. If Apple says you already have too many distribution certificates (the limit is a few), open [Certificates](https://developer.apple.com/account/resources/certificates/list), revoke an old **Apple Distribution** certificate, and run the upload again.

## 2. Create the two apps in App Store Connect

Still in App Store Connect: **Apps** → **+** → **New App**. Do this twice.

| Field | Shop Floor | Dead Acre |
| --- | --- | --- |
| Platforms | iOS | iOS |
| Name | Shop Floor | Dead Acre |
| Primary language | English (U.S.) | English (U.S.) |
| Bundle ID | `com.joshbutz.shopfloor` | `com.joshbutz.deadacre` |
| SKU | `shopfloor-ios` | `deadacre-ios` |
| User Access | Full Access | Full Access |

The name is the name on the store. If Apple says that name is taken, pick a longer one (for example `Shop Floor CNC`). The name under the icon on the phone stays the one in `apps/app-ids.json` until you change `appName` there.

Choose the bundle ID from the list if it is already there. If the box wants you to register a new one, type the ID from the table exactly. You cannot change a bundle ID after the app exists.

Leave the price at **Free**. Do not turn on in-app purchases.

You can create the apps before the first upload. The upload in the next step will fail if these records do not exist yet.

## 3. Send a build to TestFlight

TestFlight is Apple’s install-on-your-iPhone step before the public store.

1. Open the floridacnc repository on GitHub → **Actions** → **iOS** → **Run workflow**.
2. Branch: **main** (after this pull request is merged).
3. Check **Upload signed builds to TestFlight**.
4. App: **both**. Use shopfloor or deadacre when you only want one.
5. Click **Run workflow**.

The Simulator jobs run first. Then the TestFlight jobs sign each app and upload it. The first successful upload also creates the distribution certificate and saves it, encrypted, in the private `ios-signing` repository. Later uploads reuse it.

When the workflow is red, open the failed job. If a secret is missing, the log names the secret and does not print the secret’s value.

When the workflow is green, Apple still spends a few minutes processing the file (often 5–30 minutes, sometimes longer). Then:

1. App Store Connect → the app → **TestFlight**.
2. Wait until the build is there. If Apple asks whether the app uses encryption, answer **No**. The project already tells Apple the same thing. The games use no custom encryption.
3. On the iPhone, install Apple’s **TestFlight** app from the App Store. Sign in with the same Apple ID you enrolled.
4. Open TestFlight. Shop Floor and Dead Acre show up. Install them.

Progress you make in the app stays on the phone. It is separate from progress in Safari.

## 4. What the store listing still needs

Uploading a TestFlight build does not submit the app for public review. When you want the public store, open each app in App Store Connect, go to the iOS version, and fill this in. Both apps are free, with no ads and no purchases.

### Paste-ready text

**Shop Floor**

- Subtitle (30 characters max): `Run the CNC bay`
- Description: `Walk the CNC shop floor. Carry material, run machines, ship parts, and grow the bay. Shop Floor works offline. There is no account and there are no ads.`
- Keywords: `cnc,machine shop,factory,machinist,idle,simulator`
- Category: Games. Secondary: Simulation.
- Copyright: `2026 Josh Butz`
- Age rating: walk the questionnaire. Expect **4+**. There is no violence and no account.
- Support URL: `https://floridacnc.com`
- Privacy Policy URL: `https://floridacnc.com/privacy.html`

**Dead Acre**

- Subtitle: `Hold the bunker`
- Description: `Dead Acre is a tower defense game. Hold the bunker through fifteen waves of zombies. It works offline. There is no account and there are no ads.`
- Keywords: `tower defense,zombies,bunker,offline,strategy`
- Category: Games. Secondary: Strategy.
- Copyright: `2026 Josh Butz`
- Age rating: answer **yes** to cartoon or fantasy violence. Expect **9+**. There is no account, no gore photos, and no unrestricted web.
- Support URL: `https://floridacnc.com`
- Privacy Policy URL: `https://floridacnc.com/privacy.html`

Privacy questionnaire, for both: **Data Not Collected**. Saves stay on the device. The apps do not send them anywhere.

App Review notes you can paste: `Offline game. No login. Progress is saved on the device. No ads and no purchases.`

### Screenshots

Take them from the TestFlight app on the iPhone, so the picture is the game and not Safari.

On the iPhone: Side button and Volume Up together. AirDrop or email the pictures to your PC.

App Store Connect asks for at least one portrait screenshot in the slot **iPhone with Dynamic Island (medium display)**. Accepted sizes are **1179 × 2556** or **1206 × 2622** pixels. A current iPhone 14, 15, or 16 screenshot is 1179 × 2556. A newer Pro model may be 1206 × 2622. Either one is accepted. One to five pictures is enough. Ten is the maximum. JPEG or PNG, with no transparency.

If the site says the size is wrong, right-click the file on Windows, open **Properties → Details**, and read the dimensions. The other iPhone slots can be left empty. App Store Connect scales the required set down for smaller phones.

These apps are iPhone apps. You do not need iPad screenshots.

iPhone Duo screenshots are not required for this build.

### Then submit

Set the price to Free, pick the countries you want (all countries is fine), select the TestFlight build on the version page, and click **Add for Review**. Apple’s review is a separate wait. A rejection email will say what to change. The usual note for a wrapped web game is “minimum functionality.” These apps ship the game files inside the app, run with the network off, hide the browser chrome, stay in portrait, and keep their saves. Say that in the reply if a reviewer asks.

## Changing the games later

Edit `shopfloor/` or `zombies/` the way you already do. Pushing to `main` updates the website. It does not send a new iPhone build. When you want the phones to catch up, run the **iOS** workflow again with **Upload signed builds to TestFlight** checked. Each run gets a new build number, so TestFlight accepts it.

The version customers see is `version` in `apps/app-ids.json` (today `1.0.0`). Bump that when you want the store version to change, for example to `1.1.0`.

## Replacing the icon

The icons are drawn from each game’s existing favicon: the shop-floor machine, and the Dead Acre moon and zombie. They are not blank placeholders.

To redraw those, from the repository folder:

```
python apps/make-icons.py
```

That overwrites the icon and the launch image. To use your own art instead, replace these files with a square PNG that has no transparency, then do not run the script:

- `apps/shopfloor/resources/icon.png` (1024 × 1024)
- `apps/shopfloor/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (the same picture)
- `apps/deadacre/resources/icon.png`
- `apps/deadacre/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

The launch image is the PNG files in each app’s `Splash.imageset` folder. A flat background in the game’s color with the icon in the middle is what is there now.

## What the iPhone apps do

- Portrait only. Both games are built for a phone held upright.
- The game files are copied into the app at build time. Airplane mode still plays.
- No Safari toolbar, no pinch-zoom, no text-selection callout.
- The picture extends under the notch. The games already pad their buttons using the safe area.
- Shop Floor saves under the key `shop-floor-save-v3`. Dead Acre saves under `dead-acre-save-v2`. Both use the app’s own storage, so they survive closing the app and survive a phone restart. They do not sync with the website.
