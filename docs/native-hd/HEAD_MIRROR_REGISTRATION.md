# Native head family: mirrored walk registration

The male WEST walk is an explicit, existing mirror of the approved EAST raster. Previously `prepareFamily` rejected every dynamic head on that source, disabling otherwise compatible hairstyles and helmets for the entire world family.

`native-head-compat.js` now accepts an explicit `baseMirrorX` flag. It reflects the base head raster at native resolution and reflects both rest and animated NECK/NOSE anchors before the existing exact RGBA and anchor proof. No source PNG, saved appearance, scale, or helmet adjustment is changed. Unmatched anatomy remains rejected. The runtime passes the flag both during family preparation and per-frame preparation.

Regression: `node --test native-head-mirror-hd.test.cjs`. The pixel-level test covers every authored WEST walk frame and rejects a perturbed anchor. The normal provider test covers male cropped hair, with and without helmet 129, across idle/walk/attack and all four directions, including rendering at physical scale 1 and unchanged player identity. Both tests were observed failing before their respective implementation and then passing.

## Remaining compatibility boundaries

- Original male hairstyle has no pixel-identical match to any of the 12 named adjusted hairstyles in SOUTH/NORTH/EAST walk sources. It is not silently mapped to cropped.
- Female walk sources have fused head/face/hair ownership in `headBase`. All 12 composed adjusted head/hair styles were compared against the four fused walk heads; none matched exact cropped RGBA. Replacing this fused part requires an explicit approved source registration/mask rather than deleting approximate skin-colored regions.
- Head items 18 and 19 have SOUTH records only in the current head index. Missing directional artwork is not synthesized by treating SOUTH as all directions.
- Dynamic head support on unarmed naked-body families does not claim compatibility with every weapon or garment. Those providers retain their independent appearance and ownership requirements.

`HEAD_FAMILY_COVERAGE.json` records the actual complete-family gate, not visual approval or arbitrary wardrobe coverage. Existing source statuses, including zero-adjustment candidates, remain intact.

## Measured gate coverage

The completed audit evaluates 264 named-style/bare-body cases: 12 hairstyles × (no helmet + 10 helmet IDs) × 2 body types. **108 pass**, all masculine: 12 hairstyles with no helmet or one of IDs 129, 136, 143, 150, 157, 164, 171, 178. The remaining 156 fail with their concrete reasons recorded in the JSON. These are family preparation checks; the dedicated rendering regression covers cropped with/without 129, not visual approval of every combination.
