# Frozen male pants integration

Eight selected pants IDs133/140/147/154/161/168/175/182, all four directions. Exact frozen source packs identify outfit151 / selected pants / gloves152 / boots155. Those equipment IDs are required; no change to a saved body or other garment. Original walk timing, layers and native512 source PNGs are retained. Idle uses source frame0. Historical source status and localized limitations remain recorded; no new approval is inferred.

64 exact walk/idle records render544states.32 attack records add256native640states, yielding eight complete outfit families. Attack upper body comes from the registered male151/gloves152 source; lower clothing comes from that same selected pants/boots155 source at native1:1 pixel size. A64px canvas margin aligns512 to640; no resizing. The fixed lower registration is candidate calibration, not an artistic reapproval. Source archives remain unchanged.

Tests validate all walk/idle states, original dimensions and source identifiers, all eight normal-runtime families with12action/direction pairs, physicalScale1 and immutable saves. Custom skin palettes are not silently aliased. Rebuild derived attack PNGs with `node tools/frozen-pants-native/build-attacks.cjs /tmp/pants-rebuilt` using the verified shipped source archives.
