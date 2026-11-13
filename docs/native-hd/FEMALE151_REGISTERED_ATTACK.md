# Female151 /154 /152 /155 native registered attack

Four new punch contracts (32 native640×640 frames) complete this exact female outfit's existing four-direction idle/walk family. The normal native provider can now validate and draw it without changing the saved equipment or using a legacy attack.

These are **new calibration candidates**, not new artistic approvals. The output PNGs are **derived lossless compositions**, not byte-identical copies of original PNG files. The underlying original512/640 source PNGs remain unchanged. No resizing, downsampling, invented equipment or generated anatomy is used.

## Source ownership

- Head/face/hair and class pose: exact `female` original unarmed base records.
- Pants154, boots155 and gloves152: identified native outfit packs. Lower body retains the known idle pose during attack.
- Torso151: original own outfit garment components. EAST/WEST core/sleeve reuse the explicitly identified151 layer from female111V3, but **not its baked unidentified body/pants/boots**.
- Sleeve parts use rigid native transforms and ownership clips. A small original garment patch covers sleeve joint gaps without scaling. SOUTH frame4 has an occluded upper arm in the class source; its visible hand supplies the registration instead of inventing anatomy.
- Head layers are redrawn at original depth above the arms. Opaque head pixels match the original class body. Lower pixels below physical400 match the identified original outfit (Canvas roundtrip allowance2 channel values).

## Reproduce

Create an output directory, then run:

```
REWORK_OUTPUT_DIR=/tmp/f151-output node tools/female-outfit151-native/build.cjs east
REWORK_OUTPUT_DIR=/tmp/f151-output node tools/female-outfit151-native/build.cjs west
REWORK_OUTPUT_DIR=/tmp/f151-output node tools/female-outfit151-native/build-sn.cjs
```

All referenced images load from checked-in ZIP archives. The source and output hashes are in `FEMALE151_REGISTRATION.json`. The explicit original class joint registration is retained alongside the scripts.

Test with `node --test player-rework-female151-attack-hd.test.cjs`. It checks all32 frames, four-direction family resolution, head/lower-body ownership, native size, saved-equipment preservation and rejection of unrelated palettes/garments. Existing512px walking tests remain separate and unchanged in scope.

## Remaining limitations

Sleeve folds, cuff rotation, static lower-body stance and the transition into attack can be refined as calibration. This does not enable other coats, arbitrary skin/hair palettes, different pants/boots, or equipped weapons. Contact sheets were inspected frame by frame; in-game playback/screenshots still belong to the normal integration verification, not this source-render claim.
