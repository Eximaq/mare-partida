"""Rank E persistence, cooldown, nearest corpse, healing and knockback contracts."""
import math
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from akuma import AkumaStore


class AkumaBackendTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.now = 1000.0
        self.path = Path(self.tmp.name) / "akuma.sqlite3"
        self.store = AkumaStore(self.path, clock=lambda: self.now)
        self.store.player("hero")

    def tearDown(self):
        self.store.db.close()
        self.tmp.cleanup()

    def test_compendium_equipment_and_persistence(self):
        self.store.register("hero", "akuma_kuku_kuku")
        self.store.register("hero", "akuma_kuku_kuku")
        self.assertEqual(self.store.stats("hero", 1000, 100)["count"], 1)
        self.assertAlmostEqual(self.store.stats("hero", 1000, 100)["strength"], 100.1)
        self.store.equip("hero", "akuma_kuku_kuku")
        stats = self.store.stats("hero", 1000, 100)
        self.assertEqual(stats["max_hp"], 1031)
        self.assertEqual(stats["healing_received_percent"], .05)
        self.store.register("hero", "akuma_beri_beri")
        self.store.equip("hero", "akuma_beri_beri")
        self.assertEqual(self.store.stats("hero", 1000, 100)["impact_resistance_percent"], .15)
        reopened = AkumaStore(self.path, clock=lambda: self.now)
        self.assertEqual(reopened.state("hero")["equipped"], "akuma_beri_beri")
        self.assertEqual(len(reopened.state("hero")["unlocked"]), 2)
        reopened.db.close()

    def test_kuku_nearest_corpse_food_and_cooldown(self):
        self.store.register("hero", "akuma_kuku_kuku")
        self.store.equip("hero", "akuma_kuku_kuku")
        self.store.record_corpse("hero", "far", "island", 90, 0)
        self.store.record_corpse("hero", "near", "island", 10, 0)
        self.store.record_corpse("hero", "other", "other-island", 1, 0)
        result = self.store.cast("hero", "island", 0, 0)
        self.assertEqual(result["effect"]["id"], "near")
        with self.assertRaises(ValueError):
            self.store.cast("hero", "island", 0, 0)
        with self.assertRaises(ValueError):
            self.store.pickup_food("hero", "near", "island", 50, 0)
        self.assertEqual(self.store.pickup_food("hero", "near", "island", 10, 0)["heal_percent"], .15)
        with self.assertRaises(ValueError):
            self.store.pickup_food("hero", "near", "island", 10, 0)
        self.now += 15
        with self.assertRaises(ValueError):
            self.store.cast("hero", "island", 0, 0)
        self.store.record_corpse("hero", "fresh", "island", 5, 0)
        self.assertEqual(self.store.cast("hero", "island", 0, 0)["effect"]["id"], "fresh")
        self.now += 60
        self.assertEqual(self.store.pickup_food("hero", "fresh", "island", 5, 0)["heal_percent"], .15)

    def test_cooldowns_are_independent_per_fruit(self):
        self.store.register("hero", "akuma_kuku_kuku")
        self.store.register("hero", "akuma_beri_beri")
        self.store.equip("hero", "akuma_kuku_kuku")
        self.store.record_corpse("hero", "meal", "island", 0, 0)
        self.store.cast("hero", "island", 0, 0)
        self.store.equip("hero", "akuma_beri_beri")
        self.assertEqual(self.store.cast("hero", "island", 0, 0)["effect"]["type"], "division")
        self.assertEqual(self.store.state("hero")["cooldowns"], {"akuma_kuku_kuku": 1015, "akuma_beri_beri": 1018})
        self.store.equip("hero", "akuma_kuku_kuku")
        with self.assertRaises(ValueError):
            self.store.cast("hero", "island", 0, 0)

    def test_beri_invulnerability_and_knockback(self):
        self.store.register("hero", "akuma_beri_beri")
        self.store.equip("hero", "akuma_beri_beri")
        effect = self.store.cast("hero", "island", 0, 0, [{"id": "near", "x": 30, "y": 0}, {"id": "far", "x": 200, "y": 0}])["effect"]
        self.assertEqual(effect["enemies"], [{"id": "near", "x": 95, "y": 0}])
        self.assertTrue(self.store.state("hero")["is_invulnerable"])
        self.now += 1.5
        self.assertFalse(self.store.state("hero")["is_invulnerable"])
        with self.assertRaises(ValueError):
            self.store.cast("hero", "island", 0, 0)
        self.now += 16.5
        self.assertEqual(self.store.cast("hero", "island", 0, 0)["effect"]["type"], "division")

    def test_zoan_transform_stats_skills_and_cooldowns(self):
        for fruit in ("akuma_tori_albatroz", "akuma_uma_uma", "akuma_inu_dachshund"):
            self.store.register("hero", fruit)
        self.assertEqual(self.store.stats("hero", 1000, 100)["count"], 3)
        self.store.equip("hero", "akuma_tori_albatroz")
        self.assertEqual(self.store.stats("hero", 1000, 100)["move_speed_percent"], .12)
        with self.assertRaises(ValueError):
            self.store.cast("hero", "island", 0, 0)
        self.store.transform("hero", True)
        self.assertTrue(self.store.state("hero")["transformed"])
        self.assertEqual(self.store.cast("hero", "island", 0, 0)["effect"]["type"], "high_altitude")
        self.assertEqual(self.store.state("hero")["high_altitude_until"], 1005)
        self.store.equip("hero", "akuma_uma_uma")
        self.assertFalse(self.store.state("hero")["transformed"])
        self.store.transform("hero", True)
        gallop = self.store.cast("hero", "island", 0, 0, [{"id": "first", "x": 70, "y": 5}, {"id": "second", "x": 120, "y": 0}], (1, 0))["effect"]
        self.assertEqual(gallop["hit_id"], "first")
        self.assertEqual(gallop["distance"], 256)
        self.store.equip("hero", "akuma_inu_dachshund")
        self.store.transform("hero", True)
        with self.assertRaises(ValueError):
            self.store.cast("hero", "island", 0, 0, [])
        bite = self.store.cast("hero", "island", 0, 0, [{"id": "far", "x": 150, "y": 0}, {"id": "near", "x": 30, "y": 0}])["effect"]
        self.assertEqual(bite["target_id"], "near")
        self.assertEqual(bite["slow_percent"], .30)
        self.assertEqual(self.store.state("hero")["cooldowns"], {"akuma_tori_albatroz": 1014, "akuma_uma_uma": 1012, "akuma_inu_dachshund": 1010})
        reopened = AkumaStore(self.path, clock=lambda: self.now)
        self.assertTrue(reopened.state("hero")["transformed"])
        reopened.db.close()


if __name__ == "__main__":
    unittest.main()
