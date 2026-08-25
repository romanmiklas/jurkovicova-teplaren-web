# Jurkovičova Tepláreň — Cowork

A one-page marketing site for the Jurkovičova Tepláreň coworking / offices / events venue,
hand-coded from the Figma design in plain **HTML + CSS + vanilla JS** (no framework, no build step).

## Run it

It's a static site — open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 5577
# → http://localhost:5577
```

## Structure

```
index.html          all markup, one <section> per design block (00–10)
css/styles.css      design tokens (:root) + every section's styles
js/main.js          all interactions (one IIFE, commented per feature)
fonts/              APK Narrative web font (client-supplied)
images/             photos (optimised), exported SVG icons, logos
```

## Design fidelity

- Colours, radii, blur, spacing and typography are taken 1:1 from the Figma variables
  and live in `:root` at the top of `css/styles.css`.
- Built to the 1440 px desktop design.

### Font — APK Narrative
The design uses **APK Narrative** (licensed). The **Regular** weight you supplied is wired up via
`@font-face`. The design also uses a **Medium** weight (for a few strong labels); until that file is
supplied it is mapped to Regular. To enable it, drop `APKNarrative-Medium.woff` into `fonts/` and point
the second `@font-face` block at it.

## Interactions (js/main.js)

| Section | Behaviour |
|---|---|
| 00 Header | Hamburger opens the expanded mega-menu (anchors to sections); Esc / outside-click / X close it |
| 01 Hero | Auto-rotating expanding panels (Cowork → Offices → Events); hover/click to focus, pauses off-screen |
| 02 Building | Scroll-linked reveal — image dims + headline rises as you scroll through |
| 03 Offer | Cowork/Offices/Events accordion; each swaps the gallery, arrows browse it |
| 04 Pricing | Cowork / Offices tabs (cards rendered from a data array) |
| 05 Events | Space-type accordion (+/−) that swaps the preview image; arrows step through |
| 06 About | Horizontal image gallery with prev/next |
| 07 Tour | Two cards linking to the Matterport 3D tours |
| 08 FAQ | Single-open accordion |
| 09 Contact | Working form (front-end only — shows a confirmation on submit) |

## 3D tours (section 07)

From base4work.com (Matterport):

- Ground floor — `https://my.matterport.com/show/?m=DKPrZYytU46&ts=0&play=1`
- First floor — `https://my.matterport.com/show/?m=ro2yLGBB8oc&ts=0&play=1`

## Content that still needs your input (placeholders in place, styling final)

- **FAQ answers Q2–Q7** — only the first answer existed in the design; the rest are placeholders.
- **Events space types** — *Workshop room* copy/price is from the design; *Event hall / Large hall /
  Meeting room* descriptions and prices are placeholders.

## Notes

- Photos were downscaled to ≤1800 px / q80 (82 MB → ~7 MB) — imperceptible at the design's display
  sizes, much faster to load. Originals can be re-exported from Figma if needed.
- Icons are exported as SVG from Figma (amenities) or hand-built to match (nav, arrows, form).
