# Jurkovičova Tepláreň — website

Bilingual (SK / EN) one-page marketing site for **Jurkovičova Tepláreň** — coworking, offices and
event spaces at SKY PARK, Bratislava (operator: ALTO Real Estate).

- **Live:** https://www.jurkovicovateplaren.sk
- **Stack:** plain HTML + CSS + vanilla JS. No framework, no build step, no package manager.
- **Hosting:** Websupport (Apache + PHP). Deployed by uploading the files — see [Deploy](#deploy).
- **Design source:** Figma file `Mb7cVmtP7pPkGzcptmleBO` ("Jurkovicova Tepláreň Cowork – Website"),
  built 1:1 to the 1440 px desktop frame plus the mobile frame.

## Run locally

Any static server works. Opening `index.html` from disk also works, except the contact form.

```bash
python3 -m http.server 5577
```

Then open http://localhost:5577. `http.server` sends no cache headers, so hard-reload after edits.

## Repository layout

```
index.html        the whole page — one <section> per design block, numbered 01–10
404.html          standalone error page (own inline SK/EN script, does not load main.js)
privacy.html      privacy policy
cookies.html      cookie policy
contact.php       contact form handler — validates and e-mails the enquiry via PHP mail()
.htaccess         HTTPS + www redirects, HSTS, CSP, 404 page, blocks dotfiles / dev files
robots.txt, sitemap.xml

css/styles.css    everything: @font-face, design tokens (:root), then one block per section,
                  then the responsive blocks (≤1439, ≤1199 tablet, ≤720 mobile, ≤400) and the
                  accessibility blocks (reduced motion / transparency / contrast)
js/main.js        all interactions — one IIFE, one commented block per feature
js/i18n.js        SK/EN engine + the pricing data (cards are rendered from it)
js/consent.js     cookie banner + Google Consent Mode v2 (self-contained, runs on every page)
js/lenis.min.js   Lenis smooth scroll (vendored, desktop only)

fonts/            APK Narrative Regular (licensed — do not redistribute outside this project)
images/           optimised photos per section, SVG icons, favicons, og-share.jpg
```

Not in the repo (git-ignored, kept locally by the project owner): `_resources/` (font licence,
client documents) and `_figma_ref/` (Figma exports used while building).

## Page sections

| # | id | What it is |
|---|---|---|
| 00 | header | Sticky glass header; the menu button unrolls the dropdown (`.nav-panel`) |
| 01 | `#hero` | Expanding auto-rotating cards Cowork / Offices / Events + VR tour widget |
| 02 | `#building` | Scroll-linked photo reveal |
| 03 | `#offer` | Accordion Cowork / Offices / Events with a 3-image gallery per category |
| 04 | `#pricing` | Tabs Cowork / Offices; cards rendered from `PRICING` in `js/i18n.js` |
| 05 | `#events` | Accordion of 5 spaces, "What's in the price" and the 3-image gallery (both only for the two halls) |
| 06 | `#about` | Text + infinite horizontal photo gallery |
| 07 | `#tour` | Two cards linking to the Matterport 3D tours |
| 08 | `#amenities` | Location map with the "in near distance" card |
| 09 | `#faq` | Single-open accordion |
| 10 | `#contact` | Enquiry form (AJAX POST to `contact.php`) + contact people |

## How things work

**Languages.** The HTML is authored in English. `js/i18n.js` holds a `TARGETS` list of
`{ sel, mode, sk }` entries: on load it snapshots the English text from the DOM and swaps in the
Slovak strings (default language is SK, stored in `localStorage["jt-lang"]`). When you add or
change visible text, add or update its entry there, otherwise the Slovak version will not follow.
A `langchanged` event is fired so JS-rendered parts (pricing cards, welcome pop-up) re-render.

**Pricing cards** are not in the HTML. Edit prices, features, photos and VR links in the
`PRICING` object in `js/i18n.js` (both `en` and `sk`).

**Accordions** (Offer, Events, FAQ) share one helper, `accSwitch()` in `js/main.js`, which tweens
the real measured height. Image changes use the shared `wipeSwap()` clip-path transition.

**Scroll.** Lenis runs on desktop only (`window.__lenis`). Elements fade in through an
IntersectionObserver that toggles `.reveal` / `.is-in`.

**Tracking.** Google Tag Manager `GTM-TXMT3TKH` with Consent Mode v2 defaults set inline in
`<head>`; `js/consent.js` updates consent after the visitor chooses. Any new third-party domain
must also be allowed in the CSP in `.htaccess`, otherwise the browser blocks it silently.

**Contact form.** `contact.php` mails to `info@jurkovicovateplaren.sk` from
`noreply@jurkovicovateplaren.sk` (the sender must stay on this domain for SPF/DKIM).

**Design tokens.** Colours, radii, blur and spacing live in `:root` at the top of
`css/styles.css`. Known difference: Figma's `stone-100` is `#f9f5f1`, the site token is
`#fff6f2`; only the Tour section uses the Figma value so far.

## Deploy

There is no CI. Production is updated by uploading the site files to the Websupport web root.

```bash
zip -r -X ../JurkovicovaTeplaren_Website.zip . -x "*.DS_Store" ".git/*" ".gitignore" ".claude/*" "_resources/*" "_figma_ref/*" "README.md"
```

Two things have gone wrong before:

1. **`.htaccess` must be uploaded too.** It is a hidden file and file managers skip it. Without
   it the CSP is stale and Google Ads / GTM tracking breaks.
2. **Upload everything, not only `index.html`.** A new `index.html` with old `css/` and `js/`
   produces a broken menu and a visible "Skip to content" bar.

## Branches and versions

- `main` — the current version. Work on a short-lived branch and merge it back.
- Tags mark what went to the client or to production:
  - `v0.1` — first production version (summer 2026)
  - `v0.2` — client feedback rounds of September 2026

## Open items

- Networking lobby has no price yet (the row shows only the VR button) — waiting for the client.
- `/sk` and `/en` language URLs were discussed but not built; the language is client-side only.
