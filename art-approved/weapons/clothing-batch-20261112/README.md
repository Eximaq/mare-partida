# Approved clothing animation backups — 2026-11-12

57 exact ZIP packages, 721,452,661 bytes. The latest presented versions were approved on 2026-11-12, with every NORTH cycle of staff 128 expressly excluded. EAST/WEST 128 remains included.

No PR, merge, production binding or game integration is part of this archive. The cycles have not been tested in game. Historical source materials embedded in the approved editables are provenance, not independent approval of every historical version.

## Integrity and restoration

`MANIFEST.json` identifies each exact package and its SHA-256, entry count and part hashes. PNG counts include layers and are not counts of animation phases. Files larger than 7.5 MiB are stored as ordered binary parts to preserve the original ZIP byte-for-byte.

From this directory:
```
python3 RESTORE.py --verify-only
python3 RESTORE.py --output restored
```

The first command verifies every part and reconstructed ZIP hash in memory. The second also writes ZIPs and verifies their CRC. Read the restored package's own manifest for poses, outfits and source provenance.

## Boundaries

- No NORTH 128 package is included, for either model or any outfit.
- No superseded/rejected preview replaces an approved version.
- No female NORTH 117 package is included; only the presented male lot.
- Older approved archives are unchanged.
