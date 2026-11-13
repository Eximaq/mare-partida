# Female outfit + head runtime connection

The normal native selector now connects the ten already indexed female torso families (6,7,130,137,144,151,158,165,172,179) with the twelve existing named hairstyles and original hair, with or without the ten existing helmets (18,19,129,136,143,150,157,164,171,178).

This adds 1,420 exact torso/head combinations beyond the ten original-hair/no-helmet torso families. Each resolves idle, walk and unarmed attack in all four directions. The code only connects previously separate providers; it does not create PNGs, change source resolution, substitute the saved torso, or reapprove artwork. Existing helmet calibration/provenance remains unchanged, including the historical-source directions for18/19.

The outfit renderer retains its own archive, padding, body/garment layers and authored poses. Only the separate headBase/face/hair layers are composed using the existing original-face helper. Baked clothed composites without an identified separate head are not stripped or assigned a guessed face.

Verification: the selector checks all17,040 action/direction cases for the1,420 combinations. Native raster comparisons cover120 representative torso/action/direction poses and assert exact body/garment equality outside the old/new head footprint. Normal prepareFamily/prepare/drawStable calls draw120 poses across all ten torsos with cropped hair and helmet129. Saved appearance and equipment JSON remain unchanged. This is technical reuse testing, not a new artistic approval gate.

Still outside this adapter: additional weapons, pants/gloves/boots ensembles with fused heads, non-original skin/hair palettes and other eye identities. These restrictions are distinct from successfully uploaded assets.
