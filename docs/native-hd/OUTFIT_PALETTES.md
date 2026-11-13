# Original anatomy palettes for isolated pants/boots

33 existing male contracts for pants133, pants133+boots9 and north/south pants133+boots148 have explicit source-specific skin/hair masks. No equipment layer is recolored. Fused female outfits and coats without this proof remain blocked for custom palettes.

Body sources that are SHA-identical to original anatomy use the existing skin tone classifier. East/west backgrounds use exact spatial RGBA matches against original anatomical layers, not a global color classifier over clothes. West arm images are pixel-exact mirrored renders of the original east isolated arm across all32 layer/frame pairs.

Original hair cutouts contain skin fragments: ears, forehead and nape. Those regions were visually traced at source512 coordinates, translated64px for the corresponding640 padded source or mirrored for west. Existing ink/alpha are preserved. Seven specific source hashes are recognized by the shared hair-anatomy helper; unknown hashes never inherit a mask. This repairs source mixing, not artwork generation or a new visual approval.

Verification: light/black, ebony/pink and porcelain/blue rendered through idle/walk/attack in allfour directions and visually inspected.207 recolor calls checked alpha and every pixel outside the specified mask; source PNGs remain unchanged. Base and109carry head pixels match across allfour directions and three palettes. Real saved light/black pants133+boots9 resolves the complete native family.

No additional151 contracts are included: its SOUTH attack garment remains unresolved.
