# Original hair: gear-only helmet integration

Eight actual item IDs:129,136,143,150,157,164,171,178 (not128). Male original hairstyle,32direction registrations. Existing helmetPNG plus explicit headBase only. Named hairstyle assets are not loaded or substituted.

Normal runtime uses a separate gearOnlyRecord. The base renderer retains originalhair and its selected palette. Exact croppedRGBA headBase and NECK/NOSE compatibility is required for everyframe, including mirroredWEST, before enabling the idle/walk/attack family. Gear is composited afterward at native100% scale with integer translation. Source PNG bytes unchanged.

Explicit candidate-calibration metadata:
- headStatus:gear-only-candidate-calibration
- headIdentity:exact-head-original-hair-preserved
- headOcclusion:source-alpha-only
- headGearScale:1

Alpha-only occlusion preserves everyoriginalhair pixel outside actualhelmetcoverage. Existing full/partialhairline masks were authored for different named, sometimes reduced hairstyles, so they are intentionally NOT applied to originalhair. Some spikes can remain visible beyond turban136; that is deferred candidatecalibration, not claimed as an approved fit. Four source directions lacked an approved100% gear scale; this path keeps native100% instead of resampling, also explicitlycandidate. No renamedhair alias and no saveappearance mutation.

Tests:2080source poses across8helmets validate exacthead andRGBA preservation outsidegearalpha. Additional normal-runtime renderer checks (Node canvas, not a browser capture) cover8families ×4directions ×idle/walk/attack. Unsupported female/fused-head contracts are not silently inferred. Other clothing/weapon combinations need their own head ownership proof; this addition does not claim universal pairing.
