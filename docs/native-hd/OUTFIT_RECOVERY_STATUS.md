# Native clothing recovery

This report distinguishes source existence, exact saved-equipment contracts, and actual world eligibility. These are not interchangeable. Run `node tools/audit-native-outfit-contracts.cjs` after changing the clothing index.

## Verified recovery

- Existing coat151 on pants133, with or without boots9: 200 native rendered states across idle/walk/unarmed attack and four directions.
- Existing female sets6/147/152/155 and151/154/152/155: 16 records,328 authored/derived native512 states. Idle and walking exist in four directions. F151 attack is now registered as an explicit candidate; F6 attack closure is also registered and its forearm occlusion regression is corrected.
- Existing male boot134 outfit: six records,51 native512 states.
- Added coat151 on pants133/boots148: six records,50 states in SOUTH/NORTH only. This reuses identical base-body poses, the existing boot148 layer and the existing coat151 layer. No PNG changes, resampling, or generated art. Original candidate status retained. EAST/WEST are intentionally not fabricated.

New build: `python tools/extend_coat151_boot148_contracts.py`. Test: `node --test player-rework-coat151-boot148-hd.test.cjs`.

## Actual incomplete contracts

A subsequent native registration closes F151/154/152/155 with32 derived attack frames. Its head comes from the original class base; pants/boots come from the explicitly identified outfit, not the unidentified111 donor body. The index now has105 records and11 exact equipment sets, six with a complete idle/walk/unarmed family. The generated JSON lists each missing action/direction explicitly.

Female clothing packs include a visible-clothed-composite layer. Those pixels cannot be relabeled as a naked body or another arbitrary equipment set. Male drawn attack anchors remain static on some phases; simply attaching walking glove152 with those anchors produces floating equipment. The coat151 attack registration solves the coat only, not glove152.

A recovered female111 attack donor contains a visually similar skirt/boots, but its recipe declares only torso151/158/165/179. A regional pixel comparison against the identified female151/154/152/155 EAST walking frames did not establish equality. Do not silently assign that donor's unidentified lower-body garments to a saved pants/boots identity. This does not mean that those items have no art; it means their source and registration proof is incomplete.

## Preserved historical exclusions

The v47 inventory is a source/review inventory, not global production approval. It explicitly retains rejected F152 profilev12, withdrawn F152 bilateralv1, refused F131 compact SOUTH, F168v27 reopened samples, read-only F175 and F182 discrepancies, and unselected compatibility studies. These are not promoted by this integration.

The inventory explicitly calls out absent F131 SOUTH compact art and F180 SOUTH remaining a study. Other uncovered runtime combinations often have source material and need ownership/registration, rather than wholesale regeneration. Report them as such.

## World gate

The normal runtime currently requires a complete family before replacement. Therefore source-only or partial clothing records remain review-only. Do not describe their mere presence in the PR or explorer as live integration. No per-state silent switch to legacy or save-appearance substitution was introduced here.

The new151 registration is documented in FEMALE151_REGISTERED_ATTACK.md; earlier source-identity warnings remain valid for reusing unverified donor bodies, which this registration avoids.
