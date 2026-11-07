# Paramecia visual reworks

Integrated from the owner's reviewed offline art packages on 2026-11-07. These assets are generated/custom artwork, not downloaded third-party game assets. The existing licensed/game sources remain unchanged in their original directories. Art generation and references are documented in the original source packages retained in Space.

| Folder | Source package |
| --- | --- |
| ope | Ope-Ope-fontes-atlas.zip |
| mero | Mero-Mero-previa (source/atlas delivery) |
| doku | Doku-Doku-previa, revised delivery v2 |
| ito | Ito-Ito-V2, with the subsequent four-direction hand contract |
| jiki | Jiki-Jiki v2, assembling gears and scrap |
| hoya | Hoya-Hoya source/atlas delivery |
| hana | hana-rework-preview source/atlas delivery |
| beta | Beta-Beta-preview source/atlas delivery |
| horu | Horu-Horu-preview source/atlas delivery |
| mato | Mato-Mato source/atlas delivery |
| bomu | Bomu-Bomu-rework source/atlas delivery |
| kobu | Kobu-Kobu-v2 source/atlas delivery |
| doru | Doru-Doru source/atlas delivery, **icons excluded** |
| supa | supa-rework-preview source/atlas delivery |
| beri | Beri-Beri-previa, passive aura only; current skill sheet/icon retained |

`paramecia-rework-manifest.js` records source rectangles and artwork paths. `paramecia-rework-data.js` adapts visual phases without replacing the legacy timeline rectangles, durations, damage, costs, targeting, status or projectile rules. Runtime modules load it before binding their data references.

The procedural Jiki drawing in `jiki-assembly-art.js` is the original v2 preview source adapted to a browser/CommonJS export. It adds no gameplay logic. Projectile assembly is frozen at release age when that presentation value is available; an online snapshot without that optional visual age displays the complete mass.

## Preserved choices

- Bari: all old art and icons retained.
- Doru: old icons retained, reviewed wax effects integrated.
- Beri: current six-sphere skill and approved icon retained.
- Kuku: unchanged; complete reviewed rework source was not available.
- All base assets retained for reversible integration.

## Validation and limits

Targeted runtime tests retain costs, timings, hit counts, projectile behavior, phase bounds and catalog semantics. New tests cover art selection, atlas bounds, original exceptions, Ito layer placement, Doku impact phase, Jiki charge/release presentation, Mato lifetime and Supa fractional frame timing. PNGs were decoded and rendered using the actual canvas drawing modules.

Ito's hand sockets come from the verified native96 idle poses. The current integration uses the actor's facing and idle cycle; alternate equipment, body compositions or locomotion may need more socket calibration after in-game review. No new character pose or combat lock is imposed to conceal that limitation.

Preview-only trailing frames after a logical effect has already ended do not prolong its runtime or introduce extra hits. Final browser/playfield validation is tracked by the integration task, not inferred from PNG integrity.
