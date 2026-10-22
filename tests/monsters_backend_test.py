"""Cocox persists with the server's level-18 balance and original art ID."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from monsters import MonsterStore  # noqa: E402


class MonsterCatalogTest(unittest.TestCase):
    def test_cocox_seed_and_reopen(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "catalog.sqlite3"
            catalog = MonsterStore(db).catalog()
            monster = next(m for m in catalog if m["id"] == "cocox")
            self.assertEqual(monster["name"], "Cocox")
            self.assertEqual((monster["level"], monster["area"]), (18, "rare"))
            self.assertEqual((monster["max_hp"], monster["physical_attack"]), (620, 48))
            self.assertLess(monster["magic_defense"], monster["physical_defense"])
            self.assertEqual(monster["sprite_id"], "71a074a4-26d7-4f04-9be5-a1dd05fdf3c3")
            self.assertEqual(MonsterStore(db).catalog(), catalog)
            cesar = next(m for m in catalog if m["id"] == "cesar")
            self.assertEqual((cesar["name"], cesar["level"], cesar["area"]), ("César", 5, "beach"))
            self.assertEqual(cesar["sprite_id"], "da9c0817-8ea5-425f-a164-7e2362bd46bc")
            self.assertEqual({m["id"] for m in catalog[-2:]}, {"chew", "kuroobi"})


if __name__ == "__main__":
    unittest.main()
