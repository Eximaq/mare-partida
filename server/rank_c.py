"""Transient Rank C effects; optional trusted party adapter, no invented allies."""
import json,math,uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-c-rules.json').read_text(encoding='utf8'))
HORU=RULES['horu']['id'];MATO=RULES['mato']['id']
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def visible(entity,view):return all(finite(view.get(k)) for k in ['x','y','width','height']) and view['width']>0 and view['height']>0 and view['x']<=entity['x']<=view['x']+view['width'] and view['y']<=entity['y']<=view['y']+view['height']
def cleanse(entity):
 for k in ['talentControl','talentPoison','talentSlow','wolfBleed','poison','bleed','bleeding','stun','freeze','frozen','root']:entity.pop(k,None)
 for k in ['slow','stun_until','frozen_until','root_until','doru_root_until']:entity[k]=0
 entity['isRooted']=False;entity['isStunned']=False;entity['isFrozen']=False;entity['debuffs']=[]
class RankCService:
 def __init__(self,clock):self.clock=clock;self.buffs={};self.marks={};self.shots={};self.party_provider=None
 def clear(self,player):
  self.buffs.pop(player,None);self.marks.pop(player,None);self.shots={k:v for k,v in self.shots.items() if v['player']!=player}
 def state(self,player):
  now=self.clock();mark=self.marks.get(player)
  if mark and mark['until']<=now:self.marks.pop(player,None);mark=None
  buff=self.buffs.get(player,{})
  return {'mutation_until':buff.get('mutation_until',0),'speed_until':buff.get('speed_until',0),'mark':dict(mark) if mark else None}
 def apply_stats(self,player,stats):
  out=dict(stats);s=self.state(player)
  if s['mutation_until']>self.clock():
   out['special_defense']=out.get('special_defense',out.get('physical_defense',0))
   for k in ['physical_attack','special_attack','physical_defense','special_defense']:out[k]=out.get(k,0)*1.3
  if s['speed_until']>self.clock():out['movement_speed']=out.get('movement_speed',1)*1.25
  return out
 def cast(self,store,player,fruit,instance,x,y,enemies,direction,key,energy,attack,context):
  now=self.clock();self.shots={k:v for k,v in self.shots.items() if v['expires']>now};kind='horu' if fruit==HORU else 'mato';rules=RULES[kind];skill=next((s for s in rules['skills'] if s['key']==str(key)),None);ctx=context or {}
  if skill is None or not instance or not all(finite(v) for v in [x,y,energy]) or energy<0:raise ValueError('Habilidade ou posição inválida')
  if ctx.get('controlled') and not skill.get('canCastWhileStunned'):raise ValueError('Aguarde o fim do controle')
  live=[e for e in enemies if e.get('alive',True) and e.get('hp',1)>0]
  target=next((e for e in live if str(e['id'])==str(ctx.get('target_id'))),None)
  if target and not all(finite(target.get(k)) for k in ['x','y']):raise ValueError('Alvo inválido')
  mark=self.state(player)['mark'];homing=bool(fruit==MATO and key=='1' and target and mark and mark['instance']==instance and str(mark['target_id'])==str(target['id']));free=homing and mark['charges']>0
  cdkey=fruit+':'+str(key);state=store.state(player)
  if not free and state['cooldowns'].get(cdkey,0)>now:raise ValueError('Habilidade em recarga')
  cost=0 if free else skill['cost']
  if energy<cost:raise ValueError('Energia insuficiente')
  if fruit==HORU and key=='1':effect={'type':'hormone_mutation','expires_at':now+30,'duration':30,'scale':2,'bonus':.3}
  elif fruit==HORU:
   actor=ctx.get('self',{});hp=actor.get('hp');maximum=actor.get('maxHP')
   if not all(finite(v) for v in [hp,maximum]) or hp<=0 or maximum<=0 or hp>maximum:raise ValueError('Vida inválida')
   self_actor={'id':player,'instance':instance,'x':x,'y':y,'hp':hp,'maxHP':maximum};selected=[self_actor];seen={str(player)}
   party=self.party_provider(player,instance) if self.party_provider else None
   if party and party.get('partyId'):
    for m in party.get('members',[]):
     if str(m.get('id')) not in seen and m.get('partyId')==party['partyId'] and m.get('instance')==instance and m.get('alive',True) and all(finite(m.get(k)) for k in ['x','y','hp','maxHP']) and m['hp']>0 and m['maxHP']>0 and visible(m,ctx.get('view',{})):selected.append(m);seen.add(str(m['id']))
   effect={'type':'hormone_heal','recipients':[{'id':m['id'],'heal':max(0,min(m['maxHP']-m['hp'],m['maxHP']*.2)),'speed_until':now+6,'cleanse':True} for m in selected]}
  elif key=='2':
   if not target or not visible(target,ctx.get('view',{})):raise ValueError('Selecione um inimigo visível')
   effect={'type':'mato_mark','target_id':target['id'],'expires_at':now+10,'charges':4}
  else:
   if not finite(attack) or attack<0 or len(direction)!=2 or not all(finite(v) for v in direction) or math.hypot(*direction)<.001:raise ValueError('Ataque ou direção inválida')
   penetration=ctx.get('penetration',0)
   if not finite(penetration) or penetration<0:raise ValueError('Penetração inválida')
   effect={'type':'mato_axe','projectile_id':uuid.uuid4().hex,'homing':homing,'target_id':target['id'] if homing else None,'free':bool(free),'charges':mark['charges']-1 if free else 0}
  # Mutations begin only after all input validation succeeds.
  if fruit==HORU and key=='1':self.buffs.setdefault(player,{})['mutation_until']=effect['expires_at']
  elif fruit==HORU:
   for m,r in zip(selected,effect['recipients']):cleanse(m);m['hp']+=r['heal'];m['horu_speed_until']=now+6;self.buffs.setdefault(str(m['id']),{})['speed_until']=now+6
  elif key=='2':self.marks[player]={'target_id':target['id'],'instance':instance,'until':now+10,'charges':4}
  else:
   if free:self.marks[player]['charges']-=1
   length=math.hypot(*direction);self.shots[effect['projectile_id']]={'player':player,'instance':instance,'x':x,'y':y,'dx':direction[0]/length,'dy':direction[1]/length,'homing':homing,'target_id':effect['target_id'],'attack':attack,'expires':now+180,'penetration':min(.6,penetration)}
  ready=state['cooldowns'].get(cdkey,0)
  if not free or effect.get('charges')==0:
   ready=max(ready,now+skill['cooldown'])
   with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player,fruit,str(key),ready))
  effect['ready_at']=ready
  return {'effect':effect,'energy_spent':cost,'energy_remaining':energy-cost,'state':store.state(player)}
 def impact(self,player,shot_id,instance,x,y,enemies,target_id):
  p=self.shots.get(shot_id)
  if not p or p['player']!=player or p['instance']!=instance or p['expires']<=self.clock() or not all(finite(v) for v in [x,y]):raise ValueError('Projétil inválido ou concluído')
  target=next((e for e in enemies if str(e['id'])==str(target_id) and e.get('alive',True)),None)
  if not target or not all(finite(target.get(k)) for k in ['x','y']) or math.hypot(target['x']-x,target['y']-y)>RULES['mato']['hitRadius']+8:raise ValueError('Impacto sem contato')
  if p['homing'] and str(target_id)!=str(p['target_id']):raise ValueError('Alvo diferente da marca')
  dx,dy=x-p['x'],y-p['y']
  if not p['homing'] and (math.hypot(dx,dy)>RULES['mato']['range']+8 or dx*p['dx']+dy*p['dy']<0 or abs(dx*p['dy']-dy*p['dx'])>8):raise ValueError('Impacto fora da trajetória')
  armor=target.get('defense',0)
  if not finite(armor) or armor<0:raise ValueError('Defesa inválida')
  self.shots.pop(shot_id);return {'target_id':target_id,'damage':max(1,math.floor(p['attack']*1.1-armor*(1-p['penetration'])*.3))}
