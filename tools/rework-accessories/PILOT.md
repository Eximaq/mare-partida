# Explicit idle accessory pilot

This is a test snapshot renderer, **not an arbitrary equipment integration**. It uses the actual supplied rework idle body and exact hairstyle/headgear target, never the old native96 body. Values remain restricted to the 837 exact targets; no missing direction/style adjustments are inferred.

Browser scripts, in order:
1. `tools/rework-accessories/vendor.js`
2. `player-rework-accessory-pilot.js`
3. `player-rework-accessory-test.js`

Factory: `MareReworkAccessoryTest.create({search, baseURL, onChange})`.
Opt in with `?reworkTest=accessories&accessory=N`; N is the 0-based snapshot index from `MareReworkAccessoryPilot.selections(manifest, catalogs)`. Without `accessory`, the first SOUTH-covered snapshot is chosen. The factory exposes `active`, `prepare(player,{action,direction})`, `draw(ctx,player,options)`, `snapshot()` and `projectileOrigin()`.

**Caller rule:** while `active`, `draw=false` is an explicit unsupported/loading/error state, not permission to draw the old character. Display `snapshot().error`. Only idle is available. Walk, attack, transforms and unadjusted directions are not silently replaced by an idle frame. The test mannequin ignores the save's appearance/equipment and must be labelled as such. No save data is changed.

All images are existing deduplicated assets under `tools/rework-accessories/assets/`. Vendor modules were copied verbatim from source packages, with their original hashes in `vendor/SOURCE_HASHES.json`. The wrapper isolates modules without mutating game globals. It intentionally does not call `HeadPresets.importFile`, which propagates visibility into unadjusted contexts. Only each exact record is validated/applied.

Validation:
- Six Node tests cover opt-in, mismatched targets, failure, unsupported state, no hidden propagation.
- `node tools/rework-import/validate_accessory_pilot.cjs OUTPUT` uses optional `@napi-rs/canvas`; all 837 targets rendered successfully at 512px.
- Example female/male item129 SOUTH inspected visually. This is not a visual signoff of all 837 combinations and does not certify walk/attack or other clothing.
