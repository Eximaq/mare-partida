# Approved female pants original layers

Run builder from repository with installed @napi-rs/canvas. First argument: extracted source root; second: output additions directory. Source root layout: f133/current-r15, f161/selected-r27, f21. Each directory contains original cloth, assets, owners, TIMELINES.json. Third-party original recipe is evidence, not executed by builder.

`node tools/rework-modular-outfits-hd/build-approved-female-pants-original-layers.cjs SOURCE_ROOT OUTPUT`

The builder hashes PNG bytes into assets/<sha>.png, retains original byte sources, derives only recipe-approved horizontal mirrors for F133/F161 WEST and crops near-owner y>=238. F21 retains its authored WEST and far-forearm owners. records.json has six standard records, 40ticks at40fps, exact 1000ms.

To archive deterministically: sort assets by filename, write ZIP entries named <sha>.png with timestamp1980-01-01 and mode0644 using deflate9.

Fixtures:72 transparent compositions are Canvas renders of verified original source recipes;72 opaque-approved files are untouched GitHub2801902fa2dad8e83069815faeaa3f53f90bc1b6 source compositions. ZIP manifest lists exact SHA/bytes. `approved-comparison.json` proves all72 opaque matches; `compositor-proof.json` proves all240 runtime compositor ticks match transparent renders. No game-map proof is claimed here.

Repository test references are in tests/fixtures/independent-female-pants-approved.zip (72 transparent recipe renders), with SHA manifest alongside. Source-approved comparison evidence is independent-female-pants-approved-comparison.json. Run node tools/rework-modular-outfits-hd/verify-approved-female-pants-original-layers.cjs SOURCE_ROOT REPO_ROOT ADDITIONS_DIR for complete local source verification.
