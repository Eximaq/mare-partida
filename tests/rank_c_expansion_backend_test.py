import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore
from rank_c_expansion import BISON,BOMU,KOBU
class ExpansionTest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p')
 def tearDown(self):self.s.db.close()
 def equip(self,id):self.s.register('p',id);self.s.equip('p',id)
 def cast(self,key,**kw):
  args={'enemies':[{'id':'m','x':100,'y':0,'defense':0}],'skill_key':key,'energy':500,'physical_attack':100,'target_id':'m','rank_c_context':{'view':{'x':-200,'y':-200,'width':400,'height':400},'self':{'hp':50,'maxHP':100},'point':{'x':50,'y':0}}};args.update(kw);return self.s.cast('p','beach',0,0,**args)
 def test_bison(self):
  self.equip(BISON);self.assertTrue(self.s.state('p')['transformed']);r=self.cast('1');hit=self.s.rank_c_expansion.impact('p',r['effect']['token'],0,'beach',100,0,[{'id':'m','x':100,'y':0}]);self.assertEqual(hit['hits'][0]['damage'],180);self.assertEqual(hit['hits'][0]['stun'],2)
  with self.assertRaises(ValueError):self.s.rank_c_expansion.impact('p',r['effect']['token'],0,'beach',100,0,[{'id':'m','x':100,'y':0}])
  r=self.cast('2');self.assertEqual(r['effect']['hp']/r['effect']['maxHP'],.5);st=self.s.stats('p',100,1,{'physical_defense':50});self.assertAlmostEqual(st['physical_defense'],68*1.35);self.assertAlmostEqual(st['max_hp'],(100+240)*1.2);self.now+=30;self.assertEqual(self.s.stats('p',100,1,{'physical_defense':50})['physical_defense'],68)
 def test_bomu(self):
  self.equip(BOMU);self.assertEqual(self.s.receive_damage('p',100,100,damage_type='explosion')['damage'],0);self.assertEqual(self.s.receive_damage('p',100,100)['damage'],100)
  r=self.cast('1');hits=[self.s.rank_c_expansion.impact('p',r['effect']['token'],i,'beach',100,0,[{'id':'m','x':100,'y':0}])['hits'][0]['damage'] for i in range(6)];self.assertEqual(sum(hits),450)
  r=self.cast('2');near=[{'id':'m','x':100,'y':0},{'id':'diagonal','x':164,'y':64},{'id':'far','x':165,'y':0}];hits=self.s.rank_c_expansion.impact('p',r['effect']['token'],0,'beach',100,0,near)['hits'];self.assertEqual([h['id'] for h in hits],['m','diagonal']);self.assertEqual(hits[0]['damage'],150)
 def test_kobu(self):
  self.equip(KOBU);ally={'id':'ally','partyId':'pt','instance':'beach','x':10,'y':10};other={**ally,'id':'other','partyId':'no'};self.s.rank_c_expansion.party_provider=lambda p,i:{'partyId':'pt','members':[ally,other]};self.cast('1');self.assertAlmostEqual(self.s.stats('p',100,1,{'physical_attack':100})['physical_attack'],120);self.assertAlmostEqual(self.s.rank_c_expansion.apply_stats('ally',{'physical_attack':100})['physical_attack'],120);self.assertEqual(self.s.rank_c_expansion.apply_stats('other',{'physical_attack':100})['physical_attack'],100)
  self.cast('2');r=self.s.rank_c_expansion.tick('p','beach',0,0,{'x':-200,'y':-200,'width':400,'height':400},[{'id':'m','x':50,'y':0},{'id':'far','x':999,'y':999}]);self.assertEqual(r['debuff_ids'],['m']);self.now+=20;self.s.rank_c_expansion.tick('p','beach',0,0,{'x':-200,'y':-200,'width':400,'height':400},[]);self.assertEqual(self.s.rank_c_expansion.apply_stats('p',{'physical_attack':100})['physical_attack'],100)
 def test_validation(self):
  self.equip(BISON);self.s.transform('p',False)
  with self.assertRaises(ValueError):self.cast('1')
  self.equip(KOBU)
  with self.assertRaises(ValueError):self.cast('2',rank_c_context={'point':{'x':999,'y':999},'view':{'x':0,'y':0,'width':100,'height':100}})
  self.assertEqual(self.s.state('p')['cooldowns'],{})
if __name__=='__main__':unittest.main()
