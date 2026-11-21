# Local extension: existing147/168/182 into shared SOUTH walk

Not published. Base: local840f2fa, published-equivalent00ced76/tree527a9054.

Adds three previously approved garment sources to the SAME female SOUTH anatomy and40tick/1second walk. No new images, source archives, poses, gameplay changes or head JSON edits. The existing nine coats yield27additional coat/pants pairs,63total across seven pants; selector coverage is not a claim of every possible loadout.

147 uses its already authored clipped cloth.168/182 use their original separate cloth and original anatomical owner. Every visible owner pixel is fully opaque and exactly equal to the corresponding original body. The renderer clears only that domain from the garment before composition. It never redraws light skin or182's body complement over equipped boots, gloves or torso.

The182 complement does not intersect cloth in any of10source phases. At contact4/9 it DOES intersect1,410/1,412 actual visible boot155 pixels. All2,822retain the independent dressed-without-pants baseline RGBA. Its owner itself intersects zero visible boot pixels in those cases; that negative result is recorded separately, not claimed as coverage.

## Verification

- RED:147 with custom look and equipped slots returned no authored pants route before change.
-5focused tests:27new selectors,120custom ownership/return rasters across151/6/158,60independent Canvas-oracle rasters (original and custom), narrow negatives, non-vacuous boot/complement comparison.
-Independent Canvas oracle is RGBA exact, no tolerance. Pillow replay147/168 equals20approved references exactly.182 reference is Canvas-authored: Pillow differs by at most1RGB, alphaexact. These engine differences are recorded, not hidden with a relaxed renderer gate.
-WorldVisual headless test uses one actor and no clear/reset between147→168→182→coat6→coat158→147. It checks pending/published bundle handover, contact frames, original return, movement and stop/resume. Passed:18captured frames, loading retains prior publishedKey, ready activates the requested identity; return hashes exact. Walking distance48px, stop/resume phase0.6.
-Old source records/fields remain exact: stripping only the3new authoredPantsSouth.items entries restores the original entire index canonical JSON hash (computed independently from the parent gzip).

## Limits

Only walk SOUTH. Existing allowed coats6/7/137/144/151/158/165/172/179, gloves152, boots155 and supported head/appearance path remain unchanged.Weapons, other gloves/boots, NORTH and idle do not gain this route.130S36 is handled by the separate shared-coat followup documented alongside this file. Fallback remains explicit, not advertised as universal compatibility. Preservation:4approved preview PNGs and128frozen-coat rasters exact;344cosmetic selectors unchanged. Pages build passed. No live-browser/map validation or full-suite claim. No individual image resampling or palette reduction.
