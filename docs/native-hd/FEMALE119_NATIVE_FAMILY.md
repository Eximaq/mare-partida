# Female119 native prosthetic ownership

12 candidate registrations /68frames: original female idle,walk and unarmed-class attack in four directions. Item119 uses existing separate upper/lower mechanical-arm source PNGs. Native pixels remain intact; wrist/elbow/shoulder rigid registration only, no scale. Correct class is attack-unarmed, matching existing male119 class mapping.

Attack removes only the right-upper/right-forearm/right-hand source-layer draws. Walk/idle remove only the matched right-arm region from the authored arms ownership layer using32 native-resolution alpha masks. Lateral walkframe6 has touching arms; it uses nearest authored hand/forearm seeds to separate ownership. No head, torso, top, pants or legs source is modified. The seam remains explicitly calibration-candidate.

Masks ship in female119-authored-arm-ownership-native.zip (32PNGs,58976bytes), manifest SHA256 and source lengths supplied. Original equipment binaries reused from their existing verified ZIPs. Renderer fetches mask only for requested frame.

Four tests pass through real ZIP loader:12records/68frames; exact base contracts and native item references; every pixel outside equipment/removal ownership preserved and head protected; identity and bounded per-frame dependencies. SOUTH/EAST/NORTH walk and EAST attack contact sheets visually checked. Effective game-browser capture still required; this is not artistic approval of new registration.
