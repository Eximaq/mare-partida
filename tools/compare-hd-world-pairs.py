"""Compare exact World weapon-pair fallback rows and rank remaining work.

This gate compares fallback selection only. It does not certify images or the
presence/pixel correctness of independent layers on a non-legacy route.
"""
import argparse
import base64
import binascii
import collections
import json
import re
import sys

FALLBACK = "compatibilityNeeded"


def groups(report):
    entries = set()
    for row in report["gapGroups"]:
        parts = tuple(row["signature"].split("/"))
        if len(parts) != 6 or row["count"] != len(set(row["weapons"])):
            raise ValueError(f"Unrecognized or duplicate sample: {row}")
        for weapon in row["weapons"]:
            key = (*parts, weapon)
            if key in entries:
                raise ValueError(f"Duplicate sample: {key}")
            entries.add(key)
    if len(entries) != report["counts"].get(FALLBACK, 0):
        raise ValueError("The report did not enumerate every legacy route; cannot assert no regression")
    return entries


def grouped(rows):
    by_slot = collections.Counter(row[4] for row in rows)
    by_family = collections.Counter((b, family, slot) for b, family, _, _, slot, _, _ in rows)
    # Attack/skill aliases must not score as independent physical poses.
    # The exact labels are retained in the regression gate above.
    by_family_pose = collections.Counter(
        (body, family, slot)
        for body, family, action, direction, slot, item, weapon in {
            (b, f, a if a in ("idle", "walk") else "combat", d, s, i, w)
            for b, f, a, d, s, i, w in rows
        }
    )
    return {
        "rawBySlot": dict(by_slot.most_common()),
        "familiesRankedByDistinctPoses": [
            dict(body=b, family=f, slot=s, distinctPoses=n, rawRequests=by_family[b, f, s])
            for (b, f, s), n in sorted(by_family_pose.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
    }


STATES = (FALLBACK, "hdPartialDeclared", "hdFoundSlotsUnattested", "hdSlotsDeclaredAll")


def coverage_vector(report):
    vector = report.get("coverageVector")
    if vector is None:
        return None
    if vector.get("schema") != "world-slot-states-2bit-v1":
        raise ValueError("Unknown coverage vector schema")
    signature = vector.get("queriesSHA256", "")
    if not re.fullmatch(r"[a-f0-9]{64}", signature):
        raise ValueError("Invalid query vector identity")
    try:
        packed = base64.b64decode(vector["data"], validate=True)
    except (binascii.Error, TypeError) as exc:
        raise ValueError("Invalid coverage vector encoding") from exc
    rows = report["rows"]
    if len(packed) != (rows + 3) // 4 or (rows % 4 and packed[-1] >> (2 * (rows % 4))):
        raise ValueError("Coverage vector length or padding invalid")
    states = [(packed[i // 4] >> (2 * (i % 4))) & 3 for i in range(rows)]
    tally = collections.Counter(STATES[v] for v in states)
    if any(tally[label] != report["counts"].get(label, 0) for label in STATES):
        raise ValueError("Coverage vector does not match reported totals")
    return signature, states


def compare_slot_coverage(before, after, require):
    old, new = coverage_vector(before), coverage_vector(after)
    if old is None or new is None:
        if require:
            raise ValueError("Both reports must have a coverage vector; rerun the older audit")
        return None, None, None
    if old[0] != new[0]:
        raise ValueError("Different query vector identity; compare identical appearances, scope and input settings")
    dropped = []
    upgraded = 0
    for i, (b, a) in enumerate(zip(old[1], new[1])):
        if b == 3 and a != 3:
            dropped.append(i)
        elif b != 3 and a == 3:
            upgraded += 1
    return len(dropped), upgraded, dropped[:32]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--require-slot-vectors", action="store_true",
                    help="Reject older reports that cannot prove exact retention of slot declarations")
    ap.add_argument("before")
    ap.add_argument("after")
    args = ap.parse_args()
    with open(args.before) as src:
        before = json.load(src)
    with open(args.after) as src:
        after = json.load(src)
    for name in ("mode", "shard", "workers", "enumeratedKits", "queriedKits", "rows"):
        if before[name] != after[name]:
            raise ValueError(f"Different audit scope: {name}: {before[name]} != {after[name]}")
    if before.get("filter", {}) != after.get("filter", {}):
        raise ValueError("Different audit filters")
    if before["mode"] != "weapon-pairs":
        raise ValueError("Expected World weapon-pairs audit")
    dropped, upgraded, samples = compare_slot_coverage(before, after, args.require_slot_vectors)
    old_rows, new_rows = groups(before), groups(after)
    added = new_rows - old_rows
    fixed = old_rows - new_rows
    if (len(new_rows) - len(old_rows)
            != after["counts"].get(FALLBACK, 0) - before["counts"].get(FALLBACK, 0)):
        raise ValueError("Untracked change outside the five visual slots")
    json.dump({
        "queries": after["rows"],
        "beforeCounts": before["counts"], "afterCounts": after["counts"],
        "fixed": len(fixed),
        "newSlotDeclarationRegressions": dropped,
        "newlyDeclaredAllSlots": upgraded,
        "slotRegressionSampleQueryOrdinals": samples, "newFallbacks": len(added),
        "fixedBySlot": grouped(fixed)["rawBySlot"],
        "newFallbackDetails": sorted(added, key=str),
        "remaining": grouped(new_rows),
        "meaning": "Queries, not sprites. 'Distinct poses' collapses action labels for prioritization only; no image proof."
    }, sys.stdout, ensure_ascii=False, indent=2)
    print()
    return 1 if added or dropped else 0


if __name__ == "__main__":
    sys.exit(main())
