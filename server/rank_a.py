"""Optional local-service validation for Rank A casts and one-use impacts.

The existing client still simulates the world; these contracts do not claim PvP authority.
"""
import json,math,uuid
from rank_a_expansion import RankAExpansionService,IDS as EXPANSION_IDS
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-a-rules.json').read_text(encoding='utf8'))
OPE=RULES['ope']['id'];MERO=RULES['mero']['id']
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def live(e):return e and e.get('alive',True) and e.get('hp',1)>0 and not e.get('returning') and not e.get('isUntargetable') and not e.get('isInvulnerable') and all(finite(e.get(k)) for k in ['x','y'])
def distance(a,b):return math.hypot(a['x']-b['x'],a['y']-b['y'])
class RankAService:
 def __init__(self,clock):self.clock=clock;self.rooms={};self.jobs={};self.expansion=RankAExpansionService(clock)
 def clear(self,p):self.expansion.clear(p);self.rooms.pop(p,None);self.jobs={k:j for k,j in self.jobs.items() if j['owner']!=p}
 def state(self,p):
  r=self.rooms.get(p);return {'room':r if r and r['until']>self.clock() else None}
 def apply_stats(self,p,stats):
  result=dict(stats);room=self.state(p)['room']
  if room and self.clock()>=room['started']+.25:
   for key in ['physical_attack','special_attack','physical_defense','magic_defense','attack_speed']:
    if key in result:result[key]*=1.3
  return result
 def cast(self,store,p,fruit,instance,x,y,enemies,key,energy,attack,ctx,direction):
  if fruit in EXPANSION_IDS:return self.expansion.cast(store,p,fruit,instance,x,y,enemies,key,energy,attack,ctx,direction)
  now=self.clock();ctx=ctx or {};rule=RULES['ope' if fruit==OPE else 'mero'];room=self.state(p)['room'];swap=fruit==OPE and key=='1' and room and now>=room['started']+.25
  skill=rule['shambles'] if swap else next((s for s in rule['skills'] if s['key']==key),None)
  if not skill or not instance or not all(finite(v) for v in [x,y,energy,attack,ctx.get('special_attack')]) or min(energy,attack,ctx['special_attack'])<0 or ctx.get('controlled'):raise ValueError('Posição, poder ou controle inválido')
  origin={'x':x,'y':y};target=next((e for e in enemies if live(e) and str(e.get('id'))==str(ctx.get('target_id'))),None)
  if not (key=='1' and not swap):
   if not target or distance(origin,target)>(320 if fruit==OPE else 256):raise ValueError('Alvo indisponível ou fora do alcance')
  if swap and (room['instance']!=instance or distance(room,target)>320 or distance(room,origin)>320):raise ValueError('Troca fora da ROOM')
  if fruit==OPE and key=='1' and not swap and room:raise ValueError('ROOM ainda está expandindo')
  cd='shambles' if swap else key
  if store.state(p)['cooldowns'].get(fruit+':'+cd,0)>now or energy<skill['cost']:raise ValueError('Recarga ou energia insuficiente')
  if swap:
   armor=target.get('defense',0)
   if not finite(armor) or armor<0:raise ValueError('Defesa inválida')
   effect={'type':'shambles','damage':max(1,math.floor(attack*2-armor*.3)),'stun':2,'hero_to':{'x':target['x'],'y':target['y']},'target_to':origin}
  elif fruit==OPE and key=='1':
   self.rooms[p]={**origin,'instance':instance,'started':now,'until':now+30.25};effect={'type':'room',**self.rooms[p]}
  else:
   kind=('tact' if key=='2' else 'gamma') if fruit==OPE else {'1':'mellow','2':'kiss','3':'rain'}[key]
   if not isinstance(direction,(list,tuple)) or len(direction)!=2 or not all(finite(v) for v in direction) or not .99<=math.hypot(*direction)<=1.01:raise ValueError('Direção inválida')
   token=uuid.uuid4().hex;duration={'tact':.6,'gamma':1.8,'mellow':.8,'kiss':1.6,'rain':1}[kind]
   self.jobs={k:j for k,j in self.jobs.items() if j['expires']>now}
   self.jobs[token]={'owner':p,'fruit':fruit,'instance':instance,'started':now,'expires':now+duration+2,'kind':kind,'origin':origin,'target_id':target.get('id') if target else None,'point':{'x':target['x'],'y':target['y']} if target else None,'direction':direction,'attack':attack,'special':ctx['special_attack'],'used':set()}
   effect={'type':kind,'token':token,'duration':duration}
  ready=now+skill['cooldown']
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(p,fruit,cd,ready))
  return {'effect':{**effect,'ready_at':ready},'energy_spent':skill['cost'],'energy_remaining':energy-skill['cost']}
 def impact(self,p,token,instance,enemies,target_id,event=None,context=None):
  if token in self.expansion.jobs:return self.expansion.impact(p,token,instance,enemies,target_id,event,context)
  j=self.jobs.get(token);now=self.clock();m=next((e for e in enemies if live(e) and str(e.get('id'))==str(target_id)),None)
  if not j or j['owner']!=p or j['instance']!=instance or j['expires']<=now or not m or str(target_id) in j['used']:raise ValueError('Impacto inválido ou repetido')
  kind=j['kind'];elapsed=now-j['started'];delay={'tact':.6,'gamma':1.8,'mellow':0,'kiss':0,'rain':1}[kind]
  if kind in ('gamma','kiss') and str(m.get('id'))!=str(j['target_id']):raise ValueError('Alvo incorreto')
  if kind in ('tact','rain') and distance(j['point'],m)>(128 if kind=='tact' else 256):raise ValueError('Fora da área')
  if kind=='kiss':
   d=distance(j['origin'],m)
   if d>256:raise ValueError('Projétil fora do alcance')
   delay=d/900
  if kind=='mellow':
   dx=m['x']-j['origin']['x'];dy=m['y']-j['origin']['y'];vx,vy=j['direction'];forward=dx*vx+dy*vy
   if not 0<forward<=192 or abs(-dx*vy+dy*vx)>forward/2:raise ValueError('Fora do cone')
   delay=forward/192*.8
  if elapsed+.025<delay:raise ValueError('Impacto antecipado')
  magic=kind in ('gamma','mellow','rain');absolute=kind=='gamma';power=j['special'] if magic else j['attack'];mult={'gamma':4.5,'mellow':2.5,'rain':2.5,'kiss':3.5,'tact':3.5}[kind];armor=0 if absolute else m.get('magicDefense',m.get('defense',0)) if magic else m.get('defense',0)
  if not finite(armor) or armor<0:raise ValueError('Defesa inválida')
  damage=max(1,math.floor(power*mult-armor*.3));j['used'].add(str(target_id))
  return {'target_id':target_id,'damage':damage,'ignore_all_mitigation':absolute,'stun':1.5 if kind=='kiss' else 0,'petrify':3 if kind=='mellow' else 5 if kind=='rain' else 0,'defense_break':.2 if kind in ('kiss','rain') else 0,'defense_duration':4 if kind=='kiss' else 5 if kind=='rain' else 0}
