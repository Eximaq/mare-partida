# Approved equipped-composition catalogue

This catalogue exposes exact approved archive compositions as closed visual presets, not interchangeable equipment. It preserves PNG bytes, archive SHA-256, directions, body and authored timing. Missing timing is explicitly `review-states`, not certified combat/walk timing.

Rebuild from the approved-source checkout:

```
python tools/rework-outfits/build_catalog.py /path/to/approved-source
python tests/rework-outfits-catalog.test.py
```

Archives remain `productionEnabled:false` in their historical metadata. This opt-in test import does not override those records or certify hidden anatomy, arbitrary clothes, skin colours or other poses. Source-only packs without standalone frames are listed under `pendingArchives` until their original compositor is used.

## Layered-source presets

All 12 originally source-only archives are additionally represented as deterministic rendered ZIPs under `generated/` (124 total presets from 82 source archives). Rendering uses the byte-identical original ModularPilot compositor, no new pose/body or inferred hidden anatomy. Historical `approved:false`/`productionReady:false` flags remain in `sourceFlags`; the approval is for the shown composition archived in art-approved, not free combinations.

`archiveSource:local` uses build-local generated ZIPs. Other archives are pinned by the runtime to the approved-source commit and SHA-256 checked. Each ZIP stays byte-original where possible; derived compositions explicitly say `originalBytesPreserved:false`, `originalLayersPreserved:true`.

Reproduce layered sources by extracting the 12 `renderedSourceArchives` to directories named after each ZIP stem, then running:

```
node tools/rework-outfits/render_sources.cjs /path/to/extracted
python tools/rework-outfits/package_renders.py /path/to/extracted
```

Run the base `build_catalog.py` first to recreate its pending list. Original F6 NORTH rendering was independently compared pixel-for-pixel with the existing approved preset. Samples from torso130 and full outfit151/154/152/155 inspected. This is not browser or all-combination visual certification.
