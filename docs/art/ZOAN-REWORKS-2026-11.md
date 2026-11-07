# Zoan visual reworks

Base: `8458c468ee929a57b8a4c0f6bf3a9b6327408c8b`. Integration authorized by the owner after reviewing the supplied previews. This change does not authorize deployment.

## Sources and scope

- Ryu v3: eight owner-requested image-generated sheets from the approved rear/walk preview. Versioned filenames keep the previous sheets available. Metadata is appended to the existing visual catalog, not the logical Ryu rules. Four walks use eight frames at 8 FPS; north idle and north attack/special/special-2 use the reviewed proportional arms. Contact frames 19/19/16 are visually retimed by the existing adapter. The original logical impact times, damage, stun and range are unchanged.
- Phoenix: existing Walking sheets now supply idle in all four directions. The original Idle bounds remain the scale reference, and Hurt still uses the approved South reaction. Skill VFX are integrated separately in Rank S.
- Wolf: the preview's original procedural open-claw aura atlas (24 frames, 12 FPS) replaces the old stretched aura. Foot anchor 48/124, six-second expiry, entirely behind the actor. Existing damage ticks emit short bleed pulses; the final pulse survives removal of the completed bleed state. Charge trail is cosmetic.
- Albatross: original procedural wind lines from the supplied preview. Horse: supplied eight-frame dust atlas, drawn behind the actor. Dachshund: supplied eight-frame focal bite atlas, target anchored.
- Leopard: supplied two-row claw atlas, emitted by actual skill damage VFX events. Giraffe: supplied rear/front aura and headbutt arc atlases. Bison: supplied rear/front shell and charge dust atlases. Bodies and HUD icons are retained.

The new procedural VFX are project work derived from the owner-requested previews. Ryu sheets derive from the owner's existing character art. No new third-party asset pack was imported and no general redistribution license for the original project art is asserted.

## Verification

Focused tests: `zoan-reworks`, `zoan-feedback`, `zoan-rework-assets`, `wolf-bleed-feedback`, existing `wolf-system`, `ryu-system`, `zoan-grounding`, `zoan-walk-loop`, and `phoenix-hurt`.

A Node canvas contact sheet rendered the actual production modules and was visually inspected. This is not a browser/gameplay test. Chromium could not launch in the execution sandbox (socket operation not permitted); the integration coordinator must complete the real browser checks before declaring gameplay QA passed.

Phoenix transformation now uses the reviewed 16-frame blue flame sheet in both directions (human → Phoenix and Phoenix → human), with the original 1207 ms observer duration and body-alpha behavior. Other Zoans retain their original transition. `phoenix-transition-rework.test.cjs` covers asset selection, both directions, expiry and preservation of other forms.
