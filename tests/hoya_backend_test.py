import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore
from hoya import HOYA
class HoyaTest(unittest.TestCase):
 def setUp(self):
  self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p');self.s.register('p',HOYA);self.s.equip('p',HOYA);self.h=self.s.hoya
 def tearDown(self):self.s.db.close()
 def cast(self,key='1'):
  return self.s.cast('p','beach',0,0,skill_key=key,energy=500,rank_c_context={'stats':{'maxHP':100,'attack':100,'defense':20,'magicDefense':10,'speed':2,'moveSpeed':100},'summon':{'x':96,'y':0}})
 def test_requirement_and_no_side_effects(self):
  with self.assertRaises(ValueError):self.cast('2')
  self.assertEqual(self.s.state('p')['cooldowns'],{});self.assertFalse(self.h.active('p'))
 def test_protection_and_expiry(self):
  self.cast();self.assertEqual(self.h.state('p')['stats']['attack'],150)
  for physical in [True,False]:self.assertEqual(self.s.receive_damage('p',100,100,physical=physical)['damage'],0)
  self.now+=60;self.assertFalse(self.h.state('p')['active']);self.assertGreater(self.s.receive_damage('p',100,100)['damage'],0)
 def test_buff_hp_fraction_and_restore(self):
  self.cast();self.h.pets['p']['hp']=75;self.cast('2');p=self.h.state('p');self.assertEqual(p['hp'],150);self.assertEqual(p['stats']['maxHP'],300);self.assertEqual(p['stats']['speed'],6)
  self.now+=10;p=self.h.state('p');self.assertEqual(p['hp'],75);self.assertEqual(p['stats']['attack'],150)
 def test_attack_impact_single_and_dynamic_speed(self):
  self.cast();target={'id':'m','x':150,'y':0,'alive':True,'defense':0};a=self.h.start_attack('p','beach',96,0,target)
  with self.assertRaises(ValueError):self.h.impact('p',a['token'],'beach',96,0,target)
  self.now+=.1;self.cast('2');self.now+=.05
  r=self.h.impact('p',a['token'],'beach',96,0,target);self.assertEqual(r['damage'],300)
  with self.assertRaises(ValueError):self.h.impact('p',a['token'],'beach',96,0,target)
  with self.assertRaises(ValueError):self.h.start_attack('p','beach',96,0,target)
  self.now+=.2;self.assertTrue(self.h.start_attack('p','beach',96,0,target)['token'])
 def test_owner_instance_range_and_death(self):
  self.cast()
  with self.assertRaises(ValueError):self.h.command('p','other',0,0)
  with self.assertRaises(ValueError):self.h.start_attack('p','beach',96,0,{'id':'m','x':300,'y':0})
  with self.assertRaises(ValueError):self.h.command('other','beach',0,0)
  self.h.receive('p',100000,False);self.assertFalse(self.h.active('p'));self.assertFalse(self.h.state('p')['isInvulnerable'])
 def test_unequip_and_map_cleanup(self):
  self.cast();self.s.equip('p',None);self.assertFalse(self.h.active('p'))
  self.s.equip('p',HOYA);self.now+=100;self.cast();self.s.end_protection('p');self.assertFalse(self.h.active('p'))
if __name__=='__main__':unittest.main()
