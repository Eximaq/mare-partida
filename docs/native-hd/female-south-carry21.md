# Female SOUTH WALK: independent pants21 + weapons0/5/17

Increment after remote `b79348e47eacc105c403e407ca4c0999863333c1` (neck fix), based on source tree `ae0c8b508dda4d8c06eadf87ad75c78abe64ee90` + that neck patch. No new art, source PNG edits, palette reduction, image downsampling, combat edits, class-rule changes, merge or deployment.

## Exact scope and approvals

- Female WALK SOUTH only: pants21 plus Espada0, Mosquete5, Orbe17. Four equipment identities, three independently selected combinations. Each garment/weapon remains separate; removing21 keeps the weapon-only native route.
- Approved source order: weapon0/5 behind native arms,17 ahead. Only the real weapon's visible alpha contribution changes the existing pants rendering; outside that domain the no-weapon pants composition stays byte-exact. Semitransparency is composited, not made opaque. Contacts4/9 alter anatomy using the existing authored masks, not the weapon phase.
- Espada0: the approved8px candidate towards the female forearm is applied per original carry phase. Only translation changes; source grip/rotation/scale/sourceClip/depth unchanged. Existing padding64 retained, native output640²/pivot320,512.
- Mosquete5: unchanged native source and matrices, native512²/pivot256,448.
- Orbe17: exact sourceSHA `ae249c8a9e349b827a6d91a5951c10ef63edf91be9649cd8c0b48645d194d65b`; semantic material mask `e4a2f3c434849aabc41cb6037bc16c54ef3130ff21838c355bde9356c6ad287f` owns503 skin pixels. Saved skin ramp changes only those pixels, never source alpha, gold/blue/other material. No male rig/bindings imported. Native512²/pivot256,448.
- Sword grip and orb skin apply also to existing female SOUTH weapon-only, so removing21 cannot restore the uncorrected hand or grip. All source frames, the forty-tick pants clock and phase map `[0,1,2,3,3,4,5,6,7,7]` remain unchanged.

## Evidence

`tests/rework-female-south-carry.test.cjs`:90 native pose renders across three weapons and olive→dark→olive; nine remove/re-equip pants checks; same-actor cache A→B→A; 503px skin mask/alpha invariants;30 full native-image comparisons exact outside weapon alpha/depth domain, including authored contacts4/9. Source matrices/clip, dimensions and pivot enforced.

`tests/rework-female-south-carry-world.test.cjs`: actual WorldVisual consumer,18 drawings at ticks0/18/38; same actor object, valid equipment classes sword/gunner/strategist (not cross-class weapon equipping); weapon/21 removal and return; saved hair/blonde, eyes/amber and olive skin retained. Includes `idle`, `walk`, `attack`, class attack and `skill` in bundle preparation; existing fallbacks remain for other directions/actions. Six bundles completed in about22s total locally, under90s individual gate. This is headless normal-consumer evidence, NOT a browser/in-map screenshot or gameplay attack validation.

Additional local independent audit against unchanged source renderer:144 weapon-only N/E/W native frames bit-exact, and40 no-weapon SOUTH frames bit-exact (including21+130+152+155,21+151,133 and161) using same published neck fix. Selector audit64 cases:52 unchanged,12 differences confined to SOUTH (3 weapons × weapon-only/21 × original/custom look).

`tests/fixtures/female-south-carry-approved.json` records source review PNG/RGBA hashes and expected final RGBA hashes after the separately verified403-pixel neck correction. The regression test compares whole frames, not just a recomputed internal mask.

## Remaining coverage, not closed by this increment

|Scope|Status|
|---|---|
|Female SOUTH WALK0/5/17 +21|Native independent layers and normal consumer proved as above|
|Female NORTH/EAST/WEST WALK0/5/17 +21|No native combined selector; legacy fallback remains. Not declared integrated or visually validated|
|Weapon-only NORTH/EAST/WEST|Existing records retained;144 comparisons prove no regression, not a new approval|
|Additional pants, coats, gloves152, boots155 or headgear with this carry composition|Not enabled here; requires separate overlap/slot evidence|
|Attacks, other genders, all four-direction completion|Unchanged/outside this increment|

The earlier WorldVisual fixture used class sword with weapon5 and correctly failed `Equipamento sem fonte: weapon 5`; fixing the fixture to the catalog class gunner required no game changes. A contact regression was detected against the approved native preview: capture canvases retained a64px transform, and the native canvas implementation applied it again during pixel contact writes. The first domain-only oracle shared that transformed context and was insufficient. Captured contexts now save/restore to identity before contact writes; a dedicated identity assertion and frozen approval-hash oracle guard contacts4/9. Sword0 and Orbe17 now match the approved native review exactly except403 independently verified neck-palette pixels from the preceding published fix, with no alpha differences. Mosquete5 was independently checked against its original dark/cropped-pink/green review with the same neck-only403-pixel result. No domain enlargement or source painting was used.
