# Native nautical pixel UI materials

Current revision: original PixelLab artwork authorized by the owner. Quiet teal/ink surfaces, restrained brass, low-detail timber headers and four-tone liquid fills replace the rejected ImageGen material study. No external reference-sheet pixels, text, numerals or watermarks are distributed.

Sources and exact requests: `pixellab-pip-generations/hud-native-pixel-20261029/`. The 256x256 UI atlas uses the existing in-game 48px compass as style reference. PixelLab Workbench authored the 64x40 liquid/track sheet. Confirmed paid cost: 10 generations; Workbench reports itself free for subscribers, without per-call usage. See the run ledger and blueprint.

Run `python tools/prepare_pixel_hud.py` from the repository root. It crops inspected bounds and encodes lossless WebP, with an exact RGBA roundtrip assertion for every file. No local painting, recoloring or resampling. All 19 files total 3,830 bytes. The runtime manifest records crops, dimensions and SHA-256.

CSS 9-slice values vary with each source: 18px for window frames, 8px for compact/header frames, 6px for controls/slots and 3px for meter tracks. Presentation widths remain separate. Uniform center crops tile quietly. Status values and widths remain live DOM content. Native 64x8 liquid strips display at 2x, with gentle background movement and reduced-motion support.

The earlier `tools/prepare_nautical_assets.py` reproduces the historical rejected material study and must not be used for the current package. Current visual direction and validation: `docs/HUD-PIXEL-REFINEMENT.md`.
