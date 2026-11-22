#!/usr/bin/env python3
"""Check archive members referenced by the HD wardrobe inventory."""
import argparse
import json
import zipfile
from collections import defaultdict
from pathlib import Path


def audit(inventory, root):
    archives = defaultdict(set)
    loose = set()
    for matches in inventory["locations"].values():
        for location in matches:
            if location.get("member"):
                archives[location["file"]].add(location["member"])
            else:
                loose.add(location["file"])

    failures = []
    members_found = 0
    for filename, expected in sorted(archives.items()):
        file = root / filename
        try:
            with zipfile.ZipFile(file) as archive:
                missing = expected.difference(archive.namelist())
            members_found += len(expected) - len(missing)
            if missing:
                failures.append({"file": filename, "missing": sorted(missing)})
        except (OSError, zipfile.BadZipFile) as error:
            failures.append({"file": filename, "error": str(error)})

    return {
        "archives": len(archives),
        "indexed_members": sum(map(len, archives.values())),
        "members_found": members_found,
        "loose_files": len(loose),
        "loose_missing": sorted(file for file in loose if not (root / file).is_file()),
        "failures": failures,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inventory", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    data = json.loads(args.inventory.read_text(encoding="utf-8"))
    report = audit(data, args.root)
    print(json.dumps(report, indent=2))
    raise SystemExit(bool(report["failures"] or report["loose_missing"]))
