"""Shared VFX lifecycle validation; combat world remains client-simulated."""
import json,math,uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/combat-vfx/rules.json').read_text(encoding='utf8'))
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def status_snapshot(entries,now):
 if not finite(now) or not isinstance(entries,list):raise ValueError('Status inválidos')
 result=[]
 for entry in entries:
  if not isinstance(entry,dict) or entry.get('kind') not in ['stun','bind','armorUp','armorDown','buff'] or not finite(entry.get('expires_at')):raise ValueError('Status inválido')
  if entry['expires_at']>now:result.append({'kind':entry['kind'],'remaining':entry['expires_at']-now,'expires_at':entry['expires_at'],'loop':entry['kind'] in ['stun','bind']})
 return result
class CombatVfxService:
 def __init__(self,clock):self.clock=clock;self.shots={}
 def clear(self,player):self.shots={k:v for k,v in self.shots.items() if v['owner']!=player}
 def launch(self,player,instance,kind,x,y,target,reach):
  now=self.clock();self.shots={k:v for k,v in self.shots.items() if v['expires']>now}
  if not player or not instance or kind not in RULES['flightEnds'] or not isinstance(target,dict) or not all(finite(v) for v in [x,y,target.get('x'),target.get('y'),reach]) or not 0<reach<=1024 or target.get('alive') is not True or target.get('isUntargetable') or target.get('isInvulnerable') or not target.get('id') or math.hypot(target['x']-x,target['y']-y)>reach+64:raise ValueError('Projétil inválido')
  if sum(s['owner']==player for s in self.shots.values())>=64:raise ValueError('Limite de projéteis')
  token=uuid.uuid4().hex;self.shots[token]={'owner':player,'instance':instance,'kind':kind,'x':x,'y':y,'target_id':target['id'],'started':now,'expires':now+RULES['maxFlight']+1,'reach':reach}
  return {'token':token,'phase':'flight','flightFrameCount':RULES['flightEnds'][kind]}
 def impact(self,player,token,instance,x,y,target):
  shot=self.shots.get(token);now=self.clock()
  if not shot or shot['owner']!=player or shot['instance']!=instance or shot['expires']<=now or not isinstance(target,dict) or str(target.get('id'))!=str(shot['target_id']) or target.get('alive') is not True or target.get('isUntargetable') or target.get('isInvulnerable') or not all(finite(v) for v in [x,y,target.get('x'),target.get('y')]):raise ValueError('Impacto inválido ou repetido')
  distance=math.hypot(x-shot['x'],y-shot['y'])
  if distance>shot['reach']+64 or now-shot['started']+.05<max(0,distance-RULES['hitRadius'])/RULES['projectileSpeed'] or math.hypot(x-target['x'],y-target['y'])>RULES['hitRadius']+2:raise ValueError('Impacto antecipado ou fora do alvo')
  self.shots.pop(token);return {'phase':'impact','target_id':shot['target_id'],'impactStartFrame':RULES['flightEnds'][shot['kind']],'at':now}

def player_statuses(state,now):
 entries=[]
 for field,kind in [('wild_fury_until','buff'),('wolf_aura_until','buff'),('metallic_until','armorUp'),('high_altitude_until','buff')]:
  value=state.get(field,0)
  if finite(value):entries.append({'kind':kind,'expires_at':value})
 for field in ['mutation_until','speed_until']:
  value=state.get('rank_c',{}).get(field,0)
  if finite(value):entries.append({'kind':'buff','expires_at':value})
 return status_snapshot(entries,now)
