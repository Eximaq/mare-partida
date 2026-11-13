# Male151/133/152/9 punch closure

Four native640 attack records preserve the existing151 torso,133 pants,9 boots and original attack body/head. Only a glove152 overlay is added. Its source is the existing exact151/133/152/9 idle garment record, rendered at its native density4. No source PNG is resized or overwritten.

Registration is a calibration candidate: the native glove is translated onto visible hand regions of the same attack source. SOUTH neutral states use the two distal hand components; active states use the two large hand regions. NORTH uses the visible large hand components only. Profiles retain the source's near-only glove coverage. Hidden hands are not newly generated. Original idle glove shape/orientation is retained, so punch-fit calibration remains possible.

The hand-region evidence derives from original `skin-arms-phase` alpha minus the existing coat/pants/boot layer alpha in the hand-height range. It never deletes source body pixels. Records expose `registeredMale151Gloves152`, `sourceOutfitId`, `sourceGloveOutfitId` and `gloveRegistration`. Saved equipment/appearance remain immutable.

`tools/male151-gloves152-native/build.cjs` reproduces overlays using the saved component evidence; `player-rework-male151-gloves152-hd.test.cjs` checks normal-family loading and drawStable for all12 action/direction pairs without changing the save. Exact glove overlay registration remains separately marked candidate, not inferred artistic approval.
