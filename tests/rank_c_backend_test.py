import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from akuma import AkumaStore,public_catalog
from rank_c import HORU,MATO
class RankCTest(unittest.TestCase):
 def setUp(self):self.now=1000;self.s=AkumaStore(clock=lambda:self.now);self.s.player('p')
 def tearDown(self):self.s.db.close()
 def equip(self,id):self.s.register('p',id);self.s.equip('p',id)
 def cast(self,key,**kw):
  args=dict(enemies=[{'id':'m','x':80,'y':0,'hp':1000,'defense':0}],direction=[1,0],skill_key=key,energy=200,physical_attack=100,target_id='m',rank_c_context={'view':{'x':0,'y':-100,'width':200,'height':200},'self':{'hp':40,'maxHP':100}});args.update(kw);return self.s.cast('p','beach',0,0,**args)
 def test_horu_mutation_expiry_and_cooldowns(self):
  self.equip(HORU);self.assertEqual(public_catalog()[HORU]['rank'],'C');r=self.cast('1');self.assertEqual(r['energy_spent'],45)
  st=self.s.stats('p',100,10,{'physical_attack':100,'special_attack':80,'physical_defense':50});self.assertEqual(st['physical_attack'],145.6);self.assertEqual(st['special_defense'],65)
  with self.assertRaises(ValueError):self.cast('1')
  self.now+=30;self.assertEqual(self.s.stats('p',100,10,{'physical_attack':100})['physical_attack'],112)
  self.assertEqual(self.s.state('p')['cooldowns'][HORU+':1'],1045)
 def test_cleanse_under_cc_and_trusted_party(self):
  self.equip(HORU);ally={'id':'ally','partyId':'pt','instance':'beach','x':100,'y':0,'hp':50,'maxHP':200,'talentControl':{'remaining':5},'debuffs':['poison']};outsider={**ally,'id':'outside','partyId':'other'};far={**ally,'id':'far','x':1000}
  self.s.rank_c.party_provider=lambda player,area:{'partyId':'pt','members':[ally,outsider,far]}
  ctx={'controlled':True,'self':{'hp':40,'maxHP':100},'view':{'x':0,'y':-100,'width':200,'height':200}}
  with self.assertRaises(ValueError):self.cast('1',rank_c_context=ctx)
  r=self.cast('2',rank_c_context=ctx);self.assertEqual([v['id'] for v in r['effect']['recipients']],['p','ally']);self.assertEqual(ally['hp'],90);self.assertNotIn('talentControl',ally);self.assertEqual(outsider['hp'],50)
  self.assertEqual(self.s.stats('p',100,10,{'movement_speed':100})['movement_speed'],125);self.now+=6;self.assertEqual(self.s.stats('p',100,10,{'movement_speed':100})['movement_speed'],100)
 def test_mato_four_free_homing_and_one_impact(self):
  self.equip(MATO);self.cast('2');shots=[self.cast('1',energy=0) for _ in range(4)];self.assertEqual([s['energy_spent'] for s in shots],[0]*4);self.assertEqual(self.s.rank_c.state('p')['mark']['charges'],0)
  with self.assertRaises(ValueError):self.cast('1',energy=100)
  pid=shots[0]['effect']['projectile_id'];enemies=[{'id':'m','x':1500,'y':500,'defense':0}];r=self.s.rank_c.impact('p',pid,'beach',1500,500,enemies,'m');self.assertEqual(r['damage'],110)
  with self.assertRaises(ValueError):self.s.rank_c.impact('p',pid,'beach',1500,500,enemies,'m')
  self.now+=10;self.assertIsNone(self.s.rank_c.state('p')['mark']);self.s.equip('p',None);self.assertEqual(len(self.s.rank_c.shots),0)
 def test_invalid_mark_and_straight_validation(self):
  self.equip(MATO)
  with self.assertRaises(ValueError):self.cast('2',enemies=[{'id':'m','x':500,'y':0}])
  self.assertEqual(self.s.state('p')['cooldowns'],{})
  r=self.cast('1');pid=r['effect']['projectile_id'];self.assertEqual(r['energy_spent'],20)
  with self.assertRaises(ValueError):self.s.rank_c.impact('p',pid,'beach',500,0,[{'id':'m','x':500,'y':0}],'m')
  self.assertEqual(self.s.rank_c.impact('p',pid,'beach',80,0,[{'id':'m','x':80,'y':0}],'m')['damage'],110)
if __name__=='__main__':unittest.main()
