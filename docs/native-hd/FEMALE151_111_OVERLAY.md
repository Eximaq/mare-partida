# Female outfit 151 + gauntlet 111 native overlay

Exact equipment only: torso151, pants154, glove152, boot155, weapon111. Twelve records cover idle, walk and punch in four directions (196 states). These are calibration candidates, not newly approved artwork.

The actual outfit source layers remain unchanged. Weapon111 original raster sources are registered without scaling. Punch uses the identical `sourceBaseId` as the outfit's registered punch. Idle/walk registration follows the visible authored glove152 alpha centroids of each actual outfit frame, not the bare character's animation. The physical PNG overlays are 512 or640 depending on their parent source canvas; the original source PNG files are not resized or overwritten.

The original outfit remains below the weapon, including glove152 as equipped. Only weapon overlay pixels change the output. Original head alpha masks protect the head during punch. Saved appearance and equipment are never rewritten. Existing verified hair palette masks stay attached only to the unchanged clothing/body sources, not the metal weapon.

Limits: walk retains the source weapon's idle angle; wrist orientation, far-side depth and seams remain calibration candidates. This does not extend to arbitrary garments or other weapon IDs. F6 walk has different visible-hand reconstruction and is intentionally not covered by this registration.

Reproduce assets and records using `REWORK_OUTPUT_DIR=/tmp/female151-111 node tools/female151-111-native/build.cjs`. The script reads source assets through the same archived-asset loader as tests. Regression: `node --test player-rework-female151-111-hd.test.cjs` checks the complete provider family, drawStable in12 action/direction pairs, all196 native state renders, strict item identity, rigid registration, unchanged clothing source layers and pixels outside the weapon mask.
