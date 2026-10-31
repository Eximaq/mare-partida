import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
OPE='akuma_ope_ope';MERO='akuma_mero_mero'
class RankATest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p')
 def tearDown(self):self.s.db.close()
 def equip(self,id):self.s.register('p',id);self.s.equip('p',id)
 def cast(self,key,**kw):
  a={'enemies':[{'id':'m','x':100,'y':0,'hp':10000,'defense':100,'magicDefense':9999}],'skill_key':key,'energy':500,'physical_attack':100,'target_id':'m','direction':[1,0],'rank_c_context':{'special_attack':200}};a.update(kw);return self.s.cast('p','beach',0,0,**a)
 def test_catalog_room_dynamic_and_independent_cooldowns(self):
  self.equip(OPE);self.assertEqual([s['key'] for s in public_catalog()[OPE]['skills']],['1','2','3']);r=self.cast('1');self.assertAlmostEqual(r['effect']['until'],1030.25);self.now+=.3;r=self.cast('1');self.assertEqual(r['effect']['type'],'shambles');self.assertEqual(r['effect']['damage'],170);cd=self.s.state('p')['cooldowns'];self.assertIn(OPE+':1',cd);self.assertIn(OPE+':shambles',cd)
  with self.assertRaises(ValueError):self.cast('1')
  self.now=1031;self.assertFalse(self.s.rank_a.state('p')['room']);self.s.equip('p',None);self.assertFalse(self.s.rank_a.state('p')['room'])
 def test_gamma_timing_absolute_damage_and_single_impact(self):
  self.equip(OPE);r=self.cast('3');enemies=[{'id':'m','x':100,'y':0,'hp':10000,'defense':99999,'magicDefense':99999,'shield':100000,'mitigation':.99}]
  with self.assertRaises(ValueError):self.s.rank_a.impact('p',r['effect']['token'],'beach',enemies,'m')
  self.now+=1.8;hit=self.s.rank_a.impact('p',r['effect']['token'],'beach',enemies,'m');self.assertEqual(hit['damage'],900);self.assertTrue(hit['ignore_all_mitigation'])
  with self.assertRaises(ValueError):self.s.rank_a.impact('p',r['effect']['token'],'beach',enemies,'m')
 def test_room_buff_matches_local_stats_and_expires(self):
  self.equip(OPE);base={'physical_attack':100,'special_attack':100,'physical_defense':100,'magic_defense':100,'attack_speed':1};self.cast('1');self.now+=.3;stats=self.s.stats('p',100,1,base)
  for key in base:self.assertAlmostEqual(stats[key],base[key]*1.3)
  self.now=1030.25;stats=self.s.stats('p',100,1,base)
  for key in base:self.assertEqual(stats[key],base[key])
 def test_rain_area_and_duration(self):
  self.equip(MERO);r=self.cast('3');self.now+=1;hit=self.s.rank_a.impact('p',r['effect']['token'],'beach',[{'id':'m','x':100,'y':0,'hp':1000,'magicDefense':0}],'m');self.assertEqual(hit['damage'],500);self.assertEqual(hit['petrify'],5);self.assertEqual(hit['defense_break'],.2)
 def test_reject_invalid_target_without_spending_cooldown(self):
  self.equip(MERO)
  with self.assertRaises(ValueError):self.cast('2',enemies=[{'id':'m','x':300,'y':0,'hp':1000}])
  self.assertEqual(self.s.state('p')['cooldowns'],{})
if __name__=='__main__':unittest.main()
