# Frozen male torso integration

108 exact-equipment registrations: torso IDs 6, 7, 130, 137, 144, 158, 165, 172, 179;
four directions, idle/walk/unarmed attack. Original male body sources and saved
appearance are not replaced by the clothes/equipment shown in source previews.
Frozen preview boots155, gloves152, pants133 and baked clothed body backgrounds
are excluded. Only garment layers are imported.

Source PNG bytes are unchanged, content-addressed and served through the real ZIP
loader. The 512px walk/idle sources stay 512px. Attack uses the existing 640px male
drawn-body frames; clothing sources are padded by64px at render time, not resized
or rewritten. Clothing binds rigidly at scale1 to independent garment anchors.
Original body/head joints and PNGs are unchanged.

Walk fittings retain the original frozen candidate status. Source and base rest
anchors match; lateral pose arrays are not identical and fitting remains a
calibration candidate. WEST original body layers are mirrored separately from
already authored WEST garment frames. Attack WEST instead uses EAST garment
parts with explicit reflection, on the original WEST male attack body.

Attack registration is NEW CALIBRATION, not a new approval: SOUTH uses the eight
male joints already annotated for coat151. Other directions use only angular
trajectories from existing punch pose guides, with male limb lengths retained.
This does not substitute a female body, claim exact anatomical fitting, or add
generated art. Sleeve/hand overlap can need adjustment. M172 E/W user-requested
refinement remains explicitly pending. No idle animation is substituted for
attack: the original eight male attack body frames play.

Verification: 900 rendered frames through actual native archive loader; exact
equipment selection; no implicit boots/gloves/pants; original body-only WEST
render is pixel-identical to whole-body reflection. Native dimensions and source
integrity are enforced. No redundant visual approval is required by the test.
