# F151 v64 with independent female pants147/168

Scope: original brown hair/eyes, original face, light skin; female WALK EAST/WEST.
Six explicit outfit records:151 alone,151+147,151+168, each side. This is a
slot correction for these approved combinations, not six new items or universal
wardrobe/personalization support.

Cristian approved the exact preview on 2026-11-14, message
`Sentinel_680f67052cb08191ab1715e7af335f3e`. The approved preview is
`Previa-experimental-151-com-calcas-147-168.png`. Source lineage and SHA/member
mapping are in `tools/rework-modular-outfits-hd/slot151-provenance.json`.
The existing authoring source ZIP is `F151_Four_Directions_Materials_Lobby_Candidate_V3.zip`
SHA `ed67071e3d570231275e2e35a06b7c595fc7cf401fd3f023fe7a7b90e051e63e`,
whose E/W packs match the v64 approval addendum. The contextual Nov09 approval
alone does not prove the two old video files identical; their bytes differ.
The new explicit approval covers this demonstrated pair, not other looks.

## Composition

Keep original151 anatomy, its eleven separate garment/anatomical layers and all
original depth values. Discard donor pants154, gloves152 and boots155. The base
has original blue underwear, not equipped154. Add current147/168 cloth and actual
lower owner layers at depths5,5.1,5.2,5.3. Do not substitute the derived147 body:
its altered chest would change151. No raster extraction, rescale, recolor or new
sprite pixels. Authored WEST is retained.512canvas,density4,pivot64/112;
12 authored phases expanded40ticks/40fps,1second, original poses/clock unchanged.

`python tools/package-slot151.py --root . --source-zip /path/to/source.zip`
reproduces the descriptors and transport from approved source bytes and
current immutable pants records; all116 PNGs already exist in published archives,
so no duplicate production archive or new production PNG is added; run against the parent before adding this batch.

## Tests and limits

- RED observed before packaging: approved torso route missing.
- Contract, original/extra/variant/custom negatives and complete parent-index invariant.
-240 production Canvas ticks: no changed pixels outside pants ownership; no change
  to fully visible opaque coat pixels. All retained coat descriptors identical.
-24 immutable approved preview reference frames compared against final Canvas.
-Real WorldVisual headless, actual Image.decode, same object:
 147→168→none→147 in original and custom look,24draws each. Original selects151
 throughout and returns exact pixels. Custom results match published12cda7d
 fallback captures exactly; custom remains legacy route, NOT newly supported HD.
-Current custom binding is intentionally not relaxed: complete12phase anatomical
 material ownership and removal/replacement of original head still need proof.
-No gameplay/controller/input/cache/headJSON change. No live-map/browser claim.
-Other torsos, directions, attacks, accessories and clothing remain on prior routes.

### Cross-engine proof, not a loosened tolerance

The approved contact-sheet samples were composed in Pillow. Re-running its exact
source recipe reproduced all24 archived PNG bytes. Independently replaying the
original authoring ZIP directly with Canvas drawImage in author depth order,
without the vendor renderer, reproduced the final production output RGBA exactly
in all24 samples. That canonical Canvas reference is versioned separately.

Pillow versus Canvas is NOT pixel exact:230 channels exceed delta1 across24
samples, including100 opaque channels with delta2. Alpha is exact; maximum
premultiplied channel error2.0. Very low alpha2 can yield128 unpremultiplied RGB
delta. Coordinates/channels/frames are preserved in the cross-engine proof JSON;
no sprite pixels changed and no global tolerance increased. Native regressions
compare exactly to the independent Canvas reference; original approved Pillow
frames remain alongside it. Reproduce Canvas oracle using
`node tools/replay-slot151-canvas.cjs SOURCE.zip OUTPUT_DIR`.

### Aggregate verification limitation

Canonical run: foundation243/243; legacy266/271 before correcting the historical
11th-lot preservation test to exclude exactly these six new IDs. The preservation
rerun plus new contract passed4/4. The original old-record hashes were not changed.
The other non-green files were authored-ordered-attacks, eleventh-world,
ninth-world-bundle and starter-coat. Eleventh and ninth logged SIGKILL; ordered
and starter ended without a complete summary in the aggregate runner, so their
cause is not asserted. A single serial comparison of the exact eleventh-world
command on parentb651310e and this candidate reproduced status1/childSIGKILL
on both, after both completed320pants draws. This does not establish a cause
for every other harness, nor claim a wholly green aggregate suite.

Final scope is four affected equipment IDs182,151,147,168 including inherited
F182SN work, not four previously unintegrated items. Publication, browser/map and
remote CI remain separate steps owned by the coordinating reviewer.
