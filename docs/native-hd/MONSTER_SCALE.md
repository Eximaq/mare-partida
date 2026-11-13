# Approved world display scale

The owner approved the monster-scale simulation on 2026-11-13. This supersedes
physical 1:1 world display, not preservation of the authored source images.

- The approved rifle 115 SOUTH reference is 374 visible source pixels tall.
- The Marinheiro renderer uses 75 × 2 × 0.70 = 105 world pixels.
- The uniform final display factor is therefore `105 / 374` (about 0.28075).
- The factor is fixed across bodies, equipment, animation frames and directions.
  It is never recalculated from an attack's changing bounds.
- Layers still compose at their original native dimensions. The final composite
  is drawn once at the smaller world size, including all equipment and headgear.
- Physical source pivots are scaled around the same world foot anchor. Held
  frames during loading use the same transform. Visual height/nameplates use the
  scaled height; combat, collision, timing, save identity and source files do not change.
- Inspection previews deliberately remain native 1:1, not world-sized thumbnails.
- `sourceScale: 1` records unchanged native composition; `physicalScale` records
  the final display factor (or 1 for inspection previews).

This is not a 96×96 PNG conversion and is not a promise that every original detail
remains visible on a low-density screen. Source fidelity and screen size are
separate. The simulation uses native sources with nearest-neighbor drawing.
