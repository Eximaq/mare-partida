import sys,unittest,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
from ryu import RYU
class RyuTest(unittest.TestCase):
 def setUp(self):
  self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p');self.s.register('p',RYU);self.s.equip('p',RYU);self.enemy={'id':'m','x':64,'y':0,'alive':True,'defense':0,'fruitId':'akuma_beta_beta'}
 def tearDown(self):self.s.db.close()
 def cast(self,key='1',**kw):
  args={'skill_key':key,'energy':200,'physical_attack':100,'target_id':'m','enemies':[self.enemy],'rank_c_context':{'penetration':0}};args.update(kw);return self.s.cast('p','beach',0,0,**args)
 def hit(self,r,**kw):return self.s.ryu.impact(self.s,'p',r['effect']['token'],'beach',0,0,[{**self.enemy,**kw}])
 def test_catalog_and_stats(self):
  self.assertEqual(public_catalog()[RYU]['rank'],'B');self.assertTrue(self.s.state('p')['transformed']);self.assertEqual(self.s.stats('p',100,1,{'physical_attack':100})['physical_attack'],132)
 def test_haki_and_once(self):
  r=self.cast()
  with self.assertRaises(ValueError):self.hit(r)
  self.now+=1;self.assertEqual(self.hit(r)['damage'],450)
  with self.assertRaises(ValueError):self.hit(r)
  with self.assertRaises(ValueError):self.cast()
 def test_tail_and_armor(self):
  r=self.cast('2');self.now+=1;hit=self.hit(r);self.assertEqual(hit['damage'],105);self.assertEqual(hit['stunDuration'],3000);self.assertFalse(hit['hasHaki'])
  self.now+=30;r=self.cast();self.now+=1;self.assertEqual(self.hit(r,defense=100)['damage'],420)
 def test_tail_armament(self):
  r=self.cast('2',rank_c_context={'hasHaki':True});self.now+=1;self.assertEqual(self.hit(r)['damage'],150)
 def test_cleanup_and_cooldown(self):
  r=self.cast();cd=self.s.state('p')['cooldowns'];self.s.transform('p',False);self.now+=1
  with self.assertRaises(ValueError):self.hit(r)
  self.s.transform('p',True);self.assertEqual(self.s.state('p')['cooldowns'],cd)
  with self.assertRaises(ValueError):self.cast()
 def test_validation(self):
  for kwargs in [{'energy':0},{'physical_attack':math.nan},{'rank_c_context':{'controlled':True}},{'enemies':[{**self.enemy,'x':97}]},{'enemies':[{**self.enemy,'isInvulnerable':True}]}]:
   with self.assertRaises(ValueError):self.cast(**kwargs)
  self.assertEqual(self.s.state('p')['cooldowns'],{})
 def test_wrong_owner_instance_and_expiration(self):
  r=self.cast();self.now+=1
  with self.assertRaises(ValueError):self.s.ryu.impact(self.s,'p',r['effect']['token'],'swamp',0,0,[self.enemy])
  self.now+=10
  with self.assertRaises(ValueError):self.hit(r)
if __name__=='__main__':unittest.main()
