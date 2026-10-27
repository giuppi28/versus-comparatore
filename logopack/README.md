# VERSUS logo pack

Normalized supplier logos for the 11 real suppliers plus 4 new ones added on 2026-10-27 (the placeholders `tutela`, `altro-fornitore`, `non-lo-so` have no logo by design; the UI shows the text chip).

```
logopack/
  color/<slug>.svg   official colors            -> copied to app/public/logos/<slug>.svg (used by the app)
  black/<slug>.svg   monochrome #000000
  white/<slug>.svg   monochrome #ffffff
  preview.html       static grid, light + dark backgrounds, all 3 variants (open with file://)
  preview-light.png / preview-dark.png   screenshots of the preview (Playwright, chromium)
  tools/build.mjs    rebuilds everything from the originals (node --no-warnings logopack/tools/build.mjs)
  tools/preview.mjs  rebuilds preview.html + the PNGs
```

Files are named after `suppliers.slug`. Rebuild needs Node >= 22 and `app/node_modules` (xmldom, playwright, sharp); the originals are read from
`/Users/pippo/Desktop/versus elementi/logopack/originali/` (read-only, never modified).

## Sources

All logos are the `*-logo.svg` file of the "originali" pack (see its MANIFEST.md for the original URLs; kinds: Original = byte-for-byte as published).
No raster (PNG) file is shipped and no symbol-only variant is used. Two of the 2026-10-27 logos (Sentra, Asti) are vector traces of official raster files (see MANIFEST.md).

| slug | Source file (originali/) | Kind (MANIFEST) | Notes |
|---|---|---|---|
| enel-energia | enel/enel-logo.svg | Original (Wikimedia, 2016 gradient logo) | gradient + grey bars; no viewBox in the original (derived from width/height) |
| eni-plenitude | eni-plenitude/eni-plenitude-logo.svg | Original (eniplenitude.com) | dog + "plenitude" |
| edison-energia | edison/edison-logo.svg | Original (Wikimedia 2016) | uses `<mask>`/`<use>` for the symbol |
| a2a-energia | a2a/a2a-logo.svg | Original (a2a.it) | includes the "LIFE COMPANY" tagline; the 72 KB original was mostly an Adobe Illustrator metadata blob, removed |
| hera-comm | hera/hera-logo.svg | Original (Wikimedia) | includes "GRUPPO" |
| iren | iren/iren-logo.svg | Original (Wikimedia, group logo) | the retail lockup "luce gas e servizi" only exists as a small PNG: not used |
| acea-energia | acea/acea-logo.svg | Original (acea.it, current mark) | square emblem (wordmark is part of it) |
| sorgenia | sorgenia/sorgenia-logo.svg | Original (sorgenia.it) | includes the "YOUR NEXT ENERGY" tagline |
| engie | engie/engie-logo.svg | Original (Wikimedia, 2026 flat logo) | |
| eon-energia | eon/eon-logo.svg | Original (Wikimedia) | |
| iberdrola | iberdrola/iberdrola-logo.svg | Original (Wikimedia, 2023) | |
| sentra-energia | sentra/sentra-logo.svg | **Traced** (vectorised from the official 1200 px logo on sentra.it; no SVG exists) | added 2026-10-27; edges slightly softer than a native vector |
| estra-energia | estra/estra-logo.svg | Original (inline SVG of corporate.estra.it) | added 2026-10-27; estra.it now redirects to aliaestra.it (Alia + Estra / Plures) |
| enegan | enegan/enegan-logo.svg | Original (enegan.it) | added 2026-10-27; includes the "Energy partner" tagline |
| asti-energia | asti-energy/asti-energy-logo.svg | **Traced** (vectorised from the official 1862 px PNG on aenergy.it; no SVG exists) | added 2026-10-27; the brand shown is "Aenergy" |

Alternates exist in the source pack if a tagline-free version is preferred later (not used): `a2a-symbol.svg` (a2a wordmark without tagline), `sorgenia-symbol.svg` (star only), `*-symbol.svg` for Enel (traced), Plenitude, Edison, Hera, Iren, Iberdrola.

## Transformations (shapes are never edited)

1. **Clean**: removed XML prolog/DOCTYPE, comments, `<metadata>`, editor/foreign namespaces (Illustrator `i:`, Inkscape, cc/dc/rdf), `title`/`desc`, `version`, `data-name`, `mask-type`, root `width`/`height`; removed unreferenced `id`s and unused `<defs>` entries (e.g. unused gradients/polygons in Iren). All remaining ids are prefixed with a short supplier prefix (`enel-`, `plen-`, ...) so logos can be inlined in the same page without id collisions.
2. **Sanitize**: serialized through the app's own sanitizer (`app/src/lib/svg/sanitize.ts`). Nothing had to be stripped by it, and every output is a fixed point of it (`sanitize(out) === out`, `removed = []`). No external references, no scripts, no raster images, no remote URLs. Sizes: 1.1 KB (Engie) to 17.9 KB (Plenitude), all far below the 200 KB limit.
3. **Tight viewBox** (visual convention, same for every file and every variant): the viewBox is the bounds of the *rendered* artwork (chromium, alpha >= 16/255 at 2400 px width) plus a uniform padding of **5 % of the artwork height** on all four sides. Intrinsic size: **`height="48"`**, `width` from the aspect ratio (Acea 48x48 ... Iberdrola 181x48). So at equal CSS height all logos get the same optical box height; wide wordmarks are wide, the Acea emblem is square. (Taglines in A2A/Sorgenia are part of the official lockup and count in the height.)
4. **Monochrome**: every `fill`, `stroke` and `stop-color` (attributes, `style=""` and `<style>` rules) set to `#000000` / `#ffffff`; the root gets the target `fill` so unpainted shapes follow. Masks and clip paths are left untouched. Gradients keep their geometry and `stop-opacity` (Enel's fade-out tails stay faded), only the stop colors change. `fill="none"` stays `none`.

## Verification (run by `tools/build.mjs`, repeated by `app/src/lib/svg/logopack.test.ts`)

- Sanitizer fixed point for all 45 files; `app/public/logos/*` byte-identical to `color/*`.
- Silhouette check: the alpha mask of `black/` and `white/` equals the one of `color/` (0 % differing pixels at 2400 px for all 15 logos), i.e. no shape changed.
- No artwork touches the edge of the viewBox (nothing clipped).
- Visual check of `preview-light.png` / `preview-dark.png`.

Note: the color variants of Iren (black wordmark), Hera and Edison (dark ink) are designed for light backgrounds; use `white/` on dark backgrounds.

## Missing

Nothing: all 15 suppliers have a usable vector logo. The 4 suppliers added on 2026-10-27 (`sentra-energia`, `estra-energia`, `enegan`, `asti-energia`) do **not** exist in the `suppliers` table yet: when they are created (admin or migration) use exactly these slugs and set `logo_path = '/logos/<slug>.svg'`. `logopack.test.ts` lists them in `EXTRA_PACK_SLUGS` until they are in the mock data. Not covered: logos of suppliers that may be added later through the admin area (uploaded as SVG and sanitized by the same function).
