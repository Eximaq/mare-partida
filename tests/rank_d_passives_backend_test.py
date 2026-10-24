import sys,unittest,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
from fruit_stats import DEVIL_FRUIT_STATS,apply_stats
class RankDTest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p')
 def tearDown(self):self.s.db.close()
 def equip(self,id):self.s.register('p',id);self.s.equip('p',id)
 def test_exact_stats_no_accumulation(self):
  base={'physical_attack':100,'special_attack':80,'physical_defense':50,'attack_speed':2,'movement_speed':100,'crit_chance':.2,'crit_damage':1.65}
  for id,p in DEVIL_FRUIT_STATS.items():
   self.equip(id);r=self.s.stats('p',500,20,base);again=self.s.stats('p',500,20,base)
   self.assertEqual(r,again);self.assertEqual(r['passive_stats'],p);self.assertEqual(public_catalog()[id]['passiveStats'],p)
   self.assertEqual(r['physical_attack'],100+p.get('physical_attack',0));self.assertEqual(r['special_attack'],80+p.get('special_attack',0));self.assertEqual(r['physical_defense'],50+p.get('physical_defense',0));self.assertAlmostEqual(r['attack_speed'],2*(1+p.get('attack_speed',0)))
   self.assertEqual(r['max_hp'],round(500*(1+.001*r['count']))+p.get('max_hp',0))
  self.s.equip('p',None);self.assertEqual(self.s.stats('p',500,20,base)['physical_attack'],100)
 def test_wolf_passive_and_aura(self):
  self.equip('akuma_inu_wolf');self.assertAlmostEqual(self.s.wolf_heal('p',100),5)
  self.s.cast('p','beach',0,0,skill_key='2',energy=100);self.assertAlmostEqual(self.s.wolf_heal('p',100),15)
  self.assertAlmostEqual(self.s.wolf_bonuses('p')['attack_speed_percent'],1.08*1.3-1)
  self.s.transform('p',False);self.assertAlmostEqual(self.s.wolf_heal('p',100),5)
  self.s.equip('p',None);self.assertEqual(self.s.wolf_heal('p',100),0)
 def test_cooldown_and_reflection(self):
  self.equip('akuma_doru_doru');r=self.s.cast('p','beach',0,0,direction=[1,0],skill_key='1',energy=100,physical_attack=100);self.assertAlmostEqual(r['state']['cooldowns']['akuma_doru_doru:1'],1000+12*.95)
  self.equip('akuma_supa_supa');self.assertEqual(self.s.receive_damage('p',100,80)['reflected'],4)
  self.s.cast('p','beach',0,0,skill_key='2',energy=100);r=self.s.receive_damage('p',100,80);self.assertAlmostEqual(r['damage'],48);self.assertAlmostEqual(r['reflected'],32.4)
  self.assertEqual(self.s.receive_damage('p',100,80,reflected=True)['reflected'],0);self.assertEqual(self.s.receive_damage('p',100,80,physical=False)['reflected'],0)
 def test_caps_invalid_and_giraffe_penetration(self):
  r=apply_stats({'crit_chance':.65,'armor_penetration':.6,'lifesteal':.3},'akuma_neko_leopard');self.assertEqual(r['crit_chance'],.65)
  with self.assertRaises(ValueError):apply_stats({'physical_attack':math.nan},'akuma_inu_wolf')
  self.equip('akuma_ushi_giraffe');r=self.s.cast('p','beach',0,0,enemies=[{'id':'m','x':64,'y':0,'defense':100}],target_id='m',skill_key='1',energy=100,physical_attack=100);self.assertEqual(r['effect']['damage'],160);self.assertAlmostEqual(r['effect']['penetration'],.35)
if __name__=='__main__':unittest.main()
