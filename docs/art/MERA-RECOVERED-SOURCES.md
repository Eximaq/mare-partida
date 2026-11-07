# Mera recovered visual sources

Recovered on 2026-11-07 from the original generated-image files, visually compared with the owner-approved Mera comparison video at 3, 7, 11 and 15 seconds. These are recovered source artworks, not frames extracted from video and not replacement artwork from an external pack. The previous preview assembly recipe was unavailable, so fixed-scale cropping and pivots were reconstructed and are explicitly documented below.

All four effects contain 12 distinct source poses in a 4×3 atlas. Their runtime frame lists retain the original logical lengths and 83 ms entries. `rank-s-data.js`, gameplay rules, server catalog, saves, costs, cooldowns, damage and hit times remain unchanged. The existing burn artwork is preserved.

## Sources and normalization

- **fireFist**: source `exec-5b77052a-36c3-4e09-882d-5a477418bfa8.png`, SHA-256 `ca54bfef520181a82ace0e605311ba9ac145a8239ecc871c903207affcaf6e16`. Runtime PNG SHA-256 `e9aa85186d580cd6a9e5f0a30200214057d0a476f6272c17cdc59275424fa24d`. Cell 320×180, fixed scale 0.950276243, right alignment; pivot (0.88, 0.5).
- **fireRain**: source `exec-476dca4f-d6b3-43ed-b4cd-52fa0f25ffa2.png`, SHA-256 `dbebc7c03e78887759169870da0b7604fa01779144e15defc51253b49df1ec79`. Runtime PNG SHA-256 `46dd81483fa0b0693d4574794b9da87e6d621d3f41c853184ffb36fd46146399`. Cell 128×320, fixed scale 0.857142857, bottom alignment; pivot (0.5, 0.96).
- **pillar**: source `exec-ffa82d44-b4bf-42e0-bc77-e1606c54d9c8.png`, SHA-256 `01868446053400af378273229c5e691eaf1763aa0b22752cc3b83c7fa3e589e7`. Runtime PNG SHA-256 `681b42fb142baa40312ed6b91ff1ba2a8e8f3c315c06e6a2cc95de5c893af013`. Cell 256×336, fixed scale 1.047923323, bottom alignment; pivot (0.5, 0.97).
- **meraAura**: source `exec-b4f89fe7-c433-4a52-a116-2167e994b7bc.png`, SHA-256 `d4675dd4bfd29da2f4ff8f1b04efd1d93084d55add2ce8304788a235c282765a`. Runtime PNG SHA-256 `7de7eedc19f5811856fe1d5d8aeb8d78b44268d4211b2414caa6a37ffc560460`. Cell 256×192, fixed scale 0.730158730, center alignment; pivot (0.5, 0.62).

Cells were cropped using alpha > 8 bounds, with one scale shared across each effect so per-frame growth is not normalized away. The recovered rain cells were rotated −45° before packing; the runtime must not apply the old fixed crop or π/4 rotation.

## Rendering contract

- Fist: original travel and finish timing; reached travel indices 0–8 map to eight opening poses, indices 27–40 map to four finishing poses. Direction comes from the existing job. Rendered 150×84.375 with its forward pivot at the existing projectile position, 32 px above world ground. No new collision or impact event.
- Rain: existing five shots, release times and 0.25 s descent. Uses full 128×320 cells at 52×130, vertically, with the lower tip at the existing falling point minus 32 px. Already-hit shots are not drawn.
- Pillar: original 41-index loop maps to all 12 poses. Rendered 179.2×235.2 behind actors, with the base at the existing job's ground position. Chasing, collision and damage remain untouched.
- Aura: first 35 logical frames map to the 12 poses. Rendered 128×96, ellipse pivot at the actor's feet. Back and front halves are clipped at the foot line to avoid duplicate coverage. Scale follows the actor's scale parameter.

## Verification

`tests/mera-visual-rework.test.cjs` covers preload, complete uncropped source rectangles, four fist directions, rain shots, pillar ground anchoring, aura layer split, non-mutating draws and logical frame mapping. Tests were observed failing before the implementation (6 of 7), then passing (8 of 8 after adding a travel-sequence regression). Full browser and aggregate results belong to the final integration report; this document does not assert publication or QA not performed by this task.
