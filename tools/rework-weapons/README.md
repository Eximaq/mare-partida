# Approved compositions, loaded on demand

Open `tools/rework-weapons/index.html` to inspect original PNG states and recorded timelines, choose weapon or clothing, and enter the world with an explicit query. Normal gameplay is unchanged. No inventory, save, combat damage, or equipment definitions are changed.

This catalogue contains **composite snapshots**, not interchangeable cosmetic layers. It does not certify arbitrary body/clothing/weapon combinations. Missing actions and uncalibrated world geometry are reported, never substituted with the old character. `worldEligible:false` sources remain inspectable in the review window.

Archived ZIPs are fetched only after a selection, from the immutable repository commit `2801902fa2dad8e83069815faeaa3f53f90bc1b6`. That raw GitHub endpoint was checked for HTTP 200 and `Access-Control-Allow-Origin: *`. Each ZIP and PNG is SHA-256 verified; ZIP extraction validates CRC, sizes, paths and compression. Local derived ZIPs are explicitly packaged in Pages. Failure to reach GitHub is visible and does not silently fall back. There is no guarantee of offline first use.

Archive cache: two ZIPs. Decoded cycle cache: three. Archive limit: 64 MiB; split-part concurrency: four. Large first selections can take time and consume mobile data; the complete source archive is not downloaded automatically.

`timing: authored` preserves source frame order/holds. `review-states` exposes available states at review timing only, not certified combat timing. Geometry is enabled in world only where source frame/pivot conventions are evidenced. Historical variants retain their source labels; preferred/priority fields choose more recent sources but all remain visible for review.

Verification: ZIP decoder unit tests, runtime selection/fail-closed tests, existing lobby tests, clothing catalogue integrity tests, Pages packaging, and pixel-source spot checks. No end-to-end browser claim: the available browser launch was blocked by the environment.
