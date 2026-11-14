# Eleventh lot: four approved scoped additions

Parent published tree: `91ccedd018f23275517b8d62ce2116928782f1bd` (`ea0439e642ba6c4a4117ac896333e71e3d77ae08`). No new art or general wardrobe compatibility.

## Female pants 147 and 168

147 uses approved S8/N9, 168 uses approved SN4. Each supports SOUTH (10 authored poses) and NORTH (12), walk only, original appearance, legs slot alone. Four records, 44 original poses, 160 rendered ticks. EAST/WEST records are unchanged, not reapproved as new art. Other clothes, accessories and appearances retain fallback behavior rather than silently disappearing.

Original 1000ms source presentation expands to 40 ticks at 25ms, with unequal holds. Runtime samples these relative holds through the existing distance-driven gait (80-unit stride), not a new wall-clock walk or altered travel speed. Geometry remains 512px, density4, logical128px, pivot64/112.

All 22 original body raster hashes match registered female130 original body frames: SOUTH s36 and NORTH n39. Their explicit original/brown/original/brown/light appearance contract matches the existing E/W independent pants contract. All 44 source-component/body comparisons are RGBA exact. Only identity is inherited, not torso130 clothing, timeline or interpolation.147 removes cloth only under its original connected upper-skin ownership rule;168 retains the original owner-RGBA layer. Neither introduces editable head/skin independence.

## Sabre1 and Nodachi68

Optional approved coats151/158/165/179 for original male EAST/WEST attack-sword only.16 selectors,128 original frame comparisons. Existing bare attacks remain identical. Original order is anatomy, gear, original ownership restoration, clipped original cloth.768px/density4/pivot96/144,8 poses nominal12fps/contact4 are unchanged. Optional coat policy is not applied to mandatory-coat Orbes17/122 or any other attack family.

## Observed verification levels

Source proof:44 pants transparent originals and128 clothed sword originals reconstruct exactly. Native Canvas:160 pants ticks and128 sword frames, alpha exact and RGB delta at most1 (premultiplied Canvas quantization); source provenance remains exact.

Actual headless lobby, not browser: three bounded serial processes. One female actor changes147→168 within one lobby; each item is selected/drawn SOUTH and NORTH through80 natural gait steps per direction (320 draws total), with stop/resume and teleport reset checks and A/B gait state equality. Existing E/W record selection is also checked. Separate same-lobby sword transitions change1/151→1/158 and1/158→68/158→68 bare; both E/W directions and identity invalidation are checked, plus representative unsupported gloves. Combat visual sampling is compared for19,200 A/B simulation steps across8 weapon/coat combinations and6 speeds without changing impact, cooldown or unlock.

Previous ninth negative checks were narrowly updated only for16 newly supported1/68 coat selectors;192 remaining fallback comparisons and all old bare raster/geometry assertions remain. Frozen prior-record hashes verify preservation independently of Git history, including four head adjustment JSONs.

No browser/map validation is claimed. Unsupported variants, other directions/actions and unverified combined wardrobes remain pending. This is not a declaration that every item or every direction is fully integrated.

Resource observation: the standalone serial headless gate completed in67.6s; ready-state RSS snapshots peaked at4180MiB in weapon-swap (coat-swap4140MiB, pants1398MiB). No signal or timeout occurred in that run. These are measured snapshots, not a universal CI memory guarantee or evidence of an OOM cause. Teardown and Canvas readback are harness-only; production rendering is unchanged.

Review correction: the new SN branch rejects explicit alternate `variant`, `variantId` and `appearanceVariant` values, including contradictory fields. Untagged and explicit `original` legs remain accepted. A real failing selector test preceded this narrow guard. Historical E/W selection is intentionally untouched.24 alternate-value negatives plus conflicting-field and positive controls cover147/168 inS/N; unsupported here means this original-source route declines, not blanket equipment incompatibility.

## Final local validation

After the SN variant correction: foundation243/243 and266/266 legacy Node files passed; native suite191/191 (742.9s); the exact updated workflow command100/100 (641.3s), with no failures, skips or cancellations. Archive verifier:297 archives,19274 original PNGs and179 head PNGs. Canonical audit:4679 records, zero canonical mismatches. Pages build passed. Final workflow ready-state RSS snapshots peaked at4166MiB; the earlier standalone observation remains as documented above.

Both portable recipes were rerun from original supplied source ZIPs after the suites; all four production/reference ZIP outputs are byte-identical to staging. Preservation audit also confirms every previous archive descriptor and source binding unchanged; only the modular `independentPants` and weapon `orderedAttackProfiles` top-level data sections changed. No gameplay controller, network or head adjustment edits. Browser/map verification remains absent, not implied by these local gates.

## Fixture-only transport follow-up

The original combined sword reference ZIP is13,918,637bytes, exceeding16MiB when encoded as a connector base64 request. It is replaced only as a test container by deterministic weapon1 and68 partitions (64 original PNGs each), sized7,395,458 and6,523,201bytes. All128 member names and SHA256 remain unchanged; the portable splitter asserts exact union with the original receipt and the test reader independently checks every member. The original combined source recipe and SHA remain recorded and reproducible. Production assets, runtime, selectors and source proofs are byte-identical to the fully tested pre-partition commit.

The affected source/raster/selector/preservation/variant tests pass8/8 after partition. The earlier foundation243, legacy266files and native191 results apply to identical production code; they were not rerun solely for this fixture-container change. The fresh exact workflow passed101/101 (620.2s), with zero failures/skips/cancellations; Pages and canonical audit passed again (4679 records, zero mismatches). The partition ZIPs and transport manifest reproduced byte-identically a second time. Final ready-state RSS snapshots peaked at4153MiB. No browser claim is added.
