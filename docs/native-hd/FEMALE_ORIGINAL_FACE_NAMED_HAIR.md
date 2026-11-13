# Female named hair with original face

Candidate runtime registration for12 existing named hairstyles,4directions and complete idle/walk/unarmed attack. No saved appearance mutation, no original→cropped alias, no catalog head replacement. Existing source PNG bytes and native512/640 dimensions remain unchanged.

`female-original-face-ownership.json` references original female head-clean, face, iris and original-hair layers. SOUTH/EAST/WEST use explicit semantic fringe contours, with protected eyes/nose/mouth/eyebrow regions. Original head-clean supplies opaque backing inside the ownership mask. NORTH requires no fringe removal. No skin-color inference or generated face.

The walk head was fused: the original attack head decomposition is transferred by exact64pixel canvas translation. Differences from the original walk head are restored only within the recorded neck bounds. Unknown identities or unexpected differences fail closed. All new hair layers come from the requested named hairstyle, registered by integer NECK translation and scale1. Original head binding and each frame's authored pose remain authoritative.

Normal provider metadata: `semantic-fringe-ownership-candidate`, `original-face-protected-exact`, `faceProtectedExact:true`, `headSourceScale:1`. Candidate means registration/calibration, not a new global artistic approval.

Tests load actual distributed ZIP assets. Verified: opaque backing for406S/636E/636W owned pixels; protected feature boxes excluded;816native poses across12styles;68per-frame body comparisons outside old/new head alpha;144normal-provider draws; complete12families and unchanged saved appearance.

Scope: no new headgear/weapon/outfit combination claim; non-original skin/hair palettes are not inferred. Other class attacks with different head ownership require separate proof. Existing approved assets are reused without requesting redundant art approval.

## Native helmets extension

Items129,136,143,150,157,164,171,178 now register on all12named styles plus original female hair, with complete idle/walk/unarmed attack families. Exact item/style records reuse their approved gear/hair translations and crown occlusion policy. All scales are explicitly100(native1:1) to honor the current pixel-preservation requirement; positions remain calibration candidates on the original face. For original hair, or129styles without their own exact record, only the helmet's authored alpha occludes hair; no other hairstyle's clipping rule is borrowed.

Items18/19 have approved SOUTH source registrations. Their6missing directional PNGs were recovered unchanged from the v7 historical source experiments. Their head-clean pixels exactly match the current original female head after64pixel padding translation. They are explicitly historical-source candidates, not newly approved art, and use source-alpha-only occlusion in those directions. Provenance and source SHA256s are in `historicalGear` within the ownership JSON. No new image generation or resampling.

Verified:7072frames/104families for8helmets;1768frames/26families for18/19. The normal provider preserves saved appearances and original face/body. Six historical PNG files total70171bytes, unchanged originals. Helmet combinations with additional weapons/clothing or non-original palettes remain outside this helper's current coverage rather than silently dropping equipment.
