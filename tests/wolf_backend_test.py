import sys,unittest,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
ID='akuma_inu_wolf'
class WolfTest(unittest.TestCase):
    def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('hero')
    def tearDown(self):self.s.db.close()
    def equip(self):
        self.assertIn(ID,public_catalog());self.s.register('hero',ID);self.s.equip('hero',ID)
    def cast(self,key='1',**kwargs):
        a=dict(enemies=[{'id':'victim','x':128,'y':0,'defense':0}],skill_key=key,energy=100,physical_attack=100,target_id='victim');a.update(kwargs)
        return self.s.cast('hero','beach',0,0,**a)
    def test_transform_impact_and_five_ticks(self):
        self.equip();self.assertTrue(self.s.state('hero')['transformed']);self.assertEqual(public_catalog()[ID]['subtype'],'Zoan Carnívora')
        r=self.cast();self.assertEqual(r['effect']['damage'],100);self.assertEqual(r['energy_remaining'],74)
        self.assertEqual(r['effect']['ticks'],[{'at':i,'damage':20} for i in [1,2,3,4,5]])
        with self.assertRaises(ValueError):self.cast()
        self.cast('2');self.assertEqual(self.s.wolf_bonuses('hero'),{'attack_speed_percent':.3,'lifesteal_percent':.1})
        self.assertEqual(self.s.wolf_heal('hero',57),5.7)
        self.now+=6;self.assertEqual(self.s.wolf_heal('hero',100),0)
    def test_invalid_inputs_do_not_start_cooldowns(self):
        self.equip()
        for kwargs in [dict(energy=25),dict(energy=math.nan),dict(physical_attack=-1),dict(target_id='missing'),dict(enemies=[{'id':'victim','x':257,'y':0}])]:
            with self.assertRaises(ValueError):self.cast(**kwargs)
        self.assertEqual(self.s.state('hero')['cooldowns'],{})
    def test_buff_cancel_on_human_unequip_and_session(self):
        self.equip();self.cast('2');self.s.transform('hero',False);self.assertEqual(self.s.wolf_heal('hero',100),0)
        self.s.transform('hero',True);self.assertEqual(self.s.wolf_heal('hero',100),0)
        self.now+=30;self.cast('2');self.s.end_protection('hero');self.assertEqual(self.s.wolf_heal('hero',100),0)
        self.now+=30;self.cast('2');self.s.equip('hero',None);self.assertEqual(self.s.wolf_heal('hero',100),0)
if __name__=='__main__':unittest.main()
