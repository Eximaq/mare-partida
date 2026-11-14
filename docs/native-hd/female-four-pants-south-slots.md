# Four approved female pants: SOUTH slots and existing appearance

Scope: pants175r4,133r4,161r4,21r13, female WALK SOUTH only. Original ten authored phases and durations125/125/125/75/50/125/125/125/75/50ms,40ticks/40fps. Gameplay/controller unchanged. No NORTH replacement.

Cristian approved these four revisions in Sentinel_316027799fb88191a1e45fa12c4053b4 and the separate SOUTH151/152/155 materials in Sentinel_e216598b7a2481919c46204973585221. These receipts are distinct from connector authorization. No inference of arbitrary loadout approval.

The native selector now composes the existing personalized `v7-female-walk-drawn-all-south` anatomy, authentic lower contact replacement masks, separate selected pants, and optional coat151/gloves152/boots155. It does not reuse dressed flat bases. Old pants154 and its owner are omitted. A new pants slot cannot replace torso, boots, gloves, or head. Original hand ownership restores the CURRENT skin rather than the light source. Existing semantic protected-face boxes projected by authored NECK anchors preserve the current face; legitimate collar outside that mask remains unchanged. No globalY cut, palette extraction or new drawing.

Ten-phase mapping is0/1/2/3/3/4/5/6/7/7. Contact4 uses source3 plus source4 under roi-3-4; contact9 uses source7 plus source0 under roi-7-0. These exact masks are copied unchanged. Native cache IDs include selected slots and current appearance. Eligible cosmetics reuse the existing anatomical/head renderer; unsupported head routes or equipment use the previous selection behavior rather than claiming this new route.

## Evidence
- `tests/rework-sn4-slot-contract.test.cjs`: fourpants, original/bob-pink-green-dark/cropped-blonde-amber-olive, same actor, pants and individual slots removed/re-equipped; authored contact phases0/4/9, pixel-exact A-B-A. Pixels outside each pants' cloth/owner domain are identical to the same dressed actor without pants.
- `tests/rework-sn4-world.test.cjs`: actual WorldVisual headless, real equipment objects `{def}`, same actor;175→21→none, individual coat/glove/boot removal and return;21 walk rasters use the new source. Idle→walk→idle preserves the existing idle raster exactly. Idle still uses the previous renderer, NOT the new pants walking source.
- Independent local source replay's approved pose4 outputs and native outputs match RGBA exactly for all four pants. This is a source/renderer proof, not interactive map testing.
- Exact previous index/archive semantics are retained via strict hashed extension exclusion; prior baseline hashes stay unchanged. The existing F182 historical assertion now explicitly recognizes all18 prior151 signatures, not only6.
- Portable `build_authored_south_pants.py` reads original source members, checks the approved descriptor and creates canonicalSHA PNG input ZIP. No image transformation is used in packaging.

## Boundaries
NORTH is not complete: four anatomical phases require original cleaning/roll recipes. Existing idle/other directions/actions are unchanged. Arbitrary weapons, other coats/boots/gloves and unsupported appearance/head contracts are NOT enabled by this patch.6/158 contact compatibility research is not activated. Four hair/helmet positioning JSONs unchanged. No merge, deployment, interactive browser map or universal-wardrobe claim.

Local release checks:299 archives/19387 original PNG sources verified by size/SHA/CRC;179 head PNGs verified;Pages build succeeds. Existing baseline preservation11/11;native focus plus WorldVisual3/3 before the additional selector-enumeration test. Interactive map and general full-suite results are not implied by these targeted checks.

Additional review: ambiguous visible legs+pants is rejected, including equalIDs; each alias alone and absent/null/none/original alias remain valid. Headless movement now exercises the existing distance-based stepWalk with48world units, stop and resume tophase0.6, without modifying gait code. This is controller/gait integration, not an interactive map or a visual judgment of natural motion. All43individual UI appearance choices retain selection; only the three listed looks have raster proofs, not the Cartesian product. Selected head IDs18/19/129/136/143/150/157/164/171/178 retain the route in original/custom selector checks; full headgear raster coverage is not claimed. Other coats, gloves, boots and any equipped weapon remain outside this new contract.
