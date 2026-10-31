import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
class ExpansionTest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p')
 def tearDown(self):self.s.db.close()
 def equip(self,id):self.s.register('p',id);self.s.equip('p',id)
 def cast(self,key,**kw):
  a={'enemies':[{'id':'m','x':60,'y':0,'hp':10000,'maxHP':1000,'attack':40,'defense':0,'magicDefense':0}],'skill_key':key,'energy':500,'physical_attack':100,'target_id':'m','direction':[1,0],'rank_c_context':{'special_attack':200,'attack':100}};a.update(kw);return self.s.cast('p','beach',0,0,**a)
 def hit(self,r,event,**kw):
  enemies=kw.pop('enemies',[{'id':'m','x':60,'y':0,'hp':10000,'maxHP':1000,'attack':40,'defense':0,'magicDefense':0}]);return self.s.rank_a.impact('p',r['effect']['token'],'beach',enemies,'m',event,kw)
 def test_dome_damage_and_cleanup(self):
  self.equip('akuma_bari_bari');self.cast('2');self.assertEqual(self.s.receive_damage('p',100,100,melee=True)['damage'],20);self.assertEqual(self.s.receive_damage('p',100,100,melee=True)['reflected'],4);self.assertEqual(self.s.receive_damage('p',100,100,projectile=True)['damage'],0);self.now+=10;self.assertEqual(self.s.receive_damage('p',100,100)['damage'],100)
 def test_barrier_wall_and_no_duplicate(self):
  self.equip('akuma_bari_bari');r=self.cast('1');self.now+=.3;self.assertEqual(self.hit(r,'initial')['damage'],350);self.assertEqual(self.hit(r,'wall')['damage'],100)
  with self.assertRaises(ValueError):self.hit(r,'wall')
 def test_stacked_poison_and_absolute_corrosion(self):
  self.equip('akuma_doku_doku');r=self.cast('1');self.now+=1.8
  with self.assertRaises(ValueError):self.hit(r,'dot:severe:1')
  self.assertEqual(self.hit(r,'initial')['damage'],500);self.now+=1;self.assertEqual(self.hit(r,'dot:severe:1')['damage'],20)
  with self.assertRaises(ValueError):self.hit(r,'dot:severe:1')
  r=self.cast('3');self.now+=.6;self.assertEqual(self.hit(r,'initial')['damage'],1000);self.now+=1;self.assertEqual(self.hit(r,'dot:corrosion:1')['damage'],50)
 def test_three_bullets_and_parasite_self_hits(self):
  self.equip('akuma_ito_ito');r=self.cast('1');self.now+=.4
  for i in range(3):self.assertEqual(self.hit(r,'shot:'+str(i))['damage'],180)
  with self.assertRaises(ValueError):self.hit(r,'shot:3')
  r=self.cast('2');self.now+=1.5;self.assertEqual(self.hit(r,'self:1.5')['damage'],40);self.now+=2;self.assertEqual(self.hit(r,'self:3.5')['damage'],40)
 def test_clipped_gas_impact_point(self):
  self.equip('akuma_doku_doku');r=self.cast('2',enemies=[{'id':'m','x':192,'y':0,'hp':1000}]);self.now+=.2;hit=self.hit(r,'initial',impact_point={'x':80,'y':0},enemies=[{'id':'m','x':20,'y':0,'hp':1000,'defense':0}]);self.assertEqual(hit['damage'],300)
 def test_invalid_range_does_not_consume_cooldown(self):
  self.equip('akuma_ito_ito')
  with self.assertRaises(ValueError):self.cast('1',enemies=[{'id':'m','x':400,'y':0,'hp':1000}])
  self.assertEqual(self.s.state('p')['cooldowns'],{})
if __name__=='__main__':unittest.main()
