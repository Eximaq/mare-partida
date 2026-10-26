import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
from jiki import JIKI,values
class JikiTest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p');self.s.register('p',JIKI);self.s.equip('p',JIKI);self.j=self.s.jiki
 def tearDown(self):self.s.db.close()
 def cast(self,key='1',**kw):
  args={'skill_key':key,'energy':500,'physical_attack':100,'target_id':'m','enemies':[{'id':'m','x':200,'y':0,'hp':1000}],'rank_c_context':{'penetration':0,'controlled':False}};args.update(kw);return self.s.cast('p','beach',0,0,**args)
 def test_catalog_stats(self):
  self.assertEqual(public_catalog()[JIKI]['rank'],'B');self.assertEqual(self.s.stats('p',100,1,{'physical_attack':100})['physical_attack'],124)
 def test_charge_levels_and_no_second_cost(self):
  for second in range(1,7):
   self.now+=100;r=self.cast();cd=dict(self.s.state('p')['cooldowns']);self.now+=second;release=self.j.release('p',r['effect']['token'],'beach',0,0,{'x':100,'y':0});self.assertEqual(release['energy_spent'],0);self.assertEqual(self.s.state('p')['cooldowns'],cd);self.assertEqual(release['effect']['multiplier'],2+.5*(second-1));self.assertEqual(release['effect']['scale'],min(1.5,1+.3*(second-1)));self.now+=1
   hit=self.j.impact('p',release['effect']['token'],'beach',100,0,[{'id':'m','x':100,'y':0,'defense':0},{'id':'edge','x':228,'y':0},{'id':'out','x':229,'y':0}]);self.assertEqual(len(hit['hits']),2);self.assertEqual(hit['hits'][0]['damage'],200+50*(second-1))
 def test_early_release_and_once_only(self):
  r=self.cast();release=self.j.release('p',r['effect']['token'],'beach',0,0,{'x':200,'y':0});self.assertEqual(release['effect']['multiplier'],2)
  with self.assertRaises(ValueError):self.j.release('p',r['effect']['token'],'beach',0,0,{'x':200,'y':0})
  token=release['effect']['token']
  with self.assertRaises(ValueError):self.j.impact('p',token,'beach',200,0,[])
  self.now+=1;self.j.impact('p',token,'beach',200,0,[])
  with self.assertRaises(ValueError):self.j.impact('p',token,'beach',200,0,[])
 def test_rocket_exact_target_range_and_one_hit(self):
  r=self.cast('2');token=r['effect']['token'];self.now+=1;r=self.j.impact('p',token,'beach',190,0,[{'id':'m','x':200,'y':0},{'id':'other','x':200,'y':0}]);self.assertEqual(r['hits'],[{'id':'m','damage':250}])
  self.now+=20
  with self.assertRaises(ValueError):self.cast('2',enemies=[{'id':'m','x':257,'y':0}])
 def test_rejects_without_mutating(self):
  with self.assertRaises(ValueError):self.cast(energy=0)
  with self.assertRaises(ValueError):self.cast(rank_c_context={'controlled':True})
  self.assertEqual(self.s.state('p')['cooldowns'],{});r=self.cast();token=r['effect']['token']
  with self.assertRaises(ValueError):self.j.release('other',token,'beach',0,0,{'x':100,'y':0})
  with self.assertRaises(ValueError):self.j.release('p',token,'other',0,0,{'x':100,'y':0})
  with self.assertRaises(ValueError):self.j.release('p',token,'beach',0,0,{'x':257,'y':0})
  with self.assertRaises(ValueError):self.j.release('p',token,'beach',0,0,{'x':100,'y':0},True)
  self.assertTrue(self.j.state('p')['charging'])
 def test_cleanup_and_cancel_preserve_cd(self):
  self.cast();cd=dict(self.s.state('p')['cooldowns']);self.j.cancel_charge('p');self.assertEqual(self.s.state('p')['cooldowns'],cd);self.assertFalse(self.j.state('p')['charging'])
  self.now+=30;self.cast();self.s.equip('p',None);self.assertFalse(self.j.state('p')['charging']);self.assertEqual(self.j.shots,{})
  self.s.equip('p',JIKI);self.now+=30;self.cast('2');self.s.end_protection('p');self.assertEqual(self.j.shots,{})
 def test_charge_expiry_and_shot_expiry(self):
  self.cast();self.now+=8.1;self.assertFalse(self.j.state('p')['charging']);self.now+=20;r=self.cast('2');self.now+=4
  with self.assertRaises(ValueError):self.j.impact('p',r['effect']['token'],'beach',100,0,[])
if __name__=='__main__':unittest.main()
