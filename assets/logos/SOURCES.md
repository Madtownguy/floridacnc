# Logo sources (downloaded 2026-10-18, each one viewed to confirm the company)

Logos are used only to identify the 7 machine lines Josh sells (Josh approved). Trademarks belong to their owners.
No Methods Machine Tools logo is used anywhere on the site (Josh: "Don't use Methods logo because I am not Methods"). The header and footer use a plain text wordmark, FLORIDA**CNC** (Teko, white with red "CNC") plus "JOSH BUTZ".
PNGs were trimmed to their visible edges and resized to 520 px wide max. No other edits.

| File | Brand | Where the file came from |
|---|---|---|
| fanuc.png | FANUC (yellow box, red wordmark). Used for both FANUC ROBODRILL and FANUC ROBOCUT, with the product name as text | Brands page of the Methods Machine Tools website (file `logo-fanuc-1.png`) |
| nakamura-tome.png | Nakamura-Tome | Methods Machine Tools website (file `logo-Nakamura-Tome.png`) |
| yasda.png | YASDA | Methods Machine Tools website (file `logo-YASDA.png`) |
| okk.png | OKK | Methods Machine Tools website (file `okk-logo-2.png`) |
| kiwa.png | KIWA | Methods Machine Tools website (file `logo-KIWA.png`) |
| united-grinding.png | UNITED GRINDING | https://cdn.grinding.com/typo3conf/ext/ugg_site/Resources/Public/Icons/Logo/UnitedGrinding/logo-united-grinding@2x.png (header of https://www.grinding.com/en/) |

The site does not link to the Methods website. If Josh wants every logo file to come from the manufacturer itself, swap these five PNGs for the logos in each manufacturer's site header (same file names, so no HTML changes are needed).

Fonts (assets/fonts/): Teko and Poppins, the heading and body fonts on the Methods Machine Tools website (Kadence theme: `--global-heading-font-family: Teko`, `--global-body-font-family: Poppins`). They are self-hosted latin subsets from Google Fonts under the SIL Open Font License (OFL-Teko.txt, OFL-Poppins.txt).

Colors (assets/style.css), sampled from the Methods Machine Tools website's CSS (Kadence `--global-palette*` variables on the home page) and its header logo (color sampled only; the logo itself is not used):
- #D70023: palette1, primary red (top bar, buttons, accents)
- #E4002B: red from the Methods header logo ("CNC" in the FLORIDACNC text wordmark, footer link hover)
- #920A20: palette10, dark red (button hover)
- #000000 palette3 (header wordmark block, footer, buttons), #212121 palette4 (body text), #5E5E5E palette5 (secondary text), #E5E5E5 palette7 (borders), #F7F7F7 palette8 (alt section background), #FFFFFF palette9

Social share image: `assets/og-image.png` (1200x630) is rendered from `/workspace/social/website-build/og-image.html` with the site fonts (headless Chrome screenshot).
