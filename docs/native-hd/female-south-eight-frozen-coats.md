# SOUTH: reuse eight current frozen coat layers with four pants

Parent: published69db1b1, identical tree to local933075ae. Scope is female WALK SOUTH; no new art, no sprite resampling, no new source PNG/ZIP/index entries. Peitorais6/7/137/144/158/165/172/179 reuse their exact existing frozen runtime records. Their historical candidate/calibrationPending/approvalPolicy metadata is unchanged; this is not a claim of new artistic approval.

## Shared composition
One current anatomical source8poses plus two authored contact masks yields the existing10-phase SOUTH gait. Each frozen coat stores the same8poses repeated5times in40ticks. The bridge proves rest, poses, base-layer identity, frame size, pivot, density and8/8 versus40/40fps clock equivalence before selecting it. Per-phase coat samples use `sourcePhase * 5`, preserving their exact authored transforms, depth and pixels. The source-only coat layers are rendered through the existing outfit renderer, not copied out of a dressed flat image.

Four existing pants175r4/133r4/161r4/21r13 now compose with these8coats:32additional coat-pants pairs. Coat151 remains the previous control, making36pairs for the9coats. Gloves152 and boots155 remain independent optional slots. There are zero new duplicated sprite rasters or per-combination source assets. The controller, gait duration and network behavior are untouched.

## Facial ownership correction during review
The initial prototype incorrectly applied coat151's backing repair to158. It changed308/316channels within the mouth/chin region although alpha stayed exact. That was rejected, not tolerated. The bridge now keeps the existing frozen face/occlusion contract for all8coats; only151 receives its previously proven facial restoration. All128 comparisons to the current frozen runtime (8coats ×2looks ×8original poses) are RGBA exact. This does not certify an aesthetic standard beyond preserving those sources.

## Evidence and limitations
- `rework-sn4-coat-frozen.test.cjs`:128exact full-native comparisons; frozen record and index hashes unchanged;344individual existing cosmetic options retain selection (43options ×8coats), not a Cartesian visual validation.
- `rework-sn4-coat-ownership.test.cjs`:640combinations of8coats/4pants/2looks/10phases preserve every pixel outside the original pants cloth/owner domain; coat/glove/boot/head ownership is not replaced by a pants flat. Original and cropped-blonde/amber/olive looks are tested.
- `rework-sn4-coat-bridge.test.cjs`: same actor151→6→7→137→144→158→165→172→179→151,30WorldVisual headless rasters, new route maintained and return pixel-exact. Includes distance-based gait, stop/resume; not an interactive map or a subjective natural-motion approval.
- Earlier151/152/155 and fourpants proof remains required, including approved technical PNG references, source domains, appearance and individual-slot changes.
- All sprite intermediates remain512RGBA/density4. Only final display scale changes. Preview exports are lossless PNG at native size; no GIF palette or sprite reduction.

Excluded: coat130s36 (different current approved source), NORTH, other gloves/boots, and all equipped weapons. These still use prior selection/fallback rather than this new pants route. Carry0/5/17 is a separate contract: paddingPhysical is64 for0 and0 for5/17, with per-part matrices/depth/sourceClip. No carry guard is relaxed here. Idle retains its existing renderer; no new idle source is claimed.

Release checks on this isolated candidate:9/9 focused tests (198s, serial),11/11 prior preservation tests,299native archives/19387original PNG sources and179head PNGs verified,Pages build and integration audit completed. The audit-generated canonical CSV is retained as a diagnostic outside the candidate, not substituted for historical records. No full-suite or interactive-map green is claimed. The lossless preview has eight native512RGBA cells; every cell is pixel-exact to its individual512PNG, with no scaling, quantization or transparency loss.
