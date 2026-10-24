import math
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore, NEKO_ID, public_catalog


class NekoTest(unittest.TestCase):
    def setUp(self):
        self.now = 1000
        self.store = AkumaStore(clock=lambda: self.now)
        self.store.player('hero')
        self.store.register('hero', NEKO_ID)
        self.store.equip('hero', NEKO_ID)

    def tearDown(self):
        self.store.db.close()

    def cast(self, key='1', energy=100, x=0, y=0, target=None):
        enemy = target or {'id': 'target', 'x': 0, 'y': 64, 'facing': 'south', 'defense': 0}
        return self.store.cast('hero', 'island', x, y, [enemy], skill_key=key, energy=energy, physical_attack=100, target_id='target', crit_multiplier=2)

    def test_rank_transform_backstab_and_cooldown(self):
        catalog = public_catalog()[NEKO_ID]
        self.assertEqual((catalog['rank'], catalog['family']), ('D', 'zoan'))
        self.assertIn('reflexos e a ferocidade de um leopardo', catalog['description'])
        self.assertTrue(self.store.state('hero')['transformed'])
        result = self.cast()['effect']
        self.assertTrue(result['critical']); self.assertEqual(result['damage'], 290)
        self.assertEqual(result['direction'], [0, 1])
        self.assertEqual(result['distance'], 112)
        with self.assertRaises(ValueError): self.cast()
        self.store.transform('hero', False)
        self.store.equip('hero', NEKO_ID)
        self.assertFalse(self.store.state('hero')['transformed'], 'syncing the same fruit preserves the chosen human form')
        with self.assertRaises(ValueError): self.cast('2')
        self.store.transform('hero', True)
        effect = self.cast('2')['effect']
        self.assertEqual(effect['target_id'], 'target')
        self.assertEqual(effect['ticks'], [{'at': t, 'damage': 80} for t in [0,166,332,498]])
        self.assertEqual(effect['duration'], .897)
        self.assertEqual(self.store.state('hero')['cooldowns'], {NEKO_ID+':1':1012,NEKO_ID+':2':1016})

    def test_front_damage_armor_and_active_critical_multiplier(self):
        result = self.cast(target={'id':'target','x':0,'y':64,'facing':'north','defense':20})['effect']
        self.assertFalse(result['critical']);self.assertEqual(result['damage'],139)
        self.assertEqual(self.store.neko_damage(100,20,1.45,True,2.3),319)
        for facing,dx,dy in [('south',0,1),('north',0,-1),('east',1,0),('west',-1,0)]:
            self.assertTrue(self.store.neko_backstab(dx,dy,facing))
            self.assertFalse(self.store.neko_backstab(-dx,-dy,facing))

    def test_cost_range_target_and_state_validation(self):
        for key,energy in [('1',24.99),('2',31.99),('1',math.inf),('1',math.nan)]:
            with self.assertRaises(ValueError): self.cast(key,energy)
        for enemy in [{'id':'other','x':0,'y':64}, {'id':'target','x':0,'y':257}, {'id':'target','x':0,'y':0}, {'id':'target','x':math.nan,'y':1}]:
            with self.assertRaises(ValueError): self.cast(target=enemy)
        with self.assertRaises(ValueError): self.cast('2',target={'id':'target','x':0,'y':97})
        with self.assertRaises(ValueError): self.cast('3')
        self.assertEqual(self.store.state('hero')['cooldowns'],{})
        self.store.equip('hero',None)
        with self.assertRaises(ValueError): self.cast()


if __name__ == '__main__': unittest.main()
