# Proven pants 133 overlays across matching punch families

Weapons 15,111,112,117 share the exact original punch body pack SHA and all fixed body-frame hashes with the existing 109 + pants 133 overlay contract. The adapter now admits matching packs rather than checking weapon 109 alone. Canvas dimensions remain 640 ×640 at density 4; no art is resampled.

Only rounding-correction patches are omitted from the clothed candidate. Genuine `replace-rgba-under-mask` weapon/hand layers are retained: for the added items, those layers contain the actual weapon. Removing all replacement operations would erase the equipment.

Carry overlays continue to require exact lower-body rest and per-frame anchors, matching pose counts and the established lateral idle source-frame contract. No composite clothed body is imported. The world entry point is limited to explicitly tested weapon IDs 109,15,111,112,117 and pants 133-only equipment, and the independent adapters still enforce their geometry proofs.

Tests in `player-rework-outfit-compatible-family-hd.test.cjs` verify native rendering for every attack state, unchanged pixels outside the pants region (allowing at most 6 channel units for existing compositing roundoff), preserved weapon replacement layers, unchanged inputs, and rejection of mismatched pack SHA and atomic composite families 2/3/14/110. Runtime coverage adds four complete original-appearance families with pants 133, exercising idle, walk and attack in every direction without mutating saves. Existing109 carry and attack regressions remain included.

Registrations remain calibration candidates, not new artistic approvals. This does not imply arbitrary torso, boots, hair, palette or female compatibility.
