"""Cocox persists with the server's level-18 balance and original art ID."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from monsters import CATALOG, WORLD_LEVEL_BANDS, MonsterStore  # noqa: E402


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

    def test_new_map_encounters_use_scaled_stats_and_existing_pixel_lab_ids(self):
        self.assertEqual(WORLD_LEVEL_BANDS["orange"], (11, 15))
        self.assertEqual(WORLD_LEVEL_BANDS["loguetown"], (36, 40))
        expected = {
            "mr3": (13, "orange", 454, 21, 12, 8, "115d5400-e87f-4990-96d5-39605ee0311c"),
            "cabaji": (13, "orange", 314, 34, 11, 6, "30284edc-eb47-475b-9019-c84ef902e164"),
            "marinheiro": (40, "loguetown", 2478, 156, 64, 19, "c9675963-81b3-4ec2-9a52-ea3c106edffe"),
        }
        for monster_id, (level, area, hp, attack, defense, magic, sprite_id) in expected.items():
            monster = CATALOG[monster_id]
            self.assertEqual((monster["level"], monster["area"]), (level, area))
            self.assertEqual((monster["max_hp"], monster["physical_attack"], monster["physical_defense"], monster["magic_defense"]), (hp, attack, defense, magic))
            self.assertEqual(monster["sprite_id"], sprite_id)
            self.assertFalse(monster["boss"])
        self.assertGreater(CATALOG["marinheiro"]["max_hp"], CATALOG["mr3"]["max_hp"])
if __name__ == "__main__":
    unittest.main()
