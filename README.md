# floridacnc.com: static site for Josh Butz, CNC machine sales in Florida

Plain HTML/CSS, no JavaScript, no frameworks, no trackers, no external fonts (Teko + Poppins are self-hosted).
Only external requests happen when a visitor clicks a link (YouTube, Instagram, TikTok, LinkedIn, manufacturer sites).
Colors and fonts follow Methods Machine Tools' color scheme (Josh's call), but there is **no Methods logo** anywhere: Josh is not Methods. The header/footer brand is a plain text wordmark, FLORIDA**CNC** + "CNC MACHINE SALES" (CSS `.wm`, `.wm-sub`, `.foot-wm`). Site copy is in a company voice (brand: Florida CNC); Josh Butz is named only as the contact person in the contact section and in JSON-LD (Person). No city/hometown anywhere; Methods is named only as a factual note (footer line "Representing machines available through Methods Machine Tools.", the "Video: Methods Machine Tools" credits, the YASDA overview (YASDA's own site names Methods its exclusive U.S. partner), and the trademark/"not an official site" disclaimer). The site has **no links to methodsmachine.com**; the only methodsmachine.com text is Josh's email address `jbutz@methodsmachine.com` (mailto). All specs, overviews and "Source:" links come from the manufacturers' own sites (fanucamerica.com / fanuc.co.jp, nakamura-tome.com, yasda.com, nidec.com, kiwa-mc.co.jp, grinding.com); specs that could only be found on the Methods site were dropped. The former eighth machine line was removed at Josh's request. See `assets/logos/SOURCES.md`.

## Files
- `index.html`: home page (machine-line cards link to the machine pages)
- `machines/*.html`: one page per machine line: `fanuc-robodrill`, `fanuc-robocut`, `nakamura-tome`, `yasda`, `okk`, `kiwa`, `united-grinding` (7 lines). Each has the logo, an overview, key models/specs copied from the manufacturer's own pages, related Shorts, official links, call/email buttons, and a "Source:" list in the footer.
- `assets/style.css`, `assets/favicon.svg`, `assets/og-image.png` (1200x630 social share card, source: `/workspace/social/website-build/og-image.html`)
- `sitemap.xml`, `robots.txt` (written by the generator)
- `assets/logos/`: the 7 machine-line brand logos (no Methods logo) + `SOURCES.md` (where each logo came from, plus the colors and fonts used)
- `assets/fonts/`: Teko + Poppins woff2 (SIL OFL, license files included)
- `assets/thumbs/*.webp`: local video thumbnails (frames from the Methods Shorts); each card links to the YouTube Short
- `videos/`: placeholder for future self-hosted MP4s (see `videos/README.md`)
- `CNAME`: contains `floridacnc.com` (GitHub Pages custom domain)
- `.nojekyll`: tells GitHub Pages to serve files as-is
- `preview-desktop.png`, `preview-mobile.png`, `preview-machine-desktop.png`, `preview-machine-mobile.png`: screenshots only (fine to leave out of the repo)
- Generator (NOT part of the site, lives outside this folder): `/workspace/social/website-build/build.py` rewrites `index.html` and `machines/*.html` from the data at the top of the file. Edit the data there and run `python3 /workspace/social/website-build/build.py`, or edit the HTML by hand (if you hand-edit, don't re-run the generator).

## Before publishing (needs Josh)
1. LinkedIn: in `index.html` find `TODO(Josh)` and replace `href="#"` with the LinkedIn profile URL.
2. Confirm the 7 machine lines (the former eighth line was removed at Josh's request) and the OKK Florida availability note.
3. Confirm the one-line machine descriptions and the model picks on each machine page (models were re-picked from the manufacturers' current pages; e.g. ROBODRILL now lists FANUC's α-DiB Plus models, and Methods-only products like The Sidekick and RoboDrill Plus K900 are no longer listed).
4. Confirm Methods is OK with a personal sales-rep site using its color scheme, product names, the footer line "Representing machines available through Methods Machine Tools" and its Shorts (and the brands' logos). The Methods logo has been removed. Five brand-logo PNGs were originally downloaded from the Methods site (see SOURCES.md); swap them for manufacturer-hosted files if preferred.

## Preview locally
    cd website && python3 -m http.server 8000   # open http://localhost:8000

## Deploy to GitHub Pages (exact steps)
Nothing below has been done yet. Do NOT change DNS until steps 1-6 work.

1. Create or sign in to a GitHub account (email signup). Call the username `USERNAME` below.
2. Create a new **public** repo, e.g. `floridacnc` (no README, no license, so the first push is clean).
3. Push this folder:

       cd /workspace/social/website
       git init -b main
       git add index.html machines assets videos CNAME .nojekyll README.md
       git commit -m "floridacnc.com static site"
       git remote add origin https://github.com/USERNAME/floridacnc.git
       git push -u origin main

4. On GitHub: repo **Settings > Pages > Build and deployment**: Source = **Deploy from a branch**, Branch = `main`, folder = `/ (root)`, **Save**.
5. Same page, **Custom domain**: should already read `floridacnc.com` (from the `CNAME` file). If not, type `floridacnc.com` and **Save**.
6. (Recommended, prevents domain takeover) Profile **Settings > Pages > Add a domain** > `floridacnc.com`. GitHub shows a TXT record (`_github-pages-challenge-USERNAME` + value). Add it in GoDaddy (step 7) and click **Verify**.
7. GoDaddy > My Products > floridacnc.com > **DNS**. Export/screenshot the current records first. Make ONLY these changes:
   - Delete the apex `A @ 34.75.149.139`.
   - Add four `A` records, name `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - (Optional IPv6) four `AAAA` records, name `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
   - Change `CNAME www` from `floridacnc.com` to `USERNAME.github.io`.
   - Add the TXT from step 6 (if used).
   - **Do not touch** MX, the SPF / `NETORGFT...onmicrosoft.com` TXT records, `autodiscover`, `msoid`, `lyncdiscover`, `sip`, the SRV records, `email`, or `_domainconnect`. Those carry Microsoft 365 email.
   - Do not change nameservers.
8. Wait for DNS (minutes to ~24 h). Check: `dig +short floridacnc.com` returns the four 185.199.x.153 addresses.
9. GitHub **Settings > Pages**: once the certificate is issued, tick **Enforce HTTPS**.
10. Test: https://floridacnc.com and https://www.floridacnc.com load; open every machine page from the Machines menu (e.g. https://floridacnc.com/machines/fanuc-robodrill.html) and check that the logos and fonts load; call/email links work on a phone; send a test email to the floridacnc.com mailbox to confirm mail still works.

## SEO (done in the generator)
- Unique keyword-aware `<title>` + meta description per page (`SEO` dict in build.py), one `<h1>` per page, h2/h3 outline, canonical `https://floridacnc.com/...` URLs, Open Graph + Twitter card tags with `assets/og-image.png`.
- JSON-LD: home = WebSite + ProfessionalService (Florida CNC / Josh Butz: phone, email, area served Florida, no address) + Person + ItemList of machine lines; machine pages = WebPage + BreadcrumbList + ProfessionalService + Brand, and Product entries for the models listed (not on United Grinding, which lists brands, not models).
- `sitemap.xml` (8 URLs) and `robots.txt` (allows all, points to the sitemap, keeps the `preview-*.png` screenshots out).
- All images have alt text and width/height; below-the-fold images are `loading="lazy"`. No JS, self-hosted fonts.

## SEO steps after deploy (manual, needs Josh's Google/Microsoft login)
1. Google Search Console (https://search.google.com/search-console): add a **Domain** property `floridacnc.com`, verify with the TXT record it gives you (GoDaddy DNS, add only that TXT), then **Sitemaps** > submit `https://floridacnc.com/sitemap.xml`. Use **URL Inspection** > Request indexing for the home page.
2. Bing Webmaster Tools (https://www.bing.com/webmasters): sign in, **Import from Google Search Console** (fastest) or add the site and verify, then submit the same sitemap.
3. Google Business Profile (optional): a service-area business with no street address shown, service area = Florida, same phone/email/website. Only if Josh wants a profile under his own name.
4. Check rich results: https://search.google.com/test/rich-results and https://validator.schema.org with each live URL.
5. Link the site from Josh's Instagram, YouTube, TikTok and LinkedIn bios.

## Updating
Edit files, then `git add -A && git commit -m "update" && git push`. Pages redeploys in about 1 minute.
