# F182 original EW38_SN3: isolated SOUTH/NORTH walk

Local candidate on published PR331 tree `2fbf9029b29b61006526b0b6684ba268f5d55633` (local equivalent `3deb69cb`). This binds only the previously approved F182 EW38_SN3 SOUTH/NORTH source. Historical archive filenames and authoring metadata still say candidate; this does not approve other revisions or reopen the selected art.

Source archive SHA256: `a6b4587a08d81992454aa943be584ba7a7fb03218598b5e590085c50a9fca5f2`. All22 reference PNGs match `FAMILY182_SELECTED_INDEX.json` from selected-index ZIP `e42bfdbd5787b513f08f823340cdfc45d20b5336379a17569c3d8e2ce547c5f4`.

## Original layers and ownership

The author's recipe composites original base → cloth → owner RGBA, then restores original base bytes wherever both cloth and owner alpha are zero. The native equivalent uses complementary masks of that exact base: covered anatomy → original cloth → original owners → uncovered anatomy. The two anatomy layers have disjoint support and their raw RGBA union equals the original at every channel. No clothing pixels are copied into either anatomy layer; no new art, texture transfer, synthetic repair or generic renderer feature is introduced. Original cloth/owner PNG bytes are copied verbatim.

All22 source base hashes occur in the registered original female130 SOUTH s36/NORTH n39 body frames, carrying the same original/brown/original/brown/light appearance as existing F182 E/W. This binds identity only, not torso clothing or its interpolation. Head adjustment JSONs and cosmetic routes are unchanged.

## Exact selection and timing

Female original appearance, walk, legs182 alone; SOUTH10 and NORTH12 authored poses,512px at density4, logical128px and pivot64/112. Source durations remain SOUTH `[125,125,125,75,50,125,125,125,75,50]` and NORTH `[125,75,50]` repeated4 times.40 native ticks retain their unequal holds; the existing distance-driven gait remains unchanged. No movement/combat/network controller edits.

Explicit alternate variant fields, different source revision, wrong appearance, subsets and extra equipment reject this new route. It does not require a coat, and does not solve torso+legs combinations. Old E/W and all prior records/archive bindings are preserved. A new negative-to-positive selector test preceded implementation. The older preservation test now enumerates exactly the two additional F182 SN records rather than silently accepting arbitrary additions.

## Observed gates

-22 original reference poses and80 compositor ticks: zero RGBA differences, no tolerance added.
-22 complementary anatomy unions: raw RGBA exact; all original body hashes registered.
-Source, selector, revision/clock negatives and preservation:8/8 focused checks passed.
-Real headless WorldVisual:1/1, one female character with legs182; both existing E/W sources selected, S/N rendered through160 natural gait draws, including stop/resume/teleport and A/B gait-state checks. This is not browser/map verification or approval of additional outfits.

Full native/npm/workflow suites were not run for this isolated candidate. Browser/map, other appearance palettes and torso+legs combinations remain outside this evidence. No publication, remote tree/ref or deployment is performed by this change.

Final isolated validation:15/15 related tests passed (28.6s), including the previous fourth-lot E/W320ticks and eleventh source regressions. Archive verification passed298 archives/19336 original source PNGs and179 head PNGs; Pages build passed. Both portable output ZIPs were reproduced byte-identically. The real world fixture peaked near931MiB at its ready-state snapshot in the first run; this is a measured snapshot, not a universal resource guarantee.
