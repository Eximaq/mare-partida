# Female NORTH layered WALK candidate (not published)

Baseline: published SOUTH tree ff7bb0d. This isolated change does not replace SOUTH, EAST or WEST. It does not prove attack/idle coverage or authorize publication by itself.

## Contract

One calça 21 garment contract, not one composite per weapon. Twelve authored contact poses are rig bindings over an eight-pose body: `[0,1,1,2,3,3,4,5,5,6,7,7]`, 40 ticks at 40 fps. The same rig is used with or without calça 21 and with or without weapons 0, 5 or 17. Weapon attachments keep NORTH's original transforms/depth; SOUTH's sword offset is not copied. Orbe skin uses the authorial NORTH material mask, preserving other material and alpha.

Selection currently supports those proven female NORTH WALK consumers only. Coats, boots, gloves and headgear combinations remain outside this candidate selector. The mixed 151/155 scratch experiment is not proof of integrated coverage. Never replace those slots with a closed composition or silently claim them covered.

## Sources and factoring

- `Female_North_Visible_Roll_V2.zip`, `walk-north-visible-roll-v2/`: authored visible apex sources and silhouette/roll reference.
- `Calca147_SN_Runtime_84.zip`, `original/candidate-s8-n9/north/base-{0..11}.png`: final authored body targets. Independent inspection matches four clothing archives (147/168/175/182), not weapon-specific bodies.
- `Calca21_SN_r13_Quatro_Vistas_Suplemento.zip`, `r13-inner-continuity/{cloth,owner,frame}-north-{0..11}.png`: exact garment bytes and owner-domain maps. Owner uses red/luma, not alpha (which is uniformly opaque).
- Original eight-pose `v7-female-walk-drawn-all-north` body layers remain source for non-leg anatomy and hidden leg pixels.

Visible target leg pixels are factored by exact RGBA/ordering against the original binary-alpha non-leg layers. Hidden original legs remain unchanged. At phases 3 and 9, respectively 18 and 54 arm pixels are occluded in the final authorial body. All 72 equal the exact apex-source pixels; 70 lie in the authorial silhouette, the other two are authorial transparent clearance pixels at (288,309)/(288,310). The arm-only masks model shared rig contact, independent of clothing or weapon. No skin-color ownership heuristic, new drawing or pixel resampling is used.

The 26 content-addressed 512px assets occupy 525631 bytes. Extracted cloth/owner images preserve archive bytes. Derived legs/contact masks are exact ownership factoring, not new artwork. Sources and outputs are hashed in the release evidence manifest.

## Validation / limits

- Original body replay: 12/12 zero RGBA differences. Original garment source replay: 12/12 exact in the original reference compositor.
- Native Canvas versus exported reference PNG: up to 1 RGB channel rounding difference from existing premultiplication, alpha unchanged. Native versus same native source replay is zero. Do not call that PNG byte equivalence.
- 108 local native poses: three valid classes, three olive/dark/olive appearances, all twelve poses; same-actor remove/re-equip garment and weapon with deterministic A→B→A restoration.
- Actual WorldVisual factory, valid persisted gender `feminino` and eye style `original`, normal action bundle: NORTH 3/3 and SOUTH 3/3 HD, EAST/WEST 6/6 still legacy (intentional incomplete combined acceptance). This is headless renderer evidence, not a live-map browser claim.
- Optional manifest absence leaves existing routes available and surfaces `northRigStatus: unavailable`; it does not falsely claim NORTH loaded.
- Actual build copy loop tested against minimal source fixture: index + all 26 PNGs deployed with identical hashes. No full build claim.
- Four source JSONs untouched; gameplay, cadence, class permissions and non-NORTH source selections unchanged.

Before publication: combine independently reviewed E/W changes, run combined full-bundle acceptance and regression suite, review candidate visual behavior. Additional peitoral/bota consumers need their own source/ordering proof; scratch previews must not be presented as completed integration.
