# Frozen v47 glove sources in the native world

Selected sources follow `family-guide-v47/SELECTION_RULES.json`, not a latest-directory heuristic. The withdrawn F152 bilateral v1 is not imported. Existing walk fitting is reused without asking for renewed approval. Source candidate/near-only limits remain explicit.

## Male
Ten items (25,26,131,138,145,152,159,166,173,180), four directions and idle/walk/attack:120 records,1000 states. Exact outfit context is151/133/155 plus selected gloves. The frozen glove source and target133 pack have identical rest/poses and clocks. Only editable glove layers are transplanted, not the frozen body's different lower clothing. WEST compiles the source's explicit EAST mirror at native512 and only for the glove. Profile coverage remains near-hand-only where authored.

Attack candidates preserve current151/133/155. The previously composited152 is not stacked beneath another glove: upper artwork is rebuilt from the original no-glove151 source, with the existing155 lower region retained. Native glove rasters are translated to the same visible hand coordinates used by the152 integration. No new body or resized source is introduced.

## Female
The36 selected directions cover8 full item families plus131 without SOUTH and180 NORTH only. Selected walk layers share the exact40-tick body clock of151/154/155 and replace only the isolated152 layer. Attack bodies are rebuilt by the existing151 pipeline using original uncovered hand layers instead of152; source head and lower clothing remain unchanged. Glove sources are rigidly registered at native scale. Hair ownership mappings are transferred only to identical head pixels on the rebuilt bare-hand backing, never to glove overlays.

Four additional direction registrations (131 SOUTH and180 SOUTH/EAST/WEST) use only the current selected NORTH source of the same item. They are explicitly new calibration candidates, not claims that those directions were previously approved. They do not reuse a rejected source or mirror artwork into an invented source view. Native glove textures are placed on existing target hand centers and direction views; perspective, wrist shape and seams remain adjustable later.

## Reproduction and scope
Scripts in `tools/frozen-glove-native/` take `FROZEN_GLOVE_INPUT` containing the frozen `selected-index.json`, `selected/ref-*.json`, and the existing151 pipeline's original-hand-only outputs under `female-bare/`. `REWORK_OUTPUT_DIR` selects an output directory. Original embedded PNG bytes are preserved; derived mirror/registration overlays are additional native512/640 PNGs. Exact record IDs, source refs and proof files retain provenance.

No save appearance/equipment is rewritten. These records do not claim compatibility with arbitrary other clothes. Test suites check source identity, exact resolver contracts, native image loading and full runtime family selection; no repeated visual approval of already accepted sources is required.
