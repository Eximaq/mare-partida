# Pants22 candidate tooling

Experimental and deliberately absent from production indexes. It is not a completed item integration.

Run from repository root (dependencies installed):

```text
node --test tests/pants22-candidate.test.cjs
node tools/pants22-native/build-candidate.cjs <temporary-output>
node tools/pants22-native/build-profile-candidate.cjs <temporary-output>
python tools/pants22-native/package-candidate.py <temporary-output>
node tools/pants22-native/validate-candidate.cjs <temporary-output>
python tools/build_pages.py
```

Serve dist using a local HTTP server. Run tests/pants22_candidate_ui_browser.cjs with Playwright available, CHROME_PATH, MARE_TEST_URL, MARE_EVIDENCE_DIR and PANTS22_CANDIDATE set. Output paths must be disposable QA folders outside the tracked tree. The browser test intercepts the candidate indexes/archive only in its own context. No save belongs in this directory.

The profile builder replaces its EAST/WEST records on each run. Rebuild SOUTH/NORTH first, then profile, then package. All records remain productionEnabled:false and visualApproved:false. The runtime accepts candidates generally, so these flags alone are not a security boundary: never append this output to the published index before visual validation.

The six source PNGs are original inputs from Kaizoku_22_camadas_originais.zip. Their hashes are checked before retargeting. Generated candidate rasters are intentionally not committed. See ../../docs/native-hd/PANTS22_MALE_CANDIDATE.md for evidence and limitations.
