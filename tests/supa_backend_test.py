"""Supa Rank D catalog, cast validation, protection and SQLite migration."""
import math
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from akuma import AkumaStore, SUPA_ID, public_catalog


class SupaTest(unittest.TestCase):
    def setUp(self):
        self.now = 1000.
        self.store = AkumaStore(clock=lambda: self.now)
        self.store.player('hero')
        self.store.register('hero', SUPA_ID)
        self.store.equip('hero', SUPA_ID)

    def tearDown(self):
        self.store.db.close()

    def cast(self, key, energy=100, enemies=()):
        return self.store.cast('hero', 'island', 0, 0, enemies, skill_key=key, energy=energy, physical_attack=100)

    def test_catalog_and_independent_cooldowns(self):
        fruit = public_catalog()[SUPA_ID]
        self.assertEqual((fruit['rank'], fruit['family']), ('D', 'paramecia'))
        self.assertEqual([s['cost'] for s in fruit['skills']], [20, 25])
        result = self.cast('1', enemies=[{'id': 'edge', 'x': 128, 'y': 0}, {'id': 'far', 'x': 128.01, 'y': 0}, {'id': 'corner', 'x': 128, 'y': 128}, {'id': 'dead', 'x': 0, 'y': 0, 'alive': False}])
        self.assertEqual(result['effect']['target_ids'], ['edge'])
        self.assertEqual(result['effect']['damage_multiplier'], 1.3)
        self.assertEqual(result['effect']['hits'], [{'id': 'edge', 'damage': 130}])
        self.assertEqual(result['energy_remaining'], 80)
        self.assertEqual(self.cast('2')['effect']['duration'], 5)
        self.assertEqual(self.store.state('hero')['cooldowns'], {SUPA_ID+':1': 1010, SUPA_ID+':2': 1020})
        with self.assertRaises(ValueError):
            self.cast('1')
        self.now += 10
        self.cast('1')
        with self.assertRaises(ValueError):
            self.cast('2')

    def test_cost_and_invalid_casts_do_not_consume_cooldown(self):
        for key, energy in [('1', 19.99), ('2', 24.99), ('1', math.nan), ('1', math.inf), ('1', None), ('1', True), ('3', 100), (None, 100)]:
            with self.assertRaises(ValueError):
                self.cast(key, energy)
        with self.assertRaises(ValueError):
            self.cast('1', enemies=[{'id': 'bad', 'x': math.nan, 'y': 0}])
        self.assertEqual(self.store.state('hero')['cooldowns'], {})
        self.assertEqual(self.cast('1', 20)['energy_remaining'], 0)

    def test_physical_only_original_damage_reflection_and_expiry(self):
        self.cast('2')
        self.assertEqual(self.store.receive_damage('hero', 100, 50), {'damage': 30, 'reflected': 30})
        for opts in [{'physical': False}, {'direct': True}, {'reflected': True}]:
            self.assertEqual(self.store.receive_damage('hero', 100, 50, **opts), {'damage': 50, 'reflected': 0})
        self.assertEqual(self.store.receive_damage('hero', 100, 0), {'damage': 0, 'reflected': 0})
        self.now += 4.999
        self.assertEqual(self.store.receive_damage('hero', 100)['damage'], 60)
        self.now += .001
        self.assertEqual(self.store.receive_damage('hero', 100), {'damage': 100, 'reflected': 0})
        for value in [-1, math.nan, math.inf, True]:
            with self.assertRaises(ValueError):
                self.store.receive_damage('hero', value)

    def test_cutting_damage_armor_and_invalid_physical_inputs(self):
        for attack in [None, True, -1, math.nan, math.inf]:
            with self.assertRaises(ValueError):
                self.store.cast('hero', 'island', 0, 0, skill_key='1', energy=20, physical_attack=attack)
        for armor in [-1, math.nan, math.inf]:
            with self.assertRaises(ValueError):
                self.cast('1', enemies=[{'id': 'bad', 'x': 0, 'y': 0, 'defense': armor}])
        effect = self.cast('1', enemies=[{'id': 'armored', 'x': 0, 'y': 0, 'defense': 20}, {'id': 'armored', 'x': 0, 'y': 0, 'defense': 20}])['effect']
        self.assertEqual(effect['hits'], [{'id': 'armored', 'damage': 124}])

    def test_unequip_and_death_clear_protection_without_resetting_cooldown(self):
        self.cast('2')
        self.store.equip('hero', None)
        self.store.equip('hero', SUPA_ID)
        self.assertEqual(self.store.receive_damage('hero', 100)['reflected'], 0)
        with self.assertRaises(ValueError):
            self.cast('2')
        self.now += 20
        self.cast('2')
        self.store.end_protection('hero')
        self.assertEqual(self.store.receive_damage('hero', 100)['damage'], 100)

    def test_migration_and_reopen_preserve_protection_and_skill_cooldowns(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'old.sqlite3'
            db = sqlite3.connect(path)
            db.executescript('CREATE TABLE fruits(id TEXT PRIMARY KEY,type TEXT NOT NULL,rank TEXT NOT NULL,name TEXT NOT NULL); CREATE TABLE players(id TEXT PRIMARY KEY,equipped TEXT,cooldown_until REAL NOT NULL DEFAULT 0,invulnerable_until REAL NOT NULL DEFAULT 0); INSERT INTO players(id) VALUES("legacy");')
            db.close()
            store = AkumaStore(path, clock=lambda: self.now)
            self.assertEqual(store.state('legacy')['metallic_until'], 0)
            store.register('legacy', SUPA_ID)
            store.equip('legacy', SUPA_ID)
            store.cast('legacy', 'island', 0, 0, skill_key='2', energy=25)
            store.db.close()
            store = AkumaStore(path, clock=lambda: self.now)
            self.assertEqual(store.state('legacy')['cooldowns'][SUPA_ID+':2'], 1020)
            self.assertEqual(store.receive_damage('legacy', 100)['reflected'], 30)
            store.db.close()


if __name__ == '__main__':
    unittest.main()
