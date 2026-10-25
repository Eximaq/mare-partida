import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
from rank_b import BETA,HANA,PUNCH_DURATION,CHOKE_LEAD,CHOKE_END
class RankBTest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p')
 def tearDown(self):self.s.db.close()
 def equip(self,id):self.s.register('p',id);self.s.equip('p',id)
 def cast(self,key,**kw):
  args={'enemies':[{'id':'m','x':100,'y':0,'hp':1000,'defense':0}],'skill_key':key,'energy':500,'physical_attack':100,'target_id':'m','rank_c_context':{'view':{'x':-200,'y':-200,'width':400,'height':400},'special_attack':200}};args.update(kw);return self.s.cast('p','beach',0,0,**args)
 def tick(self,r,index):return self.s.rank_b.tick('p',r['effect']['token'],index,'beach',[{'id':'m','hp':1000,'defense':0}])
 def test_logia_and_stats(self):
  self.equip(BETA);self.assertEqual(public_catalog()[BETA]['family'],'logia');self.assertEqual(self.s.receive_damage('p',100,100)['damage'],70);self.assertEqual(self.s.receive_damage('p',100,100,has_haki=True)['damage'],100);self.assertEqual(self.s.receive_damage('p',100,100,physical=False)['damage'],100);st=self.s.stats('p',100,1,{'special_attack':100});self.assertEqual(st['special_attack'],126);self.assertEqual(st['physicalDamageReduction'],.3)
 def test_beta_burst_root_and_cleanup(self):
  self.equip(BETA);r=self.cast('1',enemies=[{'id':'near','x':128,'y':0,'defense':0},{'id':'far','x':129,'y':0,'defense':0}]);self.assertEqual(r['effect']['hits'],[{'id':'near','damage':300}]);self.assertAlmostEqual(r['effect']['ready_at'],1011.28);r=self.cast('2');self.assertEqual(r['effect']['expires_at'],1004);self.assertEqual(len(self.s.state('p')['rank_b']),1);self.now+=4;self.assertEqual(self.s.state('p')['rank_b'],[]);self.s.equip('p',None);self.assertEqual(self.s.rank_b.jobs,{})
 def test_punch_four_ticks_no_early_or_duplicates(self):
  self.equip(HANA);r=self.cast('1')
  with self.assertRaises(ValueError):self.tick(r,0)
  damage=0
  for i in range(4):self.now=1000+PUNCH_DURATION*(i+1)/4;damage+=self.tick(r,i)['damage']
  self.assertEqual(damage,320)
  with self.assertRaises(ValueError):self.tick(r,3)
 def test_choke_550_and_release(self):
  self.equip(HANA);r=self.cast('2');self.assertEqual(r['effect']['hits'][0]['damage'],100);self.assertAlmostEqual(r['effect']['control_from'],1000+CHOKE_LEAD);damage=100
  for i in range(5):self.now=1000+CHOKE_LEAD+i+1;damage+=self.tick(r,i)['damage']
  self.assertEqual(damage,550);self.now=1000+CHOKE_END;self.assertEqual(self.s.state('p')['rank_b'],[])
 def test_validation_has_no_side_effects(self):
  self.equip(HANA)
  with self.assertRaises(ValueError):self.cast('1',enemies=[{'id':'m','x':129,'y':0}])
  self.assertEqual(self.s.state('p')['cooldowns'],{});self.assertEqual(self.s.rank_b.jobs,{})
  with self.assertRaises(ValueError):self.cast('2',rank_c_context={'view':{'x':500,'y':500,'width':100,'height':100}})
if __name__=='__main__':unittest.main()
