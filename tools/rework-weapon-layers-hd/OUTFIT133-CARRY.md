# 109 + pants133 carry candidate

`MareReworkOutfitCarryOverlayHD.create(carryAPI,outfitIndex)` provides adapt, requiredFiles and render. Resolve the original compatible 109 carry first with its original outfit guard, then explicitly request the pants133 adapter. The caller must still reject every unsupported equipment slot rather than silently stripping its identity.

The adapter preserves the carry base pack and imports only `own133-isolated` / `pants133-visible-cloth-only` PNGs. No clothed body background is imported. All lower-body rest/pose coordinates must match. WEST walk uses the original EAST cloth before the existing whole-composition reflection. WEST idle checks reflected lower-body anchors against its actual WEST body.

All 64 walk and four cropped-hair idle compositions were rendered at 512 native pixels. SOUTH/NORTH rest and poses match exactly. EAST/WEST outfit forearm/elbow differs from the base, so those outfit arms are deliberately never imported. Original carry arms and gauntlets remain in front of pants. Original PNG bytes remain unchanged.

Visual QA found that lateral idle frame0 was an open walking silhouette despite matching placeholder leg anchors. The adapter instead uses the original standing frame12 cloth identified by the attack overlay contract. Native renders verify that this removes the detached/open trouser legs in idle.

Candidate limitations: lateral walk around frames9–12 retains small visible patches of the original blue shorts behind the overlay. This is not certified seamless clothing coverage. Existing carry glove limitations remain (small SOUTH skin slit; no invented far glove when the original body has no matching separate far hand). No source PNG/body silhouette was erased to conceal these issues. Candidate is suitable for explicit calibration review, not a claim of final visual approval.

Tests: `node --test player-rework-outfit-carry-overlay-hd.test.cjs`.
Audit output: `weapon-cycle-audit/109-pants133-carry/`.

Final idle identity check: the standing-frame12 exception applies only to static idle bases without `derivedFrom`. Original-hair idle bases now derive from walkframe0; those correctly retain clothframe0, including EAST cloth before WEST reflection. Both original-hair and cropped-hair idle in all four directions were rendered (72 total frames including walk). Lateral original idle is visibly an open stride, but cloth follows the same existing body pose; no closed trouser source is forced onto it. This remains a candidate, not user-approved art.
