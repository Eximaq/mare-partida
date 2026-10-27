import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from combat_vfx import CombatVfxService,status_snapshot,player_statuses
class CombatVfxTest(unittest.TestCase):
 def setUp(self):self.now=100;self.v=CombatVfxService(lambda:self.now);self.target={'id':'m','x':100,'y':0,'alive':True}
 def launch(self,kind='gunner'):return self.v.launch('p','beach',kind,0,0,self.target,200)
 def hit(self,token,player='p',instance='beach'):return self.v.impact(player,token,instance,100,0,self.target)
 def test_frame_contract_and_once(self):
  for kind,count in [('gunner',12),('mage',10),('healer',10),('cyborg',10)]:
   s=self.launch(kind);self.assertEqual(s['flightFrameCount'],count)
   with self.assertRaises(ValueError):self.hit(s['token'])
   self.now+=1;hit=self.hit(s['token']);self.assertEqual(hit['impactStartFrame'],0 if kind=='cyborg' else count)
   with self.assertRaises(ValueError):self.hit(s['token'])
 def test_owner_zone_collision_and_expiry(self):
  s=self.launch();self.now+=1
  for who,zone in [('other','beach'),('p','swamp')]:
   with self.assertRaises(ValueError):self.hit(s['token'],who,zone)
  with self.assertRaises(ValueError):self.v.impact('p',s['token'],'beach',0,0,self.target)
  self.now+=10
  with self.assertRaises(ValueError):self.hit(s['token'])
 def test_cyborg_is_anchored_beam(self):
  target={'id':'far','x':400,'y':0,'alive':True};s=self.v.launch('p','beach','cyborg',0,0,target,500)
  self.now+=.02
  with self.assertRaises(ValueError):self.v.impact('p',s['token'],'beach',400,0,target)
  self.now+=.1;self.assertEqual(self.v.impact('p',s['token'],'beach',400,0,target)['phase'],'impact')
 def test_cancel(self):
  s=self.launch();self.v.clear('p');self.now+=1
  with self.assertRaises(ValueError):self.hit(s['token'])
 def test_status_exact_duration(self):
  entries=[{'kind':'stun','expires_at':103},{'kind':'armorUp','expires_at':105}];self.assertEqual(len(status_snapshot(entries,102.99)),2);self.assertEqual([s['kind'] for s in status_snapshot(entries,103)],['armorUp']);self.assertEqual(status_snapshot(entries,105),[]);self.assertEqual(player_statuses({'metallic_until':103},103),[])
if __name__=='__main__':unittest.main()
