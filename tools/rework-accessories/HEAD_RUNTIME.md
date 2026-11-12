# Live head-family adapter

Uses only approved headBase, face, hair and headgear source layers from the exact 837 adjustment records. Body, clothes, arms and legs are not copied. Original PNG assets are unchanged and SHA-addressed. Authored source previews are compiled with the original adjustment/compositor vendor.

The family is translated from its source NECK to the live pose NECK, at source logical scale, nearest-neighbor. This is a runtime retarget, not a claim that source and native head proportions match. Collar clipping belongs to the live wardrobe. Validate neck seams in game.

`MareReworkHead.create(index,{appearanceAPI,vendor,makeCanvas})` returns resolve, requiredFiles, compose and diagnostic. compose returns RGBA arrays for headBase/face/hair/head. No opt-in URL is required by this module.

Explicit mapped hair styles and exact approved head-item/style/direction pairs only. An original hairstyle requires explicit originalHairStyle metadata; no guessed mapping. Custom expressions and unmapped eye colors retain the current head family, with diagnostic. Source skin and hair can be recolored using the live palette implementation. Clothing coverage is unchanged.

Run `node player-rework-head-family.test.cjs` with @napi-rs/canvas installed. Export index using `python scripts/export-rework-head-index.py --sources PATH_TO_ACCESSORY_PACKAGES`.

Coverage supplement: 39 existing authored sources without saved adjustments are included with adjustment-zero-candidate status, following authorization to integrate candidates for in-game review. They are NOT individually adjustment-approved. The diagnostic distinguishes these entries. Original→cropped may be declared by the caller as a candidate visual mapping, not pixel identity.
