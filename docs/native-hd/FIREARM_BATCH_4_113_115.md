# Firearms 4, 113 and 115: native original-body integration

Adds complete original-appearance attack/idle/walk families for 4 and 113 and restores 115 SOUTH using the ORIGINAL DRAWN8 body. The previous approved 115 SOUTH composition with coat151/hair157 remains archived, with `originalAppearanceCompatible:false`; it is never selected for the original unarmored avatar.

115 SOUTH uses only equipment pixels from the approved V5 source, translated onto the unchanged original body/hands/hair. Eight target states reuse source keys 0,1,2,4,R,4,2,0. The final state's grip is (291,352). No raster resizing is applied. Placement and timing are calibration candidates, not newly visually approved composites. Rifle scale can remain visually discrepant between perspectives because approved source pixels are preserved as requested.

4/113 SOUTH and EAST/WEST similarly use existing weapon-only pixels and original body sources. Their NORTH original composite references are retained; Canvas premultiplied-alpha composition can differ by up to 2 channel units. This is explicitly recorded, not described as byte-exact renderer output. EAST/WEST fire horizontally in states 3–5 and return to vertical rest in states0/7.

Validation: `player-rework-firearm-batch-hd.test.cjs` renders all 95 attack/idle/walk frames for each of 4,113,115 using the archive-backed loader, without relying on ignored local PNGs. Existing weapon and rifle tests also pass (10 tests total in the focused run). No save appearance mutation is made. Original appearance support does not imply all saved skin/hair palette variants are supported: baked NORTH hair/hand palettes remain restricted rather than silently replaced.
