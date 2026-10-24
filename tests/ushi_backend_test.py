import sys, unittest, math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
ID='akuma_ushi_giraffe'

class UshiTest(unittest.TestCase):
    def setUp(self):
        self.now=1000
        self.store=AkumaStore(clock=lambda:self.now)
        self.store.player('hero')

    def tearDown(self): self.store.db.close()

    def equip(self):
        self.assertIn(ID,public_catalog())
        self.store.register('hero',ID);self.store.equip('hero',ID)

    def cast(self,key='1',**kwargs):
        args=dict(enemies=[{'id':'target','x':64,'y':0,'defense':100}],skill_key=key,energy=100,physical_attack=100,target_id='target')
        args.update(kwargs)
        return self.store.cast('hero','island',0,0,**args)

    def test_catalog_transform_damage_and_independent_cooldowns(self):
        self.equip();self.assertTrue(self.store.state('hero')['transformed'])
        self.assertEqual(public_catalog()[ID]['rank'],'D')
        r=self.cast();self.assertEqual(r['effect']['damage'],159)
        self.assertEqual(r['effect']['knockback'],64);self.assertEqual(r['energy_remaining'],74)
        with self.assertRaises(ValueError):self.cast()
        r=self.cast('2');self.assertEqual(r['effect']['duration'],5)
        self.assertEqual(r['energy_remaining'],70)
        self.assertEqual(self.store.receive_damage('hero',100)['damage'],60)
        self.assertEqual(self.store.receive_damage('hero',100,physical=False,direct=True)['damage'],60)
        self.assertEqual(self.store.basic_attack('hero',100),125)
        self.now+=5
        self.assertEqual(self.store.receive_damage('hero',100)['damage'],100)
        self.assertEqual(self.store.basic_attack('hero',100),100)

    def test_invalid_casts_do_not_spend_or_start_cooldown(self):
        self.equip()
        for kwargs in [dict(energy=25),dict(energy=math.nan),dict(physical_attack=-1),dict(target_id='missing'),dict(enemies=[{'id':'target','x':129,'y':0}]),dict(enemies=[{'id':'target','x':1,'y':0,'defense':math.nan}])]:
            with self.assertRaises(ValueError):self.cast(**kwargs)
        self.assertEqual(self.store.state('hero')['cooldowns'],{})
        self.store.transform('hero',False)
        with self.assertRaises(ValueError):self.cast('2')

    def test_buff_cancels_on_transform_equipment_and_end_protection(self):
        for cancel in [lambda:self.store.transform('hero',False),lambda:self.store.equip('hero',None),lambda:self.store.end_protection('hero')]:
            self.equip();self.store.transform('hero',True);self.now+=30
            self.cast('2');cancel()
            self.assertEqual(self.store.receive_damage('hero',100)['damage'],100)
            self.assertEqual(self.store.basic_attack('hero',100),100)
        self.store.transform('hero',True);self.equip()
        self.store.transform('hero',False);self.store.equip('hero',ID)
        self.assertFalse(self.store.state('hero')['transformed'])

if __name__=='__main__':unittest.main()
