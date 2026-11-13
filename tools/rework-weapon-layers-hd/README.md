# Native HD weapon layers

No production renderer changes. All assets copied byte-for-byte at640×640. Run `python tools/rework-weapon-layers-hd/verify.py` for12/12 exact approved-state reconstructions.

##115 SOUTH V5
Five native equipment layers and their exact paired body backing and foreground hands. Depth0backing,1weapon,2hands. Use as an atomic pose group; weapon-only insertion is allowed only against the recorded backing hash with the recorded hands restored above it. Timeline copied from the integrated V5source,43ticks24fps. Approval provisional; R is the approved item4substitute. Hair remains baked into backing, not separately replaceable.

##109 SOUTH
Seven isolated equipment frames, the matching original DRAWN8 punch source pack, and small exact rounding-correction masks. HeadBase,face,hair remain separate original authored layers atdepth4,5,6 in the pack. Weapon depth7 then masked RGBA correction depth8. Preserve original source transformations and640canvas; do not scale to96. The correction uses exact RGBA replacement under the supplied mask, not ordinary alpha-over. Seven presented states follow the exact approved preview clock recovered from render.py: order0,1,2,3,4,5,6,0 with ticks12,4,4,4,4,4,4,12 at24fps (2seconds). The144frame approved MP4 has3repetitions. Source DRAWN8 state7 is not used. This is verified presentation timing, not certification of combat hit timing. No recovery pose was fabricated.

`select.cjs` returns null unless body,direction,item,state and exact base-frameSHA256 match. A digest of the original rendered base is required; a generic appearance label is insufficient. This prevents overlays from silently changing outfits or applying to a different arm pose. Alternate hairstyles remain unvalidated, despite original hair being structurally separate in109's source pack.

Index includes approved reference PNGs solely for verification, not as the weapon layer. Final body composites are never substituted for equipment-only assets. No skin-color masks, geometric guessing, native96 donors or downsampling used.

Browser module: `player-rework-weapon-native-hd.js`, global `MareReworkWeaponNativeHD`, API create(index),resolve,requiredFiles,render. Direction is SOUTH. Tests execute the actual vendor compositor and compare all12states byte-for-byte against approved images at640resolution. A small state-local Canvas rounding correction is recorded in index, max1channel for109 and max6for115contour pixels; no original PNG changes. With hidden head slots, all corrections are bypassed to prevent restoring any authored head pixels. This path declares1level rounding tolerance and supports109 only. The normal appearance resolution remains exact-original; callers must explicitly manage validated dynamic head layers after hiding source head slots.

##109 directions expanded
NORTH now includes8original equipment layers and an exact DRAWN8 matching body (8/8body frames RGBA-identical before equipment). EAST/WEST use original separate far/near layers unchanged. Their current authored DRAWN8 head registration differs from the approved preview only within the explicitly recorded head region (7001pixels, approximately2pxvertical registration). The rest of body and equipment match. These16states are disclosed head-calibration candidates, not claimed globally byte-exact. WEST mirrors the EASTequipment at draw time as documented in original rebuild.py; original PNGbytes remain unchanged. There are36source states total:20exact and16with the bounded head-calibration exception.

`carry-binding-plan.json` proves all8forearm anchor pairs across4directions match original walk rest after removing the64pxattack canvas padding. SOUTHpair uses a transparent-column clip of the original overlay;NORTHuses authored left/right PNGs;EASTuses authored near/far PNGs. WESTwalk mirrors entire EASTcomposition. No coordinates inferred from skin color. This plan is not enabled carry: per-frame skin coverage and far-arm depth remain to be tested, especially because lateral walk has only the near hand as a standalone layer.

##Carry implementation (candidate, now executable)
`player-rework-weapon-carry-hd.js` exposes `MareReworkWeaponCarryHD.create(baseIndex,carryPlan)`, resolve/requiredFiles/render. It renders source body layers in authored depth order and inserts unchanged individual gauntlet PNGs immediately above the corresponding forearm/hand. Rigid transforms are wrist anchored; they rotate/translate without scaling weapon raster. WESTwalk mirrors the complete EASTcomposition; genuine WESTidle uses mirrored attachment coordinates and original WESTbody.

Rendered and visually inspected64native512walk frames (16×4directions) plus4idle samples. Actual tests preserve head and legs outside the hand region within1channel Canvas rounding. SOUTHimage-left gauntlet required an explicit8pxleft/2pxup attachment correction; noPNGedited. Remaining tiny skin gap between fingers is visible and needs calibration. Lateral far gauntlet is omitted where no separate authored far-hand layer exists, avoiding a detached floating gauntlet; an idle far hand may remain visible without coverage. Therefore this is an executable carry candidate, not a claim of final flawless dual-glove coverage. User requested calibratable delivery; no main provider modified here.

Samples: workspace `weapon-cycle-audit/109-carry-rendered/` contains all64full-resolution PNGs,4idle samples and4contact sheets. `render-carry-audit.cjs` reproduces previews. `player-rework-weapon-carry-hd.test.cjs` verifies rendering and identity guards.

##Publishing
`archives/archive-index.json` has hd-source-archives-v1 format:196original PNGs in6stored ZIPs, each below1.74MB (total7.21MB). Includes all approved reference assets required by tests. ZIPentry hashes match the standalone PNGbytes. Original `assets/` remains for local tests; publish ZIPs instead of196separate API blobs.
