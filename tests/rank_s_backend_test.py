import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
class RankSTest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p')
 def tearDown(self):self.s.db.close()
 def equip(self,id):self.s.register('p',id);self.s.equip('p',id)
 def enemies(self):return [{'id':'m','x':60,'y':0,'hp':10000,'maxHP':10000,'defense':0,'magicDefense':0}]
 def cast(self,key,**kw):
  a={'enemies':self.enemies(),'skill_key':key,'energy':500,'physical_attack':80,'target_id':'m','direction':[1,0],'rank_c_context':{'special_attack':200}};a.update(kw);return self.s.cast('p','beach',0,0,**a)
 def hit(self,r,event,**kw):return self.s.rank_a.impact('p',r['effect']['token'],'beach',kw.pop('enemies',self.enemies()),'m',event,kw)
 def test_rank_s_catalog_and_three_slots(self):
  rows=[r for r in public_catalog().values() if r['rank']=='S'];self.assertEqual(len(rows),5)
  for r in rows:self.assertEqual([s['key'] for s in r['skills']],['1','2','3'])
 def test_vortex_timing_silence_and_duplicate(self):
  self.equip('akuma_yami_yami');r=self.cast('1')
  with self.assertRaises(ValueError):self.hit(r,'initial')
  self.now+=.3;v=self.hit(r,'initial',hero={'x':0,'y':0});self.assertEqual(v['damage'],800);self.assertEqual(v['silence'],5)
  with self.assertRaises(ValueError):self.hit(r,'initial')
 def test_six_hole_ticks_and_expiration(self):
  self.equip('akuma_yami_yami');r=self.cast('2')
  for i in range(1,7):self.now=1000+i;self.assertEqual(self.hit(r,'hole:'+str(i))['damage'],500)
  with self.assertRaises(ValueError):self.hit(r,'hole:7')
  with self.assertRaises(ValueError):self.hit(r,'hole:6')
 def test_liberation_has_two_indexed_waves(self):
  self.equip('akuma_yami_yami');r=self.cast('3');self.now+=.083;self.assertEqual(self.hit(r,'wave:0')['damage'],800)
  with self.assertRaises(ValueError):self.hit(r,'wave:1')
  self.now=1002.158;self.assertEqual(self.hit(r,'wave:1')['damage'],600)
 def test_burn_requires_hit_and_preserves_cadence_after_refresh(self):
  self.equip('akuma_mera_mera');r=self.cast('1')
  with self.assertRaises(ValueError):self.hit(r,'burn:1')
  self.now+=.1;self.assertEqual(self.hit(r,'fist')['damage'],900);rain=self.cast('2');self.now+=.25;self.assertEqual(self.hit(rain,'rain:0')['damage'],260)
  self.now=1001.1;self.assertEqual(self.hit(rain,'burn:1')['damage'],20)
  with self.assertRaises(ValueError):self.hit(rain,'burn:1')
 def test_rain_has_five_impacts_and_index_is_global_per_cast(self):
  self.equip('akuma_mera_mera');r=self.cast('2');self.now+=1
  for i in range(5):self.assertEqual(self.hit(r,'rain:'+str(i))['damage'],260)
  with self.assertRaises(ValueError):self.hit(r,'rain:5')
 def test_pillar_validates_contact_and_one_second_interval(self):
  self.equip('akuma_mera_mera');r=self.cast('3');self.now+=.1;self.assertEqual(self.hit(r,'pillar:100',impact_point={'x':36,'y':0})['damage'],900)
  self.now+=.2
  with self.assertRaises(ValueError):self.hit(r,'pillar:300',impact_point={'x':60,'y':0})
  self.now=1001.1;self.assertEqual(self.hit(r,'pillar:1100',impact_point={'x':60,'y':0})['damage'],900)
 def test_invalid_cast_no_charge_and_cleanup(self):
  self.equip('akuma_mera_mera')
  with self.assertRaises(ValueError):self.cast('1',enemies=[{'id':'m','x':321,'y':0,'hp':100}])
  self.assertEqual(self.s.state('p')['cooldowns'],{})
  with self.assertRaises(ValueError):self.cast('1',rank_c_context={'special_attack':200,'silenced':True})
  r=self.cast('3');self.s.rank_a.clear('p');self.now+=1
  with self.assertRaises(ValueError):self.hit(r,'pillar:1000',impact_point={'x':60,'y':0})
 def test_valid_simulation_timeline_survives_render_delay_without_accepting_future_frames(self):
  self.equip('akuma_yami_yami');r=self.cast('2');self.now+=8;self.assertEqual(self.hit(r,'hole:6',effect_age=6)['damage'],500)
  self.equip('akuma_mera_mera');r=self.cast('3');self.now+=9;self.assertEqual(self.hit(r,'pillar:6500',effect_age=6.5,impact_point={'x':60,'y':0})['damage'],900)
  with self.assertRaises(ValueError):self.hit(r,'pillar:7000',effect_age=7,impact_point={'x':60,'y':0})
 def test_revised_area_edges_match_client(self):
  self.equip('akuma_yami_yami')
  for key,event,inside,outside in [('1','initial',150,160),('2','hole:1',110,120),('3','wave:0',150,160)]:
   r=self.cast(key);self.now+=1
   with self.assertRaises(ValueError):self.hit(r,event,enemies=[{'id':'m','x':outside,'y':0,'hp':10000}])
   self.assertGreater(self.hit(r,event,enemies=[{'id':'m','x':inside,'y':0,'hp':10000}])['damage'],0)
  self.equip('akuma_mera_mera');r=self.cast('3');self.now+=.1
  self.assertGreater(self.hit(r,'pillar:100',impact_point={'x':0,'y':0},enemies=[{'id':'m','x':65,'y':0,'hp':10000}])['damage'],0)
 def test_hie_freeze_reaches_three_tiles_only(self):
  self.equip('akuma_hie_hie')
  with self.assertRaises(ValueError):self.cast('3',enemies=[{'id':'m','x':193,'y':0,'hp':10000}])
  self.assertTrue(self.cast('3',enemies=[{'id':'m','x':192,'y':0,'hp':10000}])['effect']['token'])
 def test_gura_hie_phoenix_casts_and_impacts(self):
  cases=[('akuma_gura_gura','1','impact',180,.35),('akuma_gura_gura','2','impact',180,.35),
         ('akuma_hie_hie','1','impact:0',180,.55),('akuma_hie_hie','2','impact:0',180,.55),
         ('akuma_tori_phoenix','1','impact',100,.49),('akuma_tori_phoenix','3','energy:1',180,.24)]
  for fruit,key,event,range_x,delay in cases:
   with self.subTest(fruit=fruit,key=key):
    self.equip(fruit)
    r=self.cast(key,enemies=[{'id':'m','x':range_x,'y':0,'hp':10000}])
    self.now+=delay
    result=self.hit(r,event,enemies=[{'id':'m','x':range_x,'y':0,'hp':10000}])
    self.assertGreater(result['damage'],0)
    with self.assertRaises(ValueError):self.hit(r,event,enemies=[{'id':'m','x':range_x,'y':0,'hp':10000}])
    self.now+=40
  for fruit,key in [('akuma_gura_gura','3'),('akuma_tori_phoenix','2'),('akuma_hie_hie','3')]:
   self.equip(fruit);self.assertTrue(self.cast(key)['effect']['token'])
   self.now+=40
if __name__=='__main__':unittest.main()
