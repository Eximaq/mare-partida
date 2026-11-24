import base64
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOL = ROOT / "tools" / "compare-hd-world-pairs.py"
SCOPE = {"mode": "weapon-pairs", "shard": 0, "workers": 1, "filter": {},
         "enumeratedKits": 1, "queriedKits": 1, "rows": 3}
GAP = {"signature": "feminino/sword/attack/east/boots/9", "count": 1, "weapons": [0]}


def row(states, fingerprint="a" * 64):
    counts = {}
    labels = ["compatibilityNeeded", "hdPartialDeclared", "hdFoundSlotsUnattested", "hdSlotsDeclaredAll"]
    for i in states:
        counts[labels[i]] = counts.get(labels[i], 0) + 1
    data = base64.b64encode(bytes([sum(a << (2*i) for i, a in enumerate(states))])).decode()
    return {**SCOPE, "counts": counts, "gapGroups": [GAP] if 0 in states else [],
            "coverageVector": {"schema": "world-slot-states-2bit-v1",
                               "queriesSHA256": fingerprint, "data": data}}


def compare(before, after, *options):
    with tempfile.TemporaryDirectory() as d:
        paths = [pathlib.Path(d)/name for name in ("before.json", "after.json")]
        for filename, report in zip(paths, (before, after)):
            filename.write_text(json.dumps(report))
        return subprocess.run([sys.executable, TOOL, *options, *paths], capture_output=True, text=True)


class WorldSlotAudit(unittest.TestCase):
    def test_certified_row_cannot_swap_places_with_unattested_row(self):
        res = compare(row([0, 3, 2]), row([0, 2, 3]))
        self.assertEqual(res.returncode, 1, res.stderr)
        report = json.loads(res.stdout)
        self.assertEqual(report["newFallbacks"], 0)
        self.assertEqual(report["newSlotDeclarationRegressions"], 1)
        self.assertEqual(report["newlyDeclaredAllSlots"], 1)

    def test_true_upgrade_preserves_old_coverage(self):
        res = compare(row([0, 3, 2]), row([2, 3, 3]), "--require-slot-vectors")
        self.assertEqual(res.returncode, 0, res.stderr)
        report = json.loads(res.stdout)
        self.assertEqual(report["newSlotDeclarationRegressions"], 0)
        self.assertEqual(report["newlyDeclaredAllSlots"], 1)
        self.assertEqual(report["fixed"], 1)

    def test_wrong_query_identity_is_rejected(self):
        res = compare(row([0, 3, 2]), row([0, 3, 2], "b"*64))
        self.assertNotEqual(res.returncode, 0)
        self.assertIn("Different query vector", res.stderr)

    def test_old_snapshots_are_not_claimed_to_prove_slot_retention(self):
        old = row([0, 3, 2])
        old.pop("coverageVector")
        res = compare(old, old)
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertIsNone(json.loads(res.stdout)["newSlotDeclarationRegressions"])
        self.assertNotEqual(compare(old, old, "--require-slot-vectors").returncode, 0)

    def test_malformed_vector_does_not_bypass_gate(self):
        bad = row([0, 3, 2])
        bad["coverageVector"]["data"] = ""
        res = compare(row([0, 3, 2]), bad)
        self.assertNotEqual(res.returncode, 0)
        self.assertIn("Coverage vector length", res.stderr)


if __name__ == "__main__":
    unittest.main()
