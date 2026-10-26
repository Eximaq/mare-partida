"""Jiki charge/launch/impact contracts for the local client-simulated world."""
import json,math,uuid
from pathlib import Path
RULES=json.loads((Path(__file__).resolve().parents[1]/'assets/akuma/jiki/rules.json').read_text(encoding='utf8'));JIKI=RULES['id']
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def values(seconds):
 n=min(6,max(1,math.floor(max(0,seconds)+1e-6)));return {'seconds':n,'multiplier':2+(n-1)*.5,'scale':min(1.5,1+(n-1)*.3)}
class JikiService:
 def __init__(self,clock):self.clock=clock;self.charges={};self.shots={}
 def clear(self,player):
  self.charges.pop(player,None);self.shots={k:v for k,v in self.shots.items() if v['owner']!=player}
 def cancel_charge(self,player):
  self.charges.pop(player,None);return {'cancelled':True}
 def state(self,player):
  self.shots={k:v for k,v in self.shots.items() if v['expires']>self.clock()}
  c=self.charges.get(player)
  if c and self.clock()-c['started']>8:self.charges.pop(player,None);c=None
  return {'charging':bool(c),'started':c['started'] if c else None}
 def shot(self,player,instance,x,y,kind,attack,penetration,point,target_id=None,multiplier=2.5,scale=1):
  token=uuid.uuid4().hex;self.shots[token]={'owner':player,'instance':instance,'x':x,'y':y,'kind':kind,'attack':attack,'penetration':penetration,'target_id':target_id,'point':point,'multiplier':multiplier,'scale':scale,'started':self.clock(),'expires':self.clock()+3.5};return {'token':token,'multiplier':multiplier,'scale':scale}
 def cast(self,store,player,instance,x,y,enemies,key,energy,attack,ctx):
  if key not in ['1','2'] or not instance or not all(finite(v) for v in [x,y,energy,attack,ctx.get('penetration',0)]) or min(energy,attack)<0 or not 0<=ctx.get('penetration',0)<=.6 or ctx.get('controlled'):raise ValueError('Habilidade ou atributos inválidos')
  self.state(player);now=self.clock();skill=RULES['skills'][int(key)-1];state=store.state(player)
  if energy<skill['cost'] or state['cooldowns'].get(JIKI+':'+key,0)>now or key=='1' and player in self.charges:raise ValueError('Recarga, energia insuficiente ou carga ativa')
  if key=='1':
   token=uuid.uuid4().hex;self.charges[player]={'token':token,'instance':instance,'started':now,'attack':attack,'penetration':ctx.get('penetration',0)};effect={'type':'jiki_charge','token':token,'started':now}
  else:
   target=next((e for e in enemies if str(e.get('id'))==str(ctx.get('target_id')) and e.get('alive',True) and e.get('hp',1)>0),None)
   if not target or not all(finite(target.get(k)) for k in ['x','y']) or math.hypot(target['x']-x,target['y']-y)>RULES['range']:raise ValueError('Alvo fora de alcance')
   effect={'type':'jiki_rocket',**self.shot(player,instance,x,y,'rocket',attack,ctx.get('penetration',0),{'x':target['x'],'y':target['y']},target['id'])}
  ready=now+skill['cooldown']
  with store.db:store.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player,JIKI,key,ready))
  return {'effect':{**effect,'ready_at':ready},'energy_spent':skill['cost']}
 def release(self,player,token,instance,x,y,point,controlled=False):
  self.state(player);c=self.charges.get(player)
  if not c or c['token']!=token or c['instance']!=instance or controlled or not all(finite(v) for v in [x,y,point.get('x'),point.get('y')]) or math.hypot(point['x']-x,point['y']-y)>RULES['range']+1e-6:raise ValueError('Carga ou ponto de lançamento inválido')
  v=values(self.clock()-c['started']);result=self.shot(player,instance,x,y,'mass',c['attack'],c['penetration'],point,multiplier=v['multiplier'],scale=v['scale']);self.charges.pop(player);return {'effect':{**result,**v},'energy_spent':0}
 def impact(self,player,token,instance,x,y,enemies,hit=True):
  p=self.shots.get(token);now=self.clock()
  if not p or p['owner']!=player or p['instance']!=instance or p['expires']<=now or not all(finite(v) for v in [x,y]) or math.hypot(x-p['x'],y-p['y'])>RULES['range']+1e-6:raise ValueError('Impacto inválido, repetido ou fora de alcance')
  speed=RULES['massSpeed'] if p['kind']=='mass' else RULES['rocketSpeed'];d=math.hypot(x-p['x'],y-p['y'])
  if now-p['started']+0.025<max(0,d-RULES['hitRadius'])/speed:raise ValueError('Impacto antecipado')
  live=[e for e in enemies if e.get('alive',True) and e.get('hp',1)>0 and all(finite(e.get(k)) for k in ['x','y'])]
  targets=[] if not hit else [e for e in live if math.hypot(e['x']-x,e['y']-y)<=RULES['radius']] if p['kind']=='mass' else [e for e in live if str(e.get('id'))==str(p['target_id']) and math.hypot(e['x']-x,e['y']-y)<=RULES['hitRadius']+2][:1]
  if any(not finite(e.get('defense',0)) or e.get('defense',0)<0 for e in targets):raise ValueError('Defesa inválida')
  self.shots.pop(token);return {'hits':[{'id':e['id'],'damage':max(1,math.floor(p['attack']*p['multiplier']-e.get('defense',0)*(1-p['penetration'])*.3))} for e in targets]}
