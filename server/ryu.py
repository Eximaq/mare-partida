"""Ryu casts and single-use impact receipts for the client-simulated world."""
import json, math, uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/ryu/rules.json').read_text(encoding='utf8'))
CLIPS=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/ryu/clips.json').read_text(encoding='utf8'))
RYU=RULES['id']
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def damage(attack,armor,multiplier,penetration,target,haki):
 reduction=0 if haki else .3 if target.get('fruitId')=='akuma_beta_beta' else target.get('physicalDamageReduction',0)
 return max(1,math.floor(max(1,math.floor(attack*multiplier-armor*(1-penetration)*.3))*(1-reduction)))
class RyuService:
 def __init__(self,clock):self.clock=clock;self.actions={}
 def clear(self,player):self.actions.pop(player,None)
 def target(self,enemies,target_id,x,y):
  target=next((e for e in enemies if isinstance(e,dict) and str(e.get('id'))==str(target_id)),None)
  if not target or target.get('alive') is not True or target.get('isUntargetable') or target.get('isInvulnerable') or not all(finite(target.get(k,0)) for k in ['x','y','defense','physicalDamageReduction']) or target.get('defense',0)<0 or not 0<=target.get('physicalDamageReduction',0)<=1:raise ValueError('Alvo inválido')
  if math.hypot(target['x']-x,target['y']-y)>RULES['range']:raise ValueError('Alvo fora de alcance')
  return target
 def cast(self,store,player,instance,x,y,enemies,key,energy,attack,ctx):
  now=self.clock();state=store.state(player);skill=next((s for s in RULES['skills'] if s['key']==key),None);pen=ctx.get('penetration',0)
  if state['equipped']!=RYU or not state['transformed'] or not skill or ctx.get('controlled') or not isinstance(ctx.get('hasHaki',False),bool) or not instance or not all(finite(v) for v in [x,y,energy,attack,pen]) or min(energy,attack)<0 or not 0<=pen<=.6:raise ValueError('Transformação ou atributos inválidos')
  if energy<skill['cost'] or state['cooldowns'].get(RYU+':'+key,0)>now or self.actions.get(player,{}).get('ends',0)>now:raise ValueError('Habilidade em recarga ou ação ativa')
  target=self.target(enemies,ctx.get('target_id'),x,y);clip=CLIPS['bite' if key=='1' else 'tail']['south'];duration=clip['frames']/clip['fps'];impact=clip['impact_frame']/clip['fps'];token=uuid.uuid4().hex
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player,RYU,key,now+skill['cooldown']))
  self.actions[player]={'token':token,'instance':instance,'target_id':target['id'],'started':now,'ends':now+duration,'impact':impact,'expires':now+duration+2,'attack':attack,'penetration':pen,'skill':skill,'hasHaki':bool(skill.get('hasHaki')) or ctx.get('hasHaki',False),'used':False}
  return {'effect':{'type':'ryu_attack','token':token,'impact':impact,'duration':duration},'energy_spent':skill['cost']}
 def impact(self,store,player,token,instance,x,y,enemies,controlled=False):
  a=self.actions.get(player);now=self.clock();state=store.state(player)
  if not a or a['token']!=token or a['used'] or a['instance']!=instance or now>=a['expires'] or now-a['started']+.025<a['impact'] or state['equipped']!=RYU or not state['transformed'] or controlled or not all(finite(v) for v in [x,y]):raise ValueError('Impacto inválido, antecipado ou repetido')
  target=self.target(enemies,a['target_id'],x,y);a['used']=True;skill=a['skill'];haki=a['hasHaki']
  return {'target_id':target['id'],'damage':damage(a['attack'],target.get('defense',0),skill['multiplier'],a['penetration'],target,haki),'hasHaki':haki,'stunDuration':skill.get('stunDuration',0)}
