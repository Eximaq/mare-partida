import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
ID='akuma_doru_doru'

class DoruTest(unittest.TestCase):
    def setUp(self):
        self.now=1000;self.store=AkumaStore(clock=lambda:self.now);self.store.player('hero')

    def tearDown(self):self.store.db.close()

    def equip(self):
        self.assertIn(ID,public_catalog());self.store.register('hero',ID);self.store.equip('hero',ID)

    def cast(self,key='1',**overrides):
        args=dict(skill_key=key,energy=100,physical_attack=100,direction=[1,0]);args.update(overrides)
        return self.store.cast('hero','island',0,0,**args)

    def test_explosion_delayed_unique_aoe_and_independent_cooldown(self):
        self.equip();r=self.cast();self.assertEqual(r['energy_remaining'],76)
        self.assertEqual(r['effect']['range'],256)
        with self.assertRaises(ValueError):self.cast()
        self.cast('2')
        enemies=[{'id':'edge','x':164,'y':0,'defense':20},{'id':'outside','x':164.1,'y':0},{'id':'dead','x':100,'y':0,'alive':False}]
        impact=self.store.impact_doru('hero',r['effect']['projectile_id'],100,0,enemies)
        self.assertEqual(impact['hits'],[{'id':'edge','damage':154}])
        with self.assertRaises(ValueError):self.store.impact_doru('hero',r['effect']['projectile_id'],100,0,enemies)

    def test_root_exact_expiry_no_damage(self):
        self.equip();r=self.cast('2');self.assertEqual(r['energy_remaining'],72)
        impact=self.store.impact_doru('hero',r['effect']['projectile_id'],64,0,[{'id':'victim','x':80,'y':0}],hit_id='victim')
        self.assertEqual(impact['root']['duration'],3);self.assertEqual(impact['hits'],[])
        self.assertFalse(self.store.doru_can_move('hero','island','victim'))
        self.now+=2.999;self.assertFalse(self.store.doru_can_move('hero','island','victim'))
        self.now+=.001;self.assertTrue(self.store.doru_can_move('hero','island','victim'))

    def test_invalid_inputs_and_impact_cannot_steal_or_go_past_range(self):
        self.equip()
        for kwargs in [dict(energy=23),dict(physical_attack=-1),dict(direction=[0,0]),dict(energy=float('nan'))]:
            with self.assertRaises(ValueError):self.cast(**kwargs)
        self.assertEqual(self.store.state('hero')['cooldowns'],{})
        r=self.cast();pid=r['effect']['projectile_id']
        for x,y in [(257,0),(0,5),(-1,0)]:
            with self.assertRaises(ValueError):self.store.impact_doru('hero',pid,x,y,[])
        self.store.player('other')
        with self.assertRaises(ValueError):self.store.impact_doru('other',pid,10,0,[])
        self.assertEqual(self.store.impact_doru('hero',pid,256,0,[])['hits'],[])

if __name__=='__main__':unittest.main()
