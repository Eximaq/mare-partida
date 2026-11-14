# F151 with six additional approved pants

Parent is published twelfth lot398a691 (tree6a465fecd; local equivalent a6e2fbc).
Twelve explicit original-look female WALK signatures, EAST/WEST:
21r3,22r36,133r15,161r27,175v51,182r38 with approved151v64.
No new artwork, animation, head calibration, runtime logic or universal wardrobe
claim. Existing147/168/none records remain identical. This extends combinations
of already approved pieces, not approval of new mixed art or custom appearances.

## Ownership proof

The native151 anatomy and every authored coat/neck/arm layer stay unchanged.
Pants use their own approved cloth/near/far/derived layers at5/5.1/5.2/5.3,
not their full body image. All original clocks, pivots and WEST pixels remain.
640Canvas samples cover eight pants (six new and147/168 controls),40ticks,E/W.
No pixel outside the pants-layer union changes; fully visible opaque coat pixels
stay exact; lower pixels outside coat influence match the independent pants
render exactly. Anatomy matches below238, but that boundary is NOT a crop or
mask: the exact author-owned layers are preserved above it as well.

Above238 differences for21/133/175 and168control are only original cloth
RGBA[0,0,0,1] pixels on previously transparent pixels, with zero coat contribution.
Tests assert those exact RGBA values and cloth provenance rather than relaxing
an upper-area threshold. They are not skin/arm owners or replaced torso pixels.
Versioned proof records contain coordinates, frames and responsible layers.

## Verification and limits

RED: published route did not select151+21. GREEN: all12 signatures select with
unchanged coat layers/clock. Negative custom, extra slot, variant and action guards
remain. Actual same-object WorldVisual21→182→none→21 uses two separate look runs:
24original draws select the new records and return exact pixels;24custom draws
match the published parent fallback byte-for-byte. The saved appearance remains.
Custom uses bob/pink,focused/green,dark; it is not newly supported native151.
No interactive browser/map test. No claim that this fixes every torso/pants pair.

Recipe: `python tools/package-slot151-expanded.py --root .` on the exact parent.
Reuses published PNG archives without adding or rewriting any image. Tests:
`node --test --test-concurrency=1 tests/rework-slot151-expanded*.test.cjs`.

Final scoped gates:11 tests passed (640 samples,240 legacy slot samples,24 exact
Canvas references, parent/archives invariants and selectors), plus48 headless
WorldVisual draws in two bounded processes. Archive audit:298 archives,
19336 original PNGs,179 head PNGs. Pages build passed. Package replay from the
published parent reproduces all four generated index/transport files byte-exact.
Full npm suite was not rerun; no global-CI claim. No remote mutation by this task.
