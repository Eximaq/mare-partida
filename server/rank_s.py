"""Indexed Rank S cast/impact validation for the existing optional local service.
World simulation remains client-side; this is not authoritative multiplayer combat.
"""
import json,math,uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/rank-s-rules.json').read_text(encoding='utf-8'))
IDS={r['id']:k for k,r in RULES.items()}
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def live(m):return m and m.get('alive',True) and m.get('hp',1)>0 and not m.get('returning') and not m.get('isUntargetable') and not m.get('isInvulnerable') and all(finite(m.get(k)) for k in ('x','y'))
def dist(a,b):return math.hypot(a['x']-b['x'],a['y']-b['y'])
def point(p):return isinstance(p,dict) and all(finite(p.get(k)) for k in ('x','y'))
class RankSService:
 def __init__(self,clock):self.clock=clock;self.jobs={};self.burns={}
 def clear(self,p):self.jobs={k:j for k,j in self.jobs.items() if j['owner']!=p};self.burns={k:b for k,b in self.burns.items() if k[0]!=p}
 def cast(self,store,p,fruit,instance,x,y,enemies,key,energy,attack,ctx,direction):
  now=self.clock();ctx=ctx or {};family=IDS[fruit];rule=RULES[family];skill=next((s for s in rule['skills'] if s['key']==key),None)
  if not skill or not instance or not all(finite(v) for v in [x,y,energy,attack,ctx.get('special_attack')]) or min(energy,attack,ctx['special_attack'])<0 or ctx.get('controlled') or ctx.get('silenced'):raise ValueError('Lançamento inválido ou silenciado')
  if not isinstance(direction,(list,tuple)) or len(direction)!=2 or not all(finite(v) for v in direction) or not .99<=math.hypot(*direction)<=1.01:raise ValueError('Direção inválida')
  origin={'x':x,'y':y};target=next((m for m in enemies if live(m) and str(m.get('id'))==str(ctx.get('target_id'))),None)
  if family=='mera' and key=='1' and (not target or dist(origin,target)>320):raise ValueError('Alvo fora do alcance')
  if family=='mera' and key=='2' and not any(live(m) and dist(origin,m)<=256 for m in enemies):raise ValueError('Nenhum alvo ao alcance')
  limits={'gura':{'1':256,'2':192},'hie':{'1':320,'2':384,'3':64},'phoenix':{'1':128,'3':320}}
  if key in limits.get(family,{}) and (not target or dist(origin,target)>limits[family][key]):raise ValueError('Alvo fora do alcance')
  if store.state(p)['cooldowns'].get(fruit+':'+key,0)>now or energy<skill['cost']:raise ValueError('Recarga ou energia insuficiente')
  magic_pen=ctx.get('magic_penetration',0)
  if not finite(magic_pen) or not 0<=magic_pen<=1:raise ValueError('Penetração inválida')
  kinds={'yami':{'1':'vortex','2':'blackHole','3':'liberation'},'mera':{'1':'fireFist','2':'fireRain','3':'pillar'},'gura':{'1':'guraCrack','2':'guraSkull','3':'guraBuff'},'hie':{'1':'hieSpears','2':'hieBird','3':'hieFreeze'},'phoenix':{'1':'phoenixDash','2':'phoenixTotem','3':'phoenixEnergy'}}
  kind=kinds[family][key]
  vector=list(direction)
  if target and dist(origin,target)>0:vector=[(target['x']-x)/dist(origin,target),(target['y']-y)/dist(origin,target)]
  token='s:'+uuid.uuid4().hex;self.jobs={k:j for k,j in self.jobs.items() if j['expires']>now}
  self.jobs[token]={'owner':p,'instance':instance,'started':now,'expires':now+30,'kind':kind,'origin':origin,'direction':vector,'attack':attack,'special':ctx['special_attack'],'pen':magic_pen,'used':set(),'rain':set(),'pillar':{}}
  owned=[k for k,j in self.jobs.items() if j['owner']==p]
  for k in owned[:-32]:self.jobs.pop(k,None)
  ready=now+skill['cooldown']
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(p,fruit,key,ready))
  return {'effect':{'type':kind,'token':token,'ready_at':ready},'energy_spent':skill['cost'],'energy_remaining':energy-skill['cost']}
 def renew(self,p,instance,m,j,token,now):
  key=(p,instance,str(m['id']));b=self.burns.get(key)
  if not b or b['until']<now:b={'next':now+1,'tick':0}
  b.update({'until':now+4,'power':j['special']*.1,'token':token});self.burns[key]=b
 def impact(self,p,token,instance,enemies,target_id,event=None,context=None):
  j=self.jobs.get(token);now=self.clock();ctx=context or {};event=str(event or '');m=next((m for m in enemies if live(m) and str(m.get('id'))==str(target_id)),None)
  if not j or j['owner']!=p or j['instance']!=instance or now>j['expires'] or not m or (str(target_id),event) in j['used']:raise ValueError('Impacto inválido ou repetido')
  age=now-j['started'];kind=j['kind'];mult=0;delay=0;silence=0;slow=0;renew=False;dot=False;absolute=False;stun=0;defense_break=0;healing_break=0
  if not event.startswith('burn:') and ctx.get('effect_age') is not None:
   logical=ctx['effect_age']
   if not finite(logical) or logical<0 or logical>age+.15:raise ValueError('Frame lógico futuro ou inválido')
   age=logical
  if event.startswith('burn:'):
   b=self.burns.get((p,instance,str(target_id)));index=event[5:]
   if not index.isdigit() or not b or b['token']!=token or int(index)!=b['tick']+1 or b['next']>b['until']+.001 or now+.12<b['next'] or now>b['until']+.5:raise ValueError('Queimadura sem contato, antecipada ou repetida')
   damage=math.floor(b['power']);b['tick']+=1;b['next']+=1;dot=True
  else:
   if kind=='vortex':
    hero=ctx.get('hero',j['origin'])
    if event!='initial' or not point(hero) or dist(hero,m)>RULES['yami']['vortex']['radius']:raise ValueError('Fora do vórtice')
    delay=20/41*.6;mult=4;silence=5
   elif kind=='blackHole':
    value=event[5:] if event.startswith('hole:') else ''
    if not value.isdigit() or not 1<=int(value)<=6 or dist(j['origin'],m)>RULES['yami']['hole']['radius'] or age>6.5:raise ValueError('Tick fora da poça')
    delay=int(value);mult=2.5;slow=.8
   elif kind=='liberation':
    if event not in ('wave:0','wave:1') or dist(j['origin'],m)>RULES['yami']['liberation']['radius']:raise ValueError('Onda inválida')
    index=int(event[-1]);delay=[.083,2.158][index];mult=[4,3][index]
   elif kind=='fireFist':
    dx=m['x']-j['origin']['x'];dy=m['y']-j['origin']['y'];vx,vy=j['direction'];along=dx*vx+dy*vy
    if event!='fist' or not 0<=along<=320 or abs(dx*vy-dy*vx)>32:raise ValueError('Fora do punho')
    delay=along/900;mult=4.5;renew=True
   elif kind=='fireRain':
    value=event[5:] if event.startswith('rain:') else '';impact=ctx.get('impact_point')
    if not value.isdigit() or not 0<=int(value)<5 or value in j['rain']:raise ValueError('Projétil de chuva inválido')
    if impact is not None:
     if not point(impact) or dist(j['origin'],impact)>256 or dist(impact,m)>32:raise ValueError('Fora da queda')
    elif dist(j['origin'],m)>256:raise ValueError('Fora do alcance de chuva')
    delay=int(value)*.12+.25;mult=1.3;renew=True
   elif kind=='pillar':
    value=event[7:] if event.startswith('pillar:') else '';impact=ctx.get('impact_point')
    if not value.isdigit() or not point(impact) or age>=7 or dist(j['origin'],impact)>360*age+8 or dist(impact,m)>RULES['mera']['pillar']['radius'] or now+.035<j['pillar'].get(str(target_id),0)+1:raise ValueError('Contato de pilar inválido')
    delay=int(value)/1000;mult=4.5;renew=True
   elif kind in ('guraCrack','guraSkull'):
    dx=m['x']-j['origin']['x'];dy=m['y']-j['origin']['y'];vx,vy=j['direction']
    if event!='impact' or math.hypot(dx,dy)>(256 if kind=='guraCrack' else 192) or (kind=='guraCrack' and dx*vx+dy*vy<abs(dx*vy-dy*vx)):raise ValueError('Fora do tremor')
    delay=.35;mult=4.5;absolute=kind=='guraSkull';stun=2.5 if kind=='guraCrack' else 0;defense_break=.8 if kind=='guraSkull' else 0
   elif kind in ('hieSpears','hieBird'):
    value=event[7:] if event.startswith('impact:') else ''
    if not value.isdigit() or int(value)>=(5 if kind=='hieSpears' else 1) or dist(j['origin'],m)>(320 if kind=='hieSpears' else 384):raise ValueError('Projétil de gelo inválido')
    delay=.55;mult=4.2 if kind=='hieSpears' else 4.5;slow=.4
   elif kind=='phoenixDash':
    if event!='impact' or dist(j['origin'],m)>128:raise ValueError('Mergulho fora do alcance')
    delay=.49;mult=4;defense_break=.5;healing_break=.8
   elif kind=='phoenixEnergy':
    value=event[7:] if event.startswith('energy:') else ''
    if not value.isdigit() or not 1<=int(value)<=5 or dist(j['origin'],m)>320:raise ValueError('Energia fora do alcance')
    delay=int(value)*1.2/5;mult=1.1;healing_break=.8 if int(value)==5 else 0
   else:raise ValueError('Efeito desconhecido')
   if age+.06<delay:raise ValueError('Impacto antecipado')
   armor=0 if absolute else m.get('defense',0) if kind.startswith('gura') else m.get('magicDefense',m.get('defense',0))
   if not finite(armor) or armor<0:raise ValueError('Defesa inválida')
   damage=max(1,math.floor((j['attack'] if kind.startswith('gura') else j['special'])*mult-armor*(1-j['pen'])*.3))
   if kind=='fireRain':j['rain'].add(event[5:])
   if kind=='pillar':j['pillar'][str(target_id)]=now
   if renew:self.renew(p,instance,m,j,token,now)
  j['used'].add((str(target_id),event))
  return {'damage':damage,'target_id':target_id,'event':event,'dot':dot,'silence':silence,'slow':slow,'stun':stun,'defense_break':defense_break,'healing_break':healing_break,'ignore_all_mitigation':absolute}
