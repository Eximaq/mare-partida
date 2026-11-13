# Frozen female torso registrations

120 torso-only records: IDs6/7/130/137/144/151/158/165/172/179,
four directions, idle, walk and unarmed attack. The selected sources are the
SOUTH v2/NORTH v1 named index and E/W manual-current frozen records. Existing
F6/F151 equipped combinations remain untouched.

The portable source packs explicitly describe candidates, not global approval.
Their selection metadata is retained verbatim. No rejected/withdrawn source
status is promoted. New body/garment registrations remain calibration candidates.

Only garment PNG layers are imported. The clothed composite background, old
visible hands and manual arm owners are excluded, preventing implicit boots,
gloves, pants or another torso from replacing the saved equipment. Each record
uses the original female base body, arms and face/head PNGs. No male base or
coat151 is inserted into another item.

Walk: source40ticks/1s preserved, original eight female body frames sampled on
that same clock; correction ticks hold the corresponding original body pose.
This is a candidate registration, not a claim that old composite geometry matches
the current base exactly. Idle uses the initial source frame.

Attack: original eight female class attack frames at640px; own garment first
source pieces are padded64px at runtime, not resized or rewritten. Isolated
sleeves/cuff pieces use semantic layer ownership and alpha-boundary anchors,
with existing female shoulder/elbow/wrist tracks and rigid scale1 transforms.
No colour threshold assigns anatomy. Pieces lacking a complete joint track
remain fixed over the moving original body; calibrating these fits remains
possible without blocking other records. No idle body substitutes attack.

Validation: real ZIP asset loader and SHA checks, 1960 rendered frames, exact
equipment selection, base-layer references restricted to original class source,
and game-family prepare/render with saved equipment unchanged and physicalScale1.
